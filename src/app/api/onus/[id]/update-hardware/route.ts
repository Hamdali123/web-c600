import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizeOnu, deleteOnu, saveConfig, OltCredentials } from '@/lib/oltConnection';
import { logActivity } from '@/lib/activityLogger';

function sanitizeCliValue(value: string): string {
  return (value || '').replace(/[\r\n"]/g, '').trim();
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  try {
    const onuId = parseInt(resolvedParams.id);
    if (isNaN(onuId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const body = await req.json();
    const newSn = sanitizeCliValue(body.new_sn || body.sn || '');
    const newPort = (body.new_port || '').trim();

    if (!newSn && !newPort) {
      return NextResponse.json({ error: 'Nothing to update (provide new_sn and/or new_port)' }, { status: 400 });
    }

    const onu = await prisma.oNUConfigured.findUnique({
      where: { id: onuId },
      include: { olt: true, onu_type: true, profile: true }
    });

    if (!onu || !onu.olt) return NextResponse.json({ error: 'ONU or OLT not found' }, { status: 404 });

    // Moving to a new port requires a valid target port
    let targetPort = onu.pon_port || '';
    if (newPort) {
      if (!/^gpon[-_]?olt[-_]?\d+\/\d+\/\d+$/i.test(newPort)) {
        return NextResponse.json({ error: `Invalid PON port format: ${newPort} (expected gpon_olt-1/2/5)` }, { status: 400 });
      }
      targetPort = newPort.replace('gpon-olt_', 'gpon_olt-').replace('gpon_onu-', 'gpon_olt-');
    }

    if (newSn && newSn !== onu.sn_mac) {
      const existing = await prisma.oNUConfigured.findUnique({ where: { sn_mac: newSn } });
      if (existing) {
        return NextResponse.json({ error: `ONU with SN ${newSn} is already configured.` }, { status: 400 });
      }
    }

    const creds: OltCredentials = {
      ip: onu.olt.ip_address,
      port: onu.olt.telnet_port || 23,
      username: onu.olt.telnet_user || '',
      password: onu.olt.telnet_pass || '',
      protocol: (onu.olt.protocol?.toLowerCase() as 'ssh' | 'telnet') || 'telnet',
      vendor: (onu.olt.vendor?.toLowerCase() as 'zte' | 'huawei') || 'zte'
    };

    // 1. Remove the ONU from its current location on the physical OLT
    try {
      await deleteOnu(creds, { portInfo: onu.pon_port || '', onuId: onu.onu_id || '' });
    } catch (e: any) {
      await logActivity('Change Hardware Mapping', `Delete failed for ${onu.name} (${e.message})`, 'Error');
      return NextResponse.json({ error: `Physical OLT rejected delete on old location: ${e.message}` }, { status: 500 });
    }

    // 2. Re-authorize at the (possibly new) location with the (possibly new) SN
    let finalOnuId = onu.onu_id || '';
    if (newPort && targetPort !== onu.pon_port) {
      // pick a free ONU id on the target port
      try {
        const { getOnuStateOnPort, pickFreeOnuId } = await import('@/lib/oltConnection');
        const physicalEntries = await getOnuStateOnPort(creds, targetPort);
        const freeId = pickFreeOnuId(physicalEntries);
        if (freeId !== null) finalOnuId = String(freeId);
      } catch (e) {
        // fall back to current onu id; OLT will reject if taken
      }
    }

    let cliResult = '';
    try {
      cliResult = await authorizeOnu(creds, {
        sn: newSn || onu.sn_mac,
        portInfo: targetPort,
        onuId: finalOnuId,
        onuType: onu.onu_type?.name,
        vlan: onu.vlan,
        name: onu.name,
        mode: onu.mode === 'bridge' ? 'bridge' : 'route',
        pppoeUser: onu.pppoe_user || '',
        pppoePass: onu.pppoe_pass || '',
        profileName: onu.profile?.name
      });
    } catch (e: any) {
      await logActivity('Change Hardware Mapping', `Re-authorize failed for ${onu.name} (${e.message})`, 'Error');
      return NextResponse.json({ error: `OLT rejected re-authorization: ${e.message}` }, { status: 500 });
    }

    try {
      await saveConfig(creds);
    } catch (e) {
      console.warn('save-config failed after hardware change:', e);
    }

    // 3. Update the local DB record
    const updated = await prisma.oNUConfigured.update({
      where: { id: onu.id },
      data: {
        sn_mac: newSn || onu.sn_mac,
        pon_port: targetPort,
        onu_id: finalOnuId
      }
    });

    await logActivity('Change Hardware Mapping', `ONU: ${onu.name}, new SN: ${updated.sn_mac}, new port: ${targetPort}:${finalOnuId}`, 'Success');

    return NextResponse.json({ success: true, data: updated, cli: cliResult });
  } catch (e: any) {
    console.error(e);
    await logActivity('Change Hardware Mapping', `Error: ${e.message}`, 'Error');
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}