import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getOltPonPorts, OltCredentials } from '@/lib/oltConnection';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    
    const olt = await prisma.oLTDevice.findUnique({
      where: { id: id }
    });

    if (!olt) {
      return NextResponse.json({ error: 'OLT not found' }, { status: 404 });
    }

    const creds: OltCredentials = {
      ip: olt.ip_address,
      port: olt.telnet_port,
      username: olt.telnet_user || undefined,
      password: olt.telnet_pass || undefined,
      protocol: (olt.protocol as any) || 'telnet',
      vendor: (olt.vendor as any) || 'zte'
    };

    // Fetch real ONU signals from the database for this OLT
    const onus = await prisma.oNUConfigured.findMany({
      where: { olt_id: id },
      select: { pon_port: true, signal: true }
    });
    
    // Also fetch unconfigured ONUs to ensure their ports are in the dropdown
    const unconfiguredOnus = await prisma.oNUUnconfigured.findMany({
      where: { olt_id: id },
      select: { pon_port: true }
    });
    
    // Calculate averages per port and find unique ports
    const avgSignals: Record<string, { sum: number, count: number }> = {};
    const uniquePorts = new Set<string>();
    const uniqueSlots = new Set<string>();

    for (const onu of onus) {
       if (onu.pon_port) {
          const normalizedPort = onu.pon_port.replace('gpon-olt_', 'gpon_olt-');
          uniquePorts.add(normalizedPort);
          
          const match = normalizedPort.match(/(\d+\/\d+)\/\d+/);
          if (match) uniqueSlots.add(match[1]);

          if (onu.signal !== null) {
            if (!avgSignals[normalizedPort]) avgSignals[normalizedPort] = { sum: 0, count: 0 };
            avgSignals[normalizedPort].sum += onu.signal;
            avgSignals[normalizedPort].count++;
          }
       }
    }

    for (const onu of unconfiguredOnus) {
       if (onu.pon_port) {
          const normalizedPort = onu.pon_port.replace('gpon-olt_', 'gpon_olt-');
          uniquePorts.add(normalizedPort);
          
          const match = normalizedPort.match(/(\d+\/\d+)\/\d+/);
          if (match) uniqueSlots.add(match[1]);
       }
    }

    // Auto-fill all 16 ports for any active slot
    for (const slot of uniqueSlots) {
        for (let i = 1; i <= 16; i++) {
            uniquePorts.add(`gpon_olt-${slot}/${i}`);
        }
    }

    const enrichedPorts = Array.from(uniquePorts).map(portName => {
       const avgData = avgSignals[portName];
       
       let displayName = portName;
       const match = portName.match(/(\d+)\/(\d+)\/(\d+)/);
       if (match) {
           displayName = `GPON ${match[2]}/${match[3]}`;
       } else {
           displayName = portName.replace('gpon_olt-', 'GPON ').replace('gpon-olt_', 'GPON ');
       }

       return {
         name: displayName,
         value: match ? match[0] : portName,
         status: 'Online',
         averageSignal: avgData && avgData.count > 0 ? (avgData.sum / avgData.count).toFixed(2) : null
       };
    });

    // Sort ports naturally
    enrichedPorts.sort((a, b) => {
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });

    return NextResponse.json(enrichedPorts);
  } catch (error: any) {
    console.error("API Error fetching OLT PON ports:", error);
    return NextResponse.json({ error: error.message || 'Failed to fetch PON ports' }, { status: 500 });
  }
}
