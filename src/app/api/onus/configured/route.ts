import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const oltId = searchParams.get('olt');
    const reason = searchParams.get('reason'); // Power Failed, LOS
    const zoneId = searchParams.get('zone');
    const odbId = searchParams.get('odb');
    const vlan = searchParams.get('vlan');
    const onuType = searchParams.get('onu_type');
    const signalLow = searchParams.get('signal_low') === 'true';
    
    // Build Prisma Where Clause
    let whereClause: any = {};
    
    if (search) {
       whereClause.OR = [
         { name: { contains: search } },
         { sn_mac: { contains: search } }
       ];
    }
    
    if (status) {
       whereClause.status = status;
    }

    if (reason) {
       whereClause.offline_reason = reason;
       whereClause.status = 'Offline';
    }

    if (signalLow) {
       whereClause.status = 'Online';
       whereClause.signal = { lt: -25 };
    }
    
    if (oltId && oltId !== 'all') {
       const parsedId = parseInt(oltId);
       if (!isNaN(parsedId)) whereClause.olt_id = parsedId;
    }

    if (zoneId && zoneId !== 'all') {
       const parsedId = parseInt(zoneId);
       if (!isNaN(parsedId)) whereClause.zone_id = parsedId;
    }

    if (odbId && odbId !== 'all') {
       const parsedId = parseInt(odbId);
       if (!isNaN(parsedId)) whereClause.odb_id = parsedId;
    }

    if (vlan && vlan !== 'all') {
       const parsedVlan = parseInt(vlan);
       if (!isNaN(parsedVlan)) whereClause.vlan = parsedVlan;
    }

    if (onuType && onuType !== 'all') {
       const parsedId = parseInt(onuType);
       if (!isNaN(parsedId)) whereClause.onu_type_id = parsedId;
    }

    const configuredOnus = await prisma.oNUConfigured.findMany({
       where: whereClause,
       include: { 
         olt: true,
         onu_type: true,
         zone: true,
         odb: true
       },
       orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(configuredOnus);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
