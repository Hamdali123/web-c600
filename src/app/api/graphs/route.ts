import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { executeOltCommand, normalizePonPort } from '@/lib/oltConnection';

function fmtTime(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function fmtShort(d: Date): string {
  return `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })}`;
}

function downsample<T>(items: T[], maxPoints: number, pick: (item: T) => any): any[] {
  if (items.length === 0) return [];
  if (items.length <= maxPoints) return items.map(pick);
  const step = items.length / maxPoints;
  const out: any[] = [];
  for (let i = 0; i < maxPoints; i++) {
    out.push(pick(items[Math.min(items.length - 1, Math.floor(i * step))]));
  }
  return out;
}

function parseTrafficRates(output: string): { tx: number; rx: number } {
  let rx = 0;
  let tx = 0;
  const inMatch = output.match(/Input rate\s*:\s*(\d+)\s+Bps/i) || output.match(/input\s*:\s*(\d+)\s+Bps/i);
  const outMatch = output.match(/Output rate\s*:\s*(\d+)\s+Bps/i) || output.match(/output\s*:\s*(\d+)\s+Bps/i);
  if (inMatch) rx = Math.round(parseInt(inMatch[1]) * 8 / 1e6 * 1000) / 1000;
  if (outMatch) tx = Math.round(parseInt(outMatch[1]) * 8 / 1e6 * 1000) / 1000;
  return { tx, rx };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const oltIdStr = searchParams.get('oltId');
    const category = searchParams.get('category') || 'OLT';

    const whereClause: any = {};
    const port = searchParams.get('port');
    const board = searchParams.get('board');
    const zoneIdStr = searchParams.get('zone_id');
    const odbIdStr = searchParams.get('odb_id');
    if (oltIdStr && oltIdStr !== 'Any') {
      whereClause.olt_id = parseInt(oltIdStr);
    }
    if (port && port !== 'Any') {
      whereClause.pon_port = { in: [`gpon-olt_${port}`, `gpon_olt-${port}`] };
    }
    if (board && board !== 'Any') {
      whereClause.pon_port = { contains: `/${board}/` };
    }
    if (zoneIdStr && zoneIdStr !== 'Any') {
      whereClause.zone_id = parseInt(zoneIdStr);
    }
    if (odbIdStr && odbIdStr !== 'Any') {
      whereClause.odb_id = parseInt(odbIdStr);
    }

    let chartData: any[] = [];
    let summary: any = { totalOnus: 0, error: null };

    let oltName = 'OLT';
    let creds: any = null;
    const oltDb = await prisma.oLTDevice.findFirst({
      where: oltIdStr && oltIdStr !== 'Any' ? { id: parseInt(oltIdStr) } : undefined
    });
    if (oltDb) {
      oltName = oltDb.name;
      creds = {
        ip: oltDb.ip_address,
        port: oltDb.telnet_port || 23,
        username: oltDb.telnet_user || '',
        password: oltDb.telnet_pass || '',
        protocol: (oltDb.protocol?.toLowerCase() as 'ssh' | 'telnet') || 'telnet',
        vendor: (oltDb.vendor?.toLowerCase() as 'zte' | 'huawei') || 'zte'
      };
    }

    const since24h = new Date(Date.now() - 24 * 3600 * 1000);
    const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000);

    if (category === 'OLT') {
      let currentTemp: number | null = null;
      const cardCpus: any[] = [];

      if (creds) {
        try {
          const tempOut = await executeOltCommand(creds, 'show temperature detail');
          const tempMatch = tempOut.match(/^GFGN\s+\d+\s+\d+\s+cpu\s+\S+\s+\d+\s+\d+\s+\d+\s+\d+\s+(\d+)/im);
          if (tempMatch) currentTemp = parseInt(tempMatch[1]);
        } catch (e) {
          console.error('Temp fetch error', e);
        }

        try {
          const processorOut = await executeOltCommand(creds, 'show processor');
          const lines = processorOut.split('\n');
          for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            const cardName = parts[0];
            if (!cardName || !/^(PFU|MPU|SFU)/i.test(cardName)) continue;
            const cpu1m = parts[3];
            if (!cpu1m || !cpu1m.includes('%')) continue;
            let subtitle = `${cardName} CPU usage`;
            if (cardName.includes('1/2/')) subtitle = 'GFGN card in slot 2 (PON) CPU usage';
            else if (cardName.includes('1/10/')) subtitle = 'SFUB card in slot 10 (MPU Master) CPU usage';
            else if (cardName.includes('1/11/')) subtitle = 'SFUB card in slot 11 (MPU Slave) CPU usage';
            cardCpus.push({
              id: `olt_cpu_${cardName}`,
              title: oltName,
              subtitle,
              val: parseInt(cpu1m.replace('%', ''))
            });
          }
        } catch (e) {
          console.error('CPU fetch error', e);
        }
      }

      if (currentTemp !== null) {
        chartData.push({
          id: 'olt_temp', title: oltName, subtitle: 'Current OLT environment temperature (°C)',
          type: 'line', dataKey: 'value', color: '#e74c3c', unit: '°C',
          data: [{ time: 'now', value: currentTemp }]
        });
      }
      for (const card of cardCpus) {
        chartData.push({
          id: card.id, title: card.title, subtitle: card.subtitle,
          type: 'line', dataKey: 'value', color: '#188ae2', unit: '%',
          data: [{ time: 'now', value: card.val }]
        });
      }
      if (chartData.length === 0) {
        summary.error = `Could not fetch OLT metrics${creds ? '' : ' (no OLT selected)'}.`;
      }

    } else if (category === 'Traffic' || category === 'Signal') {
      const onus = await prisma.oNUConfigured.findMany({
        where: whereClause,
        include: { olt: true },
        take: 20,
        orderBy: { name: 'asc' }
      });

      summary.totalOnus = onus.length;

      if (category === 'Traffic') {
        const historyRows = await prisma.trafficHistory.findMany({
          where: { onu_id: { in: onus.map(o => o.id) }, createdAt: { gte: since24h } },
          orderBy: { createdAt: 'asc' },
          select: { onu_id: true, tx: true, rx: true, createdAt: true }
        });
        const historyByOnu = new Map<number, any[]>();
        for (const row of historyRows) {
          const arr = historyByOnu.get(row.onu_id) || [];
          arr.push(row);
          historyByOnu.set(row.onu_id, arr);
        }

        for (const onu of onus) {
          const clientName = onu.name || 'ONU';
          const title = `${onu.olt?.name || oltName}: ${clientName}`;
          const formattedPort = onu.pon_port ? normalizePonPort(onu.pon_port) : '';
          const portLabel = `${formattedPort}:${onu.onu_id}`;

          let data: any[] = (historyByOnu.get(onu.id) || []).map(h => ({
            time: fmtTime(h.createdAt),
            upload: h.tx,
            download: h.rx
          }));
          if (data.length === 0 && creds && onu.pon_port) {
            const ponBase = normalizePonPort(onu.pon_port);
            const onuIface = `${ponBase}:${onu.onu_id}`;
            try {
              const out = await executeOltCommand(creds, `show interface ${onuIface}`);
              const { tx, rx } = parseTrafficRates(out);
              data = [{ time: 'now', upload: tx, download: rx }];
            } catch (e) {}
          }
          data = downsample(data, 24, d => d);

          chartData.push({
            id: onu.id, title, subtitle: `${portLabel} 24h traffic (Mbps)`,
            type: 'Traffic', data,
            labelUp: 'Upload', labelDown: 'Download'
          });
        }
      } else {
        // Signal - real history from SignalHistory table
        const historyRows = await prisma.signalHistory.findMany({
          where: { onu_id: { in: onus.map(o => o.id) }, createdAt: { gte: since7d } },
          orderBy: { createdAt: 'asc' },
          select: { onu_id: true, signal: true, createdAt: true }
        });
        const historyByOnu = new Map<number, any[]>();
        for (const row of historyRows) {
          const arr = historyByOnu.get(row.onu_id) || [];
          arr.push(row);
          historyByOnu.set(row.onu_id, arr);
        }

        for (const onu of onus) {
          const clientName = onu.name || 'ONU';
          const title = `${onu.olt?.name || oltName}: ${clientName}`;
          const formattedPort = onu.pon_port ? normalizePonPort(onu.pon_port) : '';
          const portLabel = `${formattedPort}:${onu.onu_id}`;

          const history = historyByOnu.get(onu.id) || [];
          const data = downsample(history, 14, h => ({
            time: fmtShort(h.createdAt),
            signal: h.signal
          }));
          const liveSignal = typeof onu.signal === 'number' ? onu.signal : null;
          if (data.length > 0 && liveSignal !== null) {
            data[data.length - 1].signal = liveSignal;
          } else if (data.length === 0 && liveSignal !== null) {
            data.push({ time: 'now', signal: liveSignal });
          }

          chartData.push({
            id: onu.id, title, subtitle: `${portLabel} 7-day signal (dBm)`,
            type: 'Signal', data
          });
        }
      }
    } else if (category === 'Uplink') {
      let ports: string[] = [];
      if (creds) {
        try {
          const brief = await executeOltCommand(creds, 'show interface brief');
          for (const line of brief.split('\n')) {
            const m = line.trim().match(/^(xgei-\S+|gei-\S+)/i);
            if (m) ports.push(m[1]);
          }
        } catch (e) {}
      }
      if (ports.length === 0) {
        const distinct = await prisma.portTrafficHistory.findMany({
          where: { olt_id: parseInt(oltIdStr || '0'), port_name: { startsWith: 'xgei' } },
          select: { port_name: true },
          distinct: ['port_name']
        });
        ports = distinct.map(d => d.port_name);
      }
      ports = Array.from(new Set(ports));

      const oltIdNum = oltIdStr && oltIdStr !== 'Any' ? parseInt(oltIdStr) : null;
      const historyRows = await prisma.portTrafficHistory.findMany({
        where: {
          ...(oltIdNum ? { olt_id: oltIdNum } : {}),
          port_name: { in: ports },
          createdAt: { gte: since24h }
        },
        orderBy: { createdAt: 'asc' },
        select: { port_name: true, tx: true, rx: true, createdAt: true }
      });
      const historyByPort = new Map<string, any[]>();
      for (const row of historyRows) {
        const arr = historyByPort.get(row.port_name) || [];
        arr.push(row);
        historyByPort.set(row.port_name, arr);
      }

      for (const portName of ports) {
        let data: any[] = (historyByPort.get(portName) || []).map(h => ({
          time: fmtTime(h.createdAt),
          upload: h.tx,
          download: h.rx
        }));
        if (data.length === 0 && creds) {
          try {
            const out = await executeOltCommand(creds, `show interface ${portName}`);
            const { tx, rx } = parseTrafficRates(out);
            data = [{ time: 'now', upload: tx, download: rx }];
          } catch (e) {}
        }
        data = downsample(data, 24, d => d);

        chartData.push({
          id: `uplink_${portName}`,
          title: `${oltName} - ${portName}`,
          subtitle: `${portName} 24h traffic (Mbps)`,
          type: 'Traffic', data,
          labelUp: 'In (Mbps)', labelDown: 'Out (Mbps)'
        });
      }
    } else if (category === 'PON') {
      const ponWhere: any = {};
      const oltIdNum = oltIdStr && oltIdStr !== 'Any' ? parseInt(oltIdStr) : null;
      if (oltIdNum && !isNaN(oltIdNum)) ponWhere.olt_id = oltIdNum;
      if (board && board !== 'Any') ponWhere.pon_port = { contains: `/${board}/` };
      if (port && port !== 'Any') ponWhere.pon_port = { in: [`gpon-olt_${port}`, `gpon_olt-${port}`] };
      if (zoneIdStr && zoneIdStr !== 'Any') ponWhere.zone_id = parseInt(zoneIdStr);
      if (odbIdStr && odbIdStr !== 'Any') ponWhere.odb_id = parseInt(odbIdStr);
      const onus = await prisma.oNUConfigured.findMany({ where: ponWhere, select: { pon_port: true } });
      let ports = Array.from(new Set(onus.map(o => o.pon_port).filter(Boolean))) as string[];
      ports = ports.map(p => p.replace('gpon-olt_', 'gpon_olt-').replace('gpon_olt_', 'gpon_olt-')).sort();

      const historyRows = await prisma.portTrafficHistory.findMany({
        where: {
          ...(oltIdNum ? { olt_id: oltIdNum } : {}),
          port_name: { in: ports },
          createdAt: { gte: since24h }
        },
        orderBy: { createdAt: 'asc' },
        select: { port_name: true, tx: true, rx: true, createdAt: true }
      });
      const historyByPort = new Map<string, any[]>();
      for (const row of historyRows) {
        const arr = historyByPort.get(row.port_name) || [];
        arr.push(row);
        historyByPort.set(row.port_name, arr);
      }

      for (const portName of ports) {
        let data: any[] = (historyByPort.get(portName) || []).map(h => ({
          time: fmtTime(h.createdAt),
          upload: h.tx,
          download: h.rx
        }));
        if (data.length === 0 && creds) {
          try {
            const out = await executeOltCommand(creds, `show interface ${portName}`);
            const { tx, rx } = parseTrafficRates(out);
            data = [{ time: 'now', upload: tx, download: rx }];
          } catch (e) {}
        }
        data = downsample(data, 24, d => d);

        chartData.push({
          id: `pon_${portName}`,
          title: `${oltName} - ${portName}`,
          subtitle: `${portName} 24h traffic (Mbps)`,
          type: 'Traffic', data,
          labelUp: 'In (Mbps)', labelDown: 'Out (Mbps)'
        });
      }
    }

    return NextResponse.json({
      success: true,
      category,
      chartData,
      summary
    });

  } catch (error: any) {
    console.error("Graphs API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}