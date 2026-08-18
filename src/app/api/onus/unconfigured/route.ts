import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { scanUnconfiguredOnus } from '@/lib/autoDiscoveryWorker';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const oltIdStr = searchParams.get('olt_id');
    const pon = searchParams.get('pon');
    
    // Live scan OLT on request when Refresh is clicked or page is loaded!
    const targetOltId = (oltIdStr && oltIdStr !== 'all' && oltIdStr !== '0') ? parseInt(oltIdStr) : undefined;
    await scanUnconfiguredOnus(targetOltId).catch(() => {});

    let filter: any = {};
    if (oltIdStr && oltIdStr !== 'all' && oltIdStr !== '0') {
        filter.olt_id = parseInt(oltIdStr);
    }
    if (pon && pon !== '0') {
        const ponMatch = pon.match(/(\d+\/\d+\/\d+)/);
        if (ponMatch) {
            filter.pon_port = { contains: ponMatch[0] };
        } else {
            filter.pon_port = { contains: pon };
        }
    }

    const unconfiguredOnus = await prisma.oNUUnconfigured.findMany({
       where: filter,
       include: { olt: true },
       orderBy: { discoveredAt: 'desc' }
    });

    const sns = unconfiguredOnus.map(onu => onu.sn_mac);
    const configuredOnus = await prisma.oNUConfigured.findMany({
        where: { sn_mac: { in: sns } }
    });
    const configuredSnMap = new Map(configuredOnus.map(o => [o.sn_mac, o.id]));

    const response = unconfiguredOnus.map(onu => ({
        ...onu,
        configuredOnuId: configuredSnMap.get(onu.sn_mac) || null
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
