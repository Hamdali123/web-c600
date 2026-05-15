import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getVlans } from '@/lib/oltConnection';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const oltId = parseInt(id);

    const olt = await prisma.oLTDevice.findUnique({
      where: { id: oltId }
    });

    if (!olt) return NextResponse.json({ error: 'OLT not found' }, { status: 404 });

    const vlans = await getVlans({
      ip: olt.ip_address,
      port: olt.telnet_port,
      username: olt.telnet_user || '',
      password: olt.telnet_pass || '',
      protocol: (olt.protocol as any) || 'telnet',
      vendor: (olt.vendor as any) || 'zte'
    });

    return NextResponse.json(vlans);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
