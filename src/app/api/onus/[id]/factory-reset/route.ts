import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { executeOltCommand, OltCredentials } from '@/lib/oltConnection';
import { logActivity } from '@/lib/activityLogger';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const onuId = parseInt(id);

    const onu = await prisma.oNUConfigured.findUnique({
      where: { id: onuId },
      include: { olt: true }
    });

    if (!onu || !onu.olt) return NextResponse.json({ success: false, error: 'ONU or OLT not found' }, { status: 404 });

    const creds: OltCredentials = {
      ip: onu.olt.ip_address,
      port: onu.olt.telnet_port || 23,
      username: onu.olt.telnet_user || '',
      password: onu.olt.telnet_pass || '',
      protocol: (onu.olt.protocol?.toLowerCase() as 'ssh' | 'telnet') || 'telnet',
      vendor: (onu.olt.manufacturer?.toLowerCase() as 'zte' | 'huawei') || 'zte'
    };

    let command = '';
    const boardPort = onu.pon_port || '';
    if (creds.vendor === 'zte') {
      const interfacePort = boardPort.replace('gpon-olt_', 'gpon_onu-').replace('gpon_olt-', 'gpon_onu-') + ':' + onu.onu_id;
      command = `configure terminal\npon-onu-mng ${interfacePort}\nrestore factory\nexit\nexit\n`;
    } else {
      command = `config\ninterface ${boardPort}\nont factory-reset ${onu.onu_id}\nquit\n`;
    }

    let output = '';
    try {
      output = await executeOltCommand(creds, command, { failOnError: true });
    } catch (e: any) {
      await logActivity('Factory Reset', `Failed for ONU: ${onu.name} (SN: ${onu.sn_mac}) - ${e.message}`, 'Error');
      return NextResponse.json({ success: false, error: `Physical OLT rejected the command: ${e.message}` }, { status: 500 });
    }

    await logActivity('Factory Reset', `Requested factory reset for ONU: ${onu.name} (SN: ${onu.sn_mac})`, 'Success');

    return NextResponse.json({ success: true, result: output });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
