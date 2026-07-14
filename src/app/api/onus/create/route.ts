import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizeOnu } from '@/lib/oltConnection';
import { logActivity } from '@/lib/activityLogger';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      sn, name, vlan, mode, pppoeUser, pppoePass, 
      onuTypeId, zoneId, odbId, profileId,
      oltId, portInfo, onuId,
      contact, notes, wan_mode
    } = body;

    if (!sn || !name || !vlan || !oltId) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const olt = await prisma.oLTDevice.findUnique({ where: { id: parseInt(oltId) } });
    if (!olt) return NextResponse.json({ success: false, error: 'OLT not found' }, { status: 404 });

    const onuType = await prisma.oNUType.findUnique({ where: { id: parseInt(onuTypeId) } });

    // 1. Execute CLI Command
    const cliResult = await authorizeOnu({
      ip: olt.ip_address,
      port: olt.telnet_port,
      username: olt.telnet_user || '',
      password: olt.telnet_pass || '',
      protocol: (olt.protocol as any) || 'telnet',
      vendor: (olt.vendor as any) || 'zte'
    }, {
      sn,
      portInfo,
      onuId,
      onuType: onuType?.name,
      vlan: parseInt(vlan),
      name,
      mode: mode || 'route',
      pppoeUser,
      pppoePass
    });

    // 2. Save to Database
    const newOnu = await prisma.oNUConfigured.create({
      data: {
        sn_mac: sn,
        name: name,
        olt_id: parseInt(oltId),
        pon_port: portInfo,
        onu_id: onuId,
        vlan: String(vlan),
        mode: mode,
        pppoe_user: pppoeUser,
        pppoe_pass: pppoePass,
        onu_type_id: onuTypeId ? parseInt(onuTypeId) : null,
        zone_id: zoneId ? parseInt(zoneId) : null,
        odb_id: odbId ? parseInt(odbId) : null,
        profile_id: profileId ? parseInt(profileId) : null,
        status: body.isOffline ? 'Offline' : 'Online',
        contact: contact,
        notes: notes,
        wan_mode: wan_mode || 'PPPoE'
      }
    });

    await prisma.oNUUnconfigured.deleteMany({ where: { sn_mac: sn } });

    await logActivity('Authorize ONU', `Authorized SN: ${sn}, Name: ${name}`, 'Success');

    return NextResponse.json({ success: true, data: newOnu, cli: cliResult });

  } catch (error: any) {
    console.error('ONU creation error:', error);
    await logActivity('Authorize ONU', `Error: ${error.message}`, 'Error');
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
