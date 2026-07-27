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
    
    const onuMode = searchParams.get('onu_mode');
    const board = searchParams.get('board');
    const port = searchParams.get('port');
    const profileId = searchParams.get('profile');
    const ponType = searchParams.get('pon_type');
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 100;
    const skip = (page - 1) * limit;

    // Build Prisma Where Clause
    let whereClause: any = {};
    
    if (search) {
       whereClause.OR = [
         { name: { contains: search } },
         { sn_mac: { contains: search } },
         { vlan: { contains: search } },
         { address: { contains: search } }
       ];
    }
    
    if (status) {
       const statuses = status.split(',');
       const orConditions = [];

       if (statuses.includes('Online') || statuses.includes('online')) {
         orConditions.push({ status: 'Online' });
       }

       if (statuses.includes('Offline') || statuses.includes('offline')) {
         if (reason === 'LOS') {
           orConditions.push({ status: 'Offline', offline_reason: { contains: 'LOS' } });
           orConditions.push({ status: 'Offline', offline_reason: { contains: 'los' } });
         } else if (reason === 'Power Failed') {
           orConditions.push({ status: 'Offline', offline_reason: { contains: 'Power Failed' } });
           orConditions.push({ status: 'Offline', offline_reason: { contains: 'power' } });
           orConditions.push({ status: 'Offline', offline_reason: { contains: 'dyinggasp' } });
           orConditions.push({ status: 'Offline', offline_reason: { contains: 'DyingGasp' } });
         } else {
           orConditions.push({ 
             status: 'Offline', 
             offline_reason: { notIn: ['LOS', 'los', 'dyinggasp', 'DyingGasp', 'Power Failed', 'power'] } 
           });
         }
       }

       if (orConditions.length > 0) {
         if (whereClause.OR) {
             whereClause.AND = [
                 { OR: whereClause.OR },
                 { OR: orConditions }
             ];
             delete whereClause.OR;
         } else {
             whereClause.OR = orConditions;
         }
       }
    }

    const signalStatus = searchParams.get('signal_status');
    if (signalStatus) {
       whereClause.status = 'Online';
       if (signalStatus === 'good') {
         whereClause.signal = { gt: -30 };
       } else if (signalStatus === 'warning') {
         whereClause.signal = { lte: -30, gt: -33 };
       } else if (signalStatus === 'critical') {
         whereClause.signal = { lte: -33 };
       }
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
       whereClause.vlan = { contains: vlan };
    }

    if (onuType && onuType !== 'all') {
       const parsedId = parseInt(onuType);
       if (!isNaN(parsedId)) whereClause.onu_type_id = parsedId;
    }
    
    // New Filters
    if (onuMode && onuMode !== 'all') {
       whereClause.mode = { equals: onuMode === 'bridging' ? 'bridge' : 'route' };
    }

    if (board && board !== 'all') {
       whereClause.pon_port = { contains: `/${board}/` }; // Matches the middle number (e.g. gpon-olt_1/2/1 -> board 2)
    }

    if (port && port !== 'all') {
       whereClause.pon_port = { endsWith: `/${port}` }; // Matches the last number (e.g. gpon-olt_1/2/1 -> port 1)
    }

    if (profileId && profileId !== 'all') {
       const parsedId = parseInt(profileId);
       if (!isNaN(parsedId)) whereClause.profile_id = parsedId;
    }

    if (ponType && ponType !== 'all') {
       whereClause.olt = { pon_types: { contains: ponType } };
    }

    const totalCount = await prisma.oNUConfigured.count({ where: whereClause });

    const configuredOnus = await prisma.oNUConfigured.findMany({
       where: whereClause,
       include: { 
         olt: true,
         onu_type: true,
         zone: true,
         odb: true
       },
       orderBy: { createdAt: 'desc' },
       skip: skip,
       take: limit
    });
    
    return NextResponse.json({
      data: configuredOnus,
      total: totalCount,
      page,
      limit
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch', details: error.message, stack: error.stack }, { status: 500 });
  }
}
