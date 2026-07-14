import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const reason = searchParams.get('reason');
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

    if (reason && reason !== 'Any') {
       if (reason === 'LOS' || reason === 'los') {
           whereClause.OR = [
               { offline_reason: { contains: 'los' } },
               { offline_reason: { contains: 'LOS' } }
           ];
       } else if (reason === 'Power Failed' || reason === 'pwrfail') {
           whereClause.OR = [
               { offline_reason: { contains: 'power' } },
               { offline_reason: { contains: 'dyinggasp' } },
               { offline_reason: { contains: 'Power Failed' } }
           ];
       } else {
           whereClause.offline_reason = reason;
       }
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

    if (signalFilter && signalFilter !== 'Any') {
      if (signalFilter === 'good') {
        whereClause.signal = { gt: -25 };
      } else if (signalFilter === 'warning') {
        whereClause.signal = { lte: -25, gt: -28 };
      } else if (signalFilter === 'critical') {
        whereClause.signal = { lte: -28 };
      }
    }

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
