import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const oltId = searchParams.get('olt');
    const zoneId = searchParams.get('zone');
    const odbId = searchParams.get('odb');
    const onuType = searchParams.get('onuType');
    const signalFilter = searchParams.get('signal');

    let whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { sn_mac: { contains: search } }
      ];
    }

    if (status && status !== 'Any') {
      whereClause.status = status;
    }

    if (oltId && oltId !== 'Any') {
      whereClause.olt_id = parseInt(oltId);
    }

    if (zoneId && zoneId !== 'Any') {
      whereClause.zone_id = parseInt(zoneId);
    }

    if (odbId && odbId !== 'Any') {
      whereClause.odb_id = parseInt(odbId);
    }

    if (onuType && onuType !== 'Any') {
      whereClause.onu_type_id = parseInt(onuType);
    }

    // Signal filtering logic can be added here if needed
    // e.g., whereClause.signal = { lt: -27 } for critical

    const onus = await prisma.oNUConfigured.findMany({
      where: whereClause,
      include: {
        olt: true,
        zone: true,
        odb: true,
        onu_type: true
      },
      orderBy: { last_online: 'desc' }
    });

    return NextResponse.json(onus);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch diagnostics' }, { status: 500 });
  }
}
