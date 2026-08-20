import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const reason = searchParams.get('reason');
    // Dashboard deep-links use olt_id, the page itself uses olt — support both.
    const oltId = searchParams.get('olt') || searchParams.get('olt_id');
    const zoneId = searchParams.get('zone');
    const odbId = searchParams.get('odb');
    const onuType = searchParams.get('onuType');
    const board = searchParams.get('board');
    const port = searchParams.get('port');
    const ponType = searchParams.get('ponType');
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

    // Board / Port / PON-type filters (dropdowns on the diagnostics page)
    if (board && board !== 'Any') {
      whereClause.pon_port = { contains: `/${board}/` };
    }
    if (port && port !== 'Any') {
      whereClause.pon_port = { in: [`gpon-olt_${port}`, `gpon_olt-${port}`] };
    }
    if (ponType && ponType !== 'Any') {
      whereClause.olt = { pon_types: { contains: ponType } };
    }

    if (signalFilter && signalFilter !== 'Any') {
      // Accept comma-separated values (e.g. critical,warning from dashboard links)
      const values = signalFilter.split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
      const conditions: any[] = [];
      const oltDevice = oltId ? await prisma.oLTDevice.findUnique({ where: { id: parseInt(oltId) } }) : null;
      const threshold = oltDevice?.signal_threshold ?? -27.0;
      if (values.includes('good')) conditions.push({ signal: { gt: threshold } });
      if (values.includes('warning')) conditions.push({ signal: { lte: threshold, gt: -30.0 } });
      if (values.includes('critical')) conditions.push({ signal: { lte: -30.0 } });
      if (conditions.length > 0) {
        whereClause.status = 'Online';
        if (whereClause.OR) {
          whereClause.AND = [{ OR: whereClause.OR }, { OR: conditions }];
          delete whereClause.OR;
        } else {
          whereClause.OR = conditions;
        }
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
