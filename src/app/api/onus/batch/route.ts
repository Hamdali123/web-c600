import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { rebootOnu, deleteOnu, enableOnu, disableOnu } from '@/lib/oltConnection';
import { logActivity } from '@/lib/activityLogger';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, onuIds } = body;

    if (!action || !onuIds || !Array.isArray(onuIds) || onuIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Invalid parameters' }, { status: 400 });
    }

    const onus = await prisma.oNUConfigured.findMany({
      where: { id: { in: onuIds } },
      include: { olt: true }
    });

    if (onus.length === 0) {
      return NextResponse.json({ success: false, error: 'No ONUs found' }, { status: 404 });
    }

    let successCount = 0;
    let failCount = 0;

    for (const onu of onus) {
      if (!onu.olt) {
        failCount++;
        continue;
      }

      const creds = {
        ip: onu.olt.ip_address,
        port: onu.olt.telnet_port || 23,
        username: onu.olt.telnet_user || '',
        password: onu.olt.telnet_pass || '',
        protocol: (onu.olt.protocol as any) || 'telnet',
        vendor: (onu.olt.vendor as any) || 'zte'
      };

      try {
        if (action === 'reboot') {
          await rebootOnu(creds, { portInfo: onu.pon_port || '', onuId: onu.onu_id || '' });
          await logActivity('Reboot ONU', `Rebooted SN: ${onu.sn_mac} (${onu.name})`, 'Success');
          successCount++;
        } else if (action === 'delete') {
          await deleteOnu(creds, { portInfo: onu.pon_port || '', onuId: onu.onu_id || '' });
          await prisma.oNUConfigured.delete({ where: { id: onu.id } });
          await logActivity('Delete ONU', `Deleted SN: ${onu.sn_mac} (${onu.name})`, 'Success');
          successCount++;
        } else if (action === 'enable') {
          await enableOnu(creds, { portInfo: onu.pon_port || '', onuId: onu.onu_id || '' });
          await prisma.oNUConfigured.update({
            where: { id: onu.id },
            data: { enabled: true, offline_reason: null }
          });
          await logActivity('Enable ONU', `Enabled SN: ${onu.sn_mac} (${onu.name})`, 'Success');
          successCount++;
        } else if (action === 'disable') {
          await disableOnu(creds, { portInfo: onu.pon_port || '', onuId: onu.onu_id || '' });
          await prisma.oNUConfigured.update({
            where: { id: onu.id },
            data: { enabled: false, status: 'Offline', offline_reason: 'admin_disabled', signal: null, signal_tx: null }
          });
          await logActivity('Disable ONU', `Disabled SN: ${onu.sn_mac} (${onu.name})`, 'Success');
          successCount++;
        }
      } catch (err: any) {
        failCount++;
        await logActivity(`Batch Action ${action}`, `Error on SN: ${onu.sn_mac} - ${err.message}`, 'Error');
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Processed ${successCount} ONUs successfully. Failed: ${failCount}` 
    });

  } catch (error: any) {
    console.error('Batch ONU action error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
