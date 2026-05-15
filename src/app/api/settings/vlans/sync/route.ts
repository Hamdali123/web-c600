import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getVlans } from '@/lib/oltConnection';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const oltId = searchParams.get('oltId');
    if (!oltId) return NextResponse.json({ error: 'OLT ID required' }, { status: 400 });

    const olt = await prisma.oLTDevice.findUnique({
      where: { id: parseInt(oltId) }
    });

    if (!olt) return NextResponse.json({ error: 'OLT not found' }, { status: 404 });

    const realVlans = await getVlans({
      ip: olt.ip_address,
      port: olt.telnet_port,
      username: olt.telnet_user || '',
      password: olt.telnet_pass || '',
      protocol: (olt.protocol as any) || 'telnet',
      vendor: (olt.vendor as any) || 'zte'
    });

    let count = 0;
    for (const v of realVlans) {
      const exists = await prisma.vLAN.findFirst({
        where: { vlan_id: v.id, olt_id: olt.id }
      });
      if (!exists) {
        await prisma.vLAN.create({
          data: {
            vlan_id: v.id,
            description: v.desc,
            olt_id: olt.id
          }
        });
        count++;
      }
    }

    return NextResponse.json({ success: true, count });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
