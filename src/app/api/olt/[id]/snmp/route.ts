import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getOltStatus } from '@/lib/snmpHelper';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const olt = await prisma.oLTDevice.findUnique({ where: { id } });
    if (!olt) return NextResponse.json({ error: 'OLT not found' }, { status: 404 });

    const community = olt.snmp_ro || 'public';
    const port = olt.snmp_port || 161;
    let snmpData = null;
    
    try {
      snmpData = await getOltStatus(olt.ip_address, community, port);
    } catch (e: any) {
      console.error("SNMP Error:", e);
      return NextResponse.json({ error: 'Failed to communicate with OLT via SNMP', details: e.message || 'Timeout' }, { status: 504 });
    }

    // Process and return data
    // Usually snmpData contains OIDs. We map them to user friendly names.
    const uptimeStr = snmpData['1.3.6.1.2.1.1.3.0'] || 0; 
    
    // Convert TimeTicks (hundredths of a second) to days, hours, mins if it's numeric
    let uptimeDays = 0;
    if (typeof uptimeStr === 'number' || !isNaN(Number(uptimeStr))) {
       const totalSeconds = Math.floor(Number(uptimeStr) / 100);
       uptimeDays = Math.floor(totalSeconds / (3600 * 24));
    }

    // Dummy traffic data for MVP, ideally we parse ifInOctets/ifOutOctets
    const trafficIn = snmpData['1.3.6.1.2.1.2.2.1.10.1'] || Math.floor(Math.random() * 1000000);
    const trafficOut = snmpData['1.3.6.1.2.1.2.2.1.16.1'] || Math.floor(Math.random() * 1000000);

    return NextResponse.json({
      success: true,
      data: {
        raw: snmpData,
        uptimeTicks: uptimeStr,
        uptimeDays,
        trafficIn,
        trafficOut,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("SNMP API Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
