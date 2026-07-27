import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { executeOltCommand, OltCredentials } from '@/lib/oltConnection';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string, slot: string }> }
) {
  try {
    const { id, slot } = await params;
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
      // Reboot command for card, e.g. reset card 1/2 or reset card 2
      const command = `configure terminal\nreset card ${slot}\nyes\nexit`;
      await executeOltCommand(creds, command);
      return NextResponse.json({ success: true, message: `Card ${slot} reboot initiated.` });
    }
    
    return NextResponse.json({ error: 'Unsupported vendor for this action' }, { status: 400 });
  } catch (error: any) {
    console.error(`Reboot Card ${slot} failed:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
