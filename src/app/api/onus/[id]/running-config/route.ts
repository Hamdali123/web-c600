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
      port: 23,
      username: onu.olt.telnet_user || '',
      password: onu.olt.telnet_pass || '',
      protocol: 'telnet',
      vendor: (onu.olt.manufacturer?.toLowerCase() as 'zte' | 'huawei') || 'zte'
    };

    let configOutput = '';
    try {
      configOutput = await getRunningConfig(creds, {
        portInfo: onu.pon_port || '',
        onuId: onu.onu_id || ''
      });
    } catch (e: any) {
      // Fallback simulation
      configOutput = `Physical OLT Connection Failed.\n\n` +
                     `Simulation Running Configuration:\n` +
                     `--------------------------------------------------\n` +
                     `pon-onu-mng ${onu.pon_port?.replace('gpon-olt', 'gpon_onu') || 'gpon_onu-1/1/1'}:${onu.onu_id || '1'}\n` +
                     `  name ${onu.name}\n` +
                     `  tcont 1 profile UP\n` +
                     `  gemport 1 tcont 1\n` +
                     `  gemport 1 traffic-limit upstream DOWN downstream UP\n` +
                     `  service 1 gemport  gemport 1 vlan ${onu.vlan}\n` +
                     `  wan-service 1 type internet vlan ${onu.vlan}\n` +
                     `  pppoe 1 user ${onu.pppoe_user || 'none'} password ${onu.pppoe_pass || 'none'}\n` +
                     `exit\n` +
                     `--------------------------------------------------\n`;
    }

    return NextResponse.json({ success: true, config: configOutput });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
