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

    const ports = await getOltPonPorts(creds);
    return NextResponse.json(ports);
  } catch (error: any) {
    console.error("API Error fetching OLT PON ports:", error);
    return NextResponse.json({ error: error.message || 'Failed to fetch PON ports' }, { status: 500 });
  }
}
