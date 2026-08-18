import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/activityLogger';
import { disableOnu } from '@/lib/oltConnection';

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

    if (!onu) return NextResponse.json({ success: false, error: 'ONU not found' }, { status: 404 });

    // Execute OLT Command
    const output = await disableOnu({
      ip: onu.olt.ip_address,
      port: onu.olt.telnet_port,
      username: onu.olt.telnet_user || '',
      password: onu.olt.telnet_pass || '',
      protocol: (onu.olt.protocol as any) || 'telnet',
      vendor: (onu.olt.vendor as any) || 'zte'
    }, {
      portInfo: onu.pon_port || '',
      onuId: onu.onu_id || ''
    });

    const updatedOnu = await prisma.oNUConfigured.update({
      where: { id: onuId },
      data: { enabled: false, status: 'Offline', offline_reason: 'admin_disabled', signal: null, signal_tx: null }
    });

    await logActivity('Disable ONU', `Disabled ONU: ${onu.name} (SN: ${onu.sn_mac}) on OLT ${onu.olt.name}`, 'Success');

    return NextResponse.json({ success: true, data: updatedOnu, result: output });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
