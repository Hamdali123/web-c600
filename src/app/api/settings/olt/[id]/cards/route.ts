import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { getOltCards, OltCredentials } from '@/lib/oltConnection';

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
      username: olt.telnet_user || '',
      password: olt.telnet_pass || '',
      protocol: (olt.protocol as 'telnet' | 'ssh') || 'telnet',
      vendor: (olt.vendor as 'zte' | 'huawei') || 'zte'
    };

    const cards = await getOltCards(creds);
    return NextResponse.json(cards);
  } catch (error: any) {
    console.error("API Error fetching OLT cards:", error);
    return NextResponse.json({ error: error.message || 'Failed to fetch cards' }, { status: 500 });
  }
}
