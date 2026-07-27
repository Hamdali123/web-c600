import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const oltIdStr = searchParams.get('oltId');
    const category = searchParams.get('category') || 'OLT';

    const whereClause: any = {};
    const port = searchParams.get('port');
    const zoneIdStr = searchParams.get('zone_id');
    const odbIdStr = searchParams.get('odb_id');
    if (oltIdStr && oltIdStr !== 'Any') {
      whereClause.olt_id = parseInt(oltIdStr);
    }
    if (port && port !== 'Any') {
      whereClause.pon_port = `gpon-olt_${port}`;
    }
    if (zoneIdStr && zoneIdStr !== 'Any') {
      whereClause.zone_id = parseInt(zoneIdStr);
    }
    if (odbIdStr && odbIdStr !== 'Any') {
      whereClause.odb_id = parseInt(odbIdStr);
    }

    // Time points (last 12 hours) for Traffic
    const hours = ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
    const currentHour = new Date().getHours();
    const rotatedHours = [...hours.slice((currentHour / 2) + 1), ...hours.slice(0, (currentHour / 2) + 1)];

    let chartData: any[] = [];
    let summary: any = { totalOnus: 0 };

    if (category === 'OLT') {
      // Simulate OLT metrics
      const tempData = rotatedHours.map((time, idx) => {
        const factor = Math.sin((idx / rotatedHours.length) * Math.PI * 2);
        return { time, value: Math.round(48 + factor * 4 + Math.random() * 1.5) };
      });
      const cpu1Data = rotatedHours.map((time, idx) => {
        const factor = Math.sin((idx / rotatedHours.length) * Math.PI * 2);
        return { time, value: Math.round(18 + factor * 3 + Math.random() * 2) };
      });
      const cpu2Data = rotatedHours.map((time, idx) => {
        const factor = Math.sin((idx / rotatedHours.length) * Math.PI * 2);
        return { time, value: Math.round(14 + factor * 2 + Math.random() * 1.5) };
      });

      chartData = [
        { id: 'olt_temp', title: 'C600-SANWANI', subtitle: 'Daily OLT environment temperature', type: 'line', dataKey: 'value', color: '#188ae2', unit: '°C', data: tempData },
        { id: 'olt_cpu1', title: 'C600-SANWANI', subtitle: 'GFGN card in slot 2 daily CPU usage', type: 'line', dataKey: 'value', color: '#188ae2', unit: '%', data: cpu1Data },
        { id: 'olt_cpu2', title: 'C600-SANWANI', subtitle: 'SFUB card in slot 10 daily CPU usage', type: 'line', dataKey: 'value', color: '#188ae2', unit: '%', data: cpu2Data },
      ];
    } else if (category === 'Traffic' || category === 'Signal') {
      // Fetch ONUs for grid rendering
      const onus = await prisma.oNUConfigured.findMany({
        where: whereClause,
        include: { olt: true },
        take: 50, // Limit to 50 to prevent browser lag
        orderBy: { name: 'asc' }
      });

      summary.totalOnus = onus.length;

      chartData = onus.map(onu => {
        const title = `${onu.olt?.name || 'OLT'}: ${onu.name}`;
        const formattedPort = onu.pon_port ? onu.pon_port.replace('gpon-olt_', 'gpon_onu-') : '';
        
        if (category === 'Traffic') {
          const subtitle = `${formattedPort}:${onu.onu_id} daily traffic`;
          const tx = onu.last_tx_traffic || (Math.random() * 0.5);
          const rx = onu.last_rx_traffic || (Math.random() * 2.0);
          
          const data = rotatedHours.map((time, idx) => {
            const factor = Math.sin(((idx - 4) / rotatedHours.length) * Math.PI * 2);
            const ratio = 0.6 + factor * 0.4;
            return {
              time,
              upload: Math.round(tx * ratio * (0.8 + Math.random() * 0.4) * 100) / 100,
              download: Math.round(rx * ratio * (0.8 + Math.random() * 0.4) * 100) / 100
            };
          });
          return { id: onu.id, title, subtitle, type: 'Traffic', data };
        } else {
          // Signal
          const subtitle = `${formattedPort}:${onu.onu_id} weekly signal`;
          const currentSignal = onu.signal || -25;
          const days = ['19 Jul', '20 Jul', '21 Jul', '22 Jul', '23 Jul', '24 Jul', '25 Jul'];
          const data = days.map((day, idx) => {
            // Slight fluctuation
            const sig = currentSignal + (Math.random() * 1.5 - 0.7);
            return { time: day, signal: Math.round(sig * 100) / 100 };
          });
          data[data.length - 1].signal = currentSignal; // exact today
          
          return { id: onu.id, title, subtitle, type: 'Signal', data };
        }
      });
    } else if (category === 'Uplink') {
      // Simulate 4 Uplink ports
      chartData = [1, 2, 3, 4].map(portNum => {
        const title = `C600-SANWANI - xgei_1/10/${portNum} traffic`;
        const subtitle = `xgei_1/10/${portNum} daily traffic`;
        const tx = Math.random() * 50 + 10;
        const rx = Math.random() * 200 + 50;
        
        const data = rotatedHours.map((time, idx) => {
          const factor = Math.sin(((idx - 4) / rotatedHours.length) * Math.PI * 2);
          const ratio = 0.6 + factor * 0.4;
          return {
            time,
            upload: Math.round(tx * ratio * (0.8 + Math.random() * 0.4) * 100) / 100,
            download: Math.round(rx * ratio * (0.8 + Math.random() * 0.4) * 100) / 100
          };
        });
        return { id: `uplink_${portNum}`, title, subtitle, type: 'Traffic', data };
      });
    } else if (category === 'PON') {
      // Simulate 16 PON ports
      chartData = Array.from({ length: 16 }, (_, i) => i + 1).map(portNum => {
        const title = `C600-SANWANI - gpon 2/${portNum}`;
        const subtitle = `olt_1/2/${portNum} daily traffic`;
        const tx = Math.random() * 20 + 5;
        const rx = Math.random() * 60 + 10;
        
        const data = rotatedHours.map((time, idx) => {
          const factor = Math.sin(((idx - 4) / rotatedHours.length) * Math.PI * 2);
          const ratio = 0.6 + factor * 0.4;
          return {
            time,
            upload: Math.round(tx * ratio * (0.8 + Math.random() * 0.4) * 100) / 100,
            download: Math.round(rx * ratio * (0.8 + Math.random() * 0.4) * 100) / 100
          };
        });
        return { id: `pon_${portNum}`, title, subtitle, type: 'Traffic', data };
      });
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
