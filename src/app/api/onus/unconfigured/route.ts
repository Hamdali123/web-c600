import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const oltIdStr = searchParams.get('olt_id');
    const pon = searchParams.get('pon');
    
    let filter: any = {};
    if (oltIdStr && oltIdStr !== 'all' && oltIdStr !== '0') {
        filter.olt_id = parseInt(oltIdStr);
    }
    if (pon && pon !== '0') {
        // pon could be something like "1/2/13"
        const ponMatch = pon.match(/(\d+\/\d+\/\d+)/);
        if (ponMatch) {
            filter.pon_port = { contains: ponMatch[0] };
        } else {
            filter.pon_port = { contains: pon };
        }
    }

    const unconfiguredOnus = await prisma.oNUUnconfigured.findMany({
       where: filter,
       include: { olt: true }
    });
    return NextResponse.json(unconfiguredOnus);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
