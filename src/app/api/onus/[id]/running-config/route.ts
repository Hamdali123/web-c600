import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getRunningConfig, OltCredentials } from '@/lib/oltConnection';

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
      return NextResponse.json({ error: 'ONU or OLT not found' }, { status: 404 });
    }

    const creds: OltCredentials = {
      ip: onu.olt.ip_address,
      port: onu.olt.telnet_port || 23,
      username: onu.olt.telnet_user || '',
      password: onu.olt.telnet_pass || '',
      protocol: (onu.olt.protocol?.toLowerCase() as 'ssh' | 'telnet') || 'telnet',
      vendor: (onu.olt.manufacturer?.toLowerCase() as 'zte' | 'huawei') || 'zte'
    };

    let configOutput = '';
    try {
      configOutput = await getRunningConfig(creds, {
        portInfo: onu.pon_port || '',
        onuId: onu.onu_id || ''
      });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: `Physical OLT unreachable: ${e.message}` }, { status: 502 });
    }

    return NextResponse.json({ success: true, config: configOutput });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
