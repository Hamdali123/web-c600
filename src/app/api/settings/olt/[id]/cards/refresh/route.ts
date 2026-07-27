import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { executeOltCommand, OltCredentials } from '@/lib/oltConnection';
import * as ZteC600 from '@/lib/vendors/zte-c600';

export async function POST(
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

    const creds: OltCredentials = {
      ip: olt.ip_address,
      port: olt.telnet_port,
      username: olt.telnet_user || '',
      password: olt.telnet_pass || '',
      protocol: (olt.protocol as any) || 'telnet',
      vendor: (olt.vendor as any) || 'zte'
    };

    if (creds.vendor === 'zte') {
      const output = await executeOltCommand(creds, ZteC600.getCardsCommand());
      const cards = ZteC600.parseCards(output);
      return NextResponse.json({ success: true, cards });
    }
    
    return NextResponse.json({ success: true, cards: [] });
  } catch (error: any) {
    console.error("Refresh Cards failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
