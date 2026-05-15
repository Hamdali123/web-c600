import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const [olts, zones, odbs, onuTypes, speedProfiles, vlans] = await Promise.all([
      prisma.oLTDevice.findMany({ select: { id: true, name: true } }),
      prisma.zone.findMany({ select: { id: true, name: true } }),
      prisma.oDB.findMany({ select: { id: true, name: true, zone_id: true } }),
      prisma.oNUType.findMany({ select: { id: true, name: true } }),
      prisma.speedProfile.findMany({ select: { id: true, name: true } }),
      prisma.vLAN.findMany({ select: { id: true, vlan_id: true, description: true, olt_id: true } })
    ]);

    return NextResponse.json({
      olts,
      zones,
      odbs,
      onuTypes,
      speedProfiles,
      vlans
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch master data' }, { status: 500 });
  }
}
