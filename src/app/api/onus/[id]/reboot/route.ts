import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { rebootOnu, OltCredentials } from '@/lib/oltConnection';
import { logActivity } from '@/lib/activityLogger';

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
      protocol: (onu.olt.protocol?.toLowerCase() as 'ssh' | 'telnet') || 'telnet',
      vendor: (onu.olt.manufacturer?.toLowerCase() as 'zte' | 'huawei') || 'zte'
    };

    const result = await rebootOnu(creds, {
      portInfo: onu.pon_port || '',
      onuId: onu.onu_id || ''
    });

    await logActivity('Reboot ONU', `ONU: ${onu.name}, SN: ${onu.sn_mac}`, 'Success');

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error(error);
    await logActivity('Reboot ONU', `Error: ${error.message}`, 'Error');
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
