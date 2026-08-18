import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const presets = await prisma.authPreset.findMany({
      include: { profile: true }
    });
    return NextResponse.json(presets);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      name, description, olt_id, board, port, pon_type, sn_pattern, 
      onu_type_id, fallback_onu_type_id, is_default, mode, channel_type, 
      custom_profile, custom_template_id, use_svlan, svlan_id, 
      use_other_all_tls_vlan, use_cvlan, cvlan_id, vlan, tag_transform_mode, 
      download_speed_id, upload_speed_id, profile_id, zone_id, 
      odb_id, odb_port, location_name, description_pattern, 
      tr069_profile_id, mgmt_ip_mode, mgmt_ip_allow_remote_access 
    } = body;

    const preset = await prisma.authPreset.create({
      data: {
        name,
        description,
        olt_id: olt_id ? parseInt(olt_id) : null,
        board,
        port,
        pon_type: pon_type || 'gpon',
        sn_pattern,
        onu_type_id: onu_type_id ? parseInt(onu_type_id) : null,
        fallback_onu_type_id: fallback_onu_type_id ? parseInt(fallback_onu_type_id) : null,
        is_default: is_default === true,
        mode: mode || 'Routing',
        channel_type: channel_type || 'gpon',
        custom_profile: custom_profile === true,
        custom_template_id: custom_template_id ? parseInt(custom_template_id) : null,
        use_svlan: use_svlan === true,
        svlan_id: svlan_id ? parseInt(svlan_id) : null,
        use_other_all_tls_vlan: use_other_all_tls_vlan === true,
        use_cvlan: use_cvlan === true,
        cvlan_id: cvlan_id ? parseInt(cvlan_id) : null,
        vlan: vlan ? String(vlan) : null,
        tag_transform_mode: tag_transform_mode || 'default',
        download_speed_id: download_speed_id ? parseInt(download_speed_id) : null,
        upload_speed_id: upload_speed_id ? parseInt(upload_speed_id) : null,
        profile_id: profile_id ? parseInt(profile_id) : null,
        zone_id: zone_id ? parseInt(zone_id) : null,
        odb_id: odb_id ? parseInt(odb_id) : null,
        odb_port,
        location_name,
        description_pattern,
        tr069_profile_id: tr069_profile_id ? parseInt(tr069_profile_id) : null,
        mgmt_ip_mode: mgmt_ip_mode || 'Inactive',
        mgmt_ip_allow_remote_access: mgmt_ip_allow_remote_access === true
      }
    });

    return NextResponse.json({ success: true, data: preset });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });

    await prisma.authPreset.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
