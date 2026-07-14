import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { deleteOnu, OltCredentials } from '@/lib/oltConnection';
import { logActivity } from '@/lib/activityLogger';

export async function DELETE(
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
      port: 23,
      username: onu.olt.telnet_user || '',
      password: onu.olt.telnet_pass || '',
      protocol: 'telnet',
      vendor: (onu.olt.manufacturer?.toLowerCase() as 'zte' | 'huawei') || 'zte'
    };

    // 1. Delete from physical OLT
    try {
      await deleteOnu(creds, {
        portInfo: onu.pon_port || '',
        onuId: onu.onu_id || ''
      });
    } catch (e) {
      console.warn("Failed to delete from physical OLT (offline or timeout). Proceeding with database cleanup.", e);
    }

    // 2. Clean up associated history and notifications to prevent Foreign Key Constraint errors
    await prisma.notification.deleteMany({ where: { onu_id: onu.id } });
    await prisma.signalHistory.deleteMany({ where: { onu_id: onu.id } });
    await prisma.statusHistory.deleteMany({ where: { onu_id: onu.id } });

    // 3. Delete from local DB
    await prisma.oNUConfigured.delete({
      where: { id: onu.id }
    });

    await logActivity('Delete ONU', `ONU: ${onu.name}, SN: ${onu.sn_mac}`, 'Success');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    await logActivity('Delete ONU', `Error: ${error.message}`, 'Error');
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
