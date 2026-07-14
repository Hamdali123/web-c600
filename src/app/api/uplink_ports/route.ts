import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getOltUplinkPorts } from '@/lib/oltConnection';

export async function GET() {
  try {
    const olts = await prisma.oLTDevice.findMany({
      where: { /* add active field if needed, else fetch all */ },
    });

    const results = [];

    for (const olt of olts) {
      try {
        const creds = {
          ip: olt.ip_address,
          host: olt.ip_address,
          port: olt.telnet_port || 23,
          username: olt.telnet_user || '',
          password: olt.telnet_pass || '',
          vendor: olt.vendor?.toLowerCase() || 'zte',
          protocol: (olt.protocol === 'ssh' ? 'ssh' : 'telnet') as 'telnet' | 'ssh'
        };

        const ports = await getOltUplinkPorts(creds);
        
        // Add OLT metadata to each port
        const portsWithOlt = ports.map(port => ({
          ...port,
          olt_id: olt.id,
          olt_name: olt.name,
          olt_ip: olt.ip_address
        }));

        results.push(...portsWithOlt);
      } catch (err: any) {
        console.error(`Failed to fetch uplinks for OLT ${olt.ip_address}:`, err.message);
        // We push an error object or just skip. We'll skip for now but could return errors.
      }
    }

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Error fetching uplink ports:', error);
    return NextResponse.json({ error: 'Failed to fetch uplink ports' }, { status: 500 });
  }
}
