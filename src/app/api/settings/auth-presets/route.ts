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
    const { name, vlan, profile_id, mode, sn_pattern, olt_id, zone_id } = body;

    const preset = await prisma.authPreset.create({
      data: {
        name,
        sn_pattern,
        vlan: parseInt(vlan),
        profile_id: parseInt(profile_id),
        mode,
        olt_id: olt_id ? parseInt(olt_id) : null,
        zone_id: zone_id ? parseInt(zone_id) : null
      }
    });

    return NextResponse.json({ success: true, data: preset });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
