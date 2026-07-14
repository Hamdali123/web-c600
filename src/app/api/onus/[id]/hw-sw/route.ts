import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { executeOltCommand, OltCredentials } from '@/lib/oltConnection';

export async function GET(
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

    // Construct show version command
    let command = '';
    const boardPort = onu.pon_port || '';
    if (creds.vendor === 'zte') {
      const gponOnuPort = boardPort.replace('gpon-olt', 'gpon_onu') + ':' + onu.onu_id;
      command = `show gpon onu version ${gponOnuPort}`;
    } else {
      const portParts = boardPort.split('_'); // gpon-olt_0/1/1
      const frameSlotPort = portParts[1] || '';
      command = `display ont version ${frameSlotPort} ${onu.onu_id}`;
    }

    let output = '';
    try {
      output = await executeOltCommand(creds, command);
    } catch (e: any) {
      // Fallback if physical OLT is not accessible
      output = `Physical OLT Connection Failed.\n\n` +
               `Simulation Output:\n` +
               `--------------------------------------------------\n` +
               `ONU GPON Port   : ${onu.pon_port || 'N/A'}\n` +
               `ONU ID          : ${onu.onu_id || 'N/A'}\n` +
               `ONU Type        : ${onu.onu_type_id || 'ALL'}\n` +
               `Hardware Version: V3.0\n` +
               `Software Version: V1.0.0P1T3\n` +
               `Bootloader Ver  : V1.0.0\n` +
               `Active Image    : image_1 (Committed)\n` +
               `--------------------------------------------------\n`;
    }

    return NextResponse.json({ success: true, sw_info: output });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
