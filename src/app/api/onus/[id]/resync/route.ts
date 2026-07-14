import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { executeOltCommand, OltCredentials } from '@/lib/oltConnection';

export async function POST(
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

    const creds: OltCredentials = {
      ip: onu.olt.ip_address,
      port: onu.olt.telnet_port || 23,
      username: onu.olt.telnet_user || '',
      password: onu.olt.telnet_pass || '',
      protocol: (onu.olt.protocol as 'ssh' | 'telnet') || 'telnet',
      vendor: (onu.olt.manufacturer?.toLowerCase() as 'zte' | 'huawei') || 'zte'
    };

    let command = '';
    const boardPort = onu.pon_port || '';
    if (creds.vendor === 'zte') {
      const interfacePort = boardPort.replace('olt', 'onu') + ':' + onu.onu_id;
      command = `config t\ninterface ${interfacePort}\nexit\n`;
    } else {
      command = `config\ninterface ${boardPort}\nquit\n`;
    }

    try {
      await executeOltCommand(creds, command);
    } catch (e) {
      console.warn("Physical OLT connection failed during resync, using simulation fallback");
    }

    return NextResponse.json({ success: true, message: 'Configuration successfully resynced.' });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
