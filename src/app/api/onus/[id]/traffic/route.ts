import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { executeOltCommand, OltCredentials, normalizePonPort } from '@/lib/oltConnection';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const onu = await prisma.oNUConfigured.findUnique({
      where: { id: parseInt(id) },
      include: { olt: true }
    });

    if (!onu || !onu.olt) {
      return NextResponse.json({ success: false, error: 'ONU or OLT not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('history');

    // History mode: return recorded TrafficHistory samples (worker records every 5 min)
    if (range) {
      const hours = parseInt(range.replace('h', '')) || 24;
      const since = new Date(Date.now() - hours * 3600 * 1000);
      const history = await prisma.trafficHistory.findMany({
        where: { onu_id: onu.id, createdAt: { gte: since } },
        orderBy: { createdAt: 'asc' }
      });
      return NextResponse.json({
        success: true,
        history: history.map((h) => ({
          time: h.createdAt.toISOString(),
          rx: h.rx,
          tx: h.tx
        }))
      });
    }

    const creds: OltCredentials = {
      ip: onu.olt.ip_address,
      port: onu.olt.telnet_port || 23,
      username: onu.olt.telnet_user || '',
      password: onu.olt.telnet_pass || '',
      protocol: (onu.olt.protocol?.toLowerCase() as 'ssh' | 'telnet') || 'telnet',
      vendor: (onu.olt.manufacturer?.toLowerCase() as 'zte' | 'huawei') || 'zte'
    };

    let rx = 0;
    let tx = 0;
    let rxPps = 0;
    let txPps = 0;

    if (creds.vendor === 'zte') {
      try {
        const portName = `${normalizePonPort(onu.pon_port || '')}:${onu.onu_id}`;
        const output = await executeOltCommand(creds, `show interface ${portName}`);

        // Output format:
        // Input rate :               8019 Bps               31 pps
        // Output rate:              55809 Bps               58 pps
        const inputMatch = output.match(/Input rate\s*:\s*(\d+)\s+Bps\s+(\d+)\s+pps/i);
        const outputMatch = output.match(/Output rate\s*:\s*(\d+)\s+Bps\s+(\d+)\s+pps/i);

        // Convert Bps to Mbps (Bps * 8 / 1000000)
        if (inputMatch) rx = parseFloat((parseInt(inputMatch[1]) * 8 / 1000000).toFixed(2));
        if (outputMatch) tx = parseFloat((parseInt(outputMatch[1]) * 8 / 1000000).toFixed(2));
        if (inputMatch) rxPps = parseInt(inputMatch[2]);
        if (outputMatch) txPps = parseInt(outputMatch[2]);
      } catch (e) {
        console.error("Failed to fetch traffic", e);
      }
    }

    return NextResponse.json({ success: true, rx, tx, rxPps, txPps });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}