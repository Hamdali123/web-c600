import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/activityLogger';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, vlan, profileId, externalId, address, zoneId, odbId, odbPort, lat, lng, contact, notes, wan_mode, mgmt_ip } = body;

    const onu = await prisma.oNUConfigured.update({
      where: { id: parseInt(id) },
      data: { 
        name: name,
        vlan: vlan ? parseInt(vlan) : undefined,
        profile_id: profileId ? parseInt(profileId) : undefined,
        external_id: externalId,
        address: address,
        zone_id: zoneId ? parseInt(zoneId) : undefined,
        odb_id: odbId ? parseInt(odbId) : undefined,
        odb_port: odbPort || undefined,
        lat: lat || undefined,
        lng: lng || undefined,
        contact: contact,
        notes: notes,
        wan_mode: wan_mode,
        mgmt_ip: mgmt_ip
      },
      include: { olt: true }
    });

    await logActivity('Update ONU Config', `Updated config for ONU: ${onu.name} (VLAN: ${onu.vlan})`, 'Success');

    return NextResponse.json({ success: true, data: onu });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
