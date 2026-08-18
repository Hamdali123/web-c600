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
    let boardPort = onu.pon_port || '';
    if (creds.vendor === 'zte') {
      if (!boardPort.includes('gpon_onu-') && !boardPort.includes('gpon-onu_') && !boardPort.includes('gpon-olt_')) {
          boardPort = 'gpon_onu-' + boardPort;
      }
      const gponOnuPort = boardPort.includes('gpon-olt_') 
        ? boardPort.replace('gpon-olt_', 'gpon_onu-') + ':' + onu.onu_id
        : boardPort.replace('olt', 'onu').replace('gpon-onu_', 'gpon_onu-') + ':' + onu.onu_id;
      command = `show gpon onu detail-info ${gponOnuPort}`;
    } else {
      const portParts = boardPort.split('_'); // gpon-olt_0/1/1
      const frameSlotPort = portParts[1] || '';
      command = `display ont version ${frameSlotPort} ${onu.onu_id}`;
    }

    let output = '';
    try {
      output = await executeOltCommand(creds, command);
    } catch (e: any) {
      return NextResponse.json({ success: false, error: `Physical OLT unreachable: ${e.message}` }, { status: 502 });
    }

    return NextResponse.json({ success: true, sw_info: output });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
