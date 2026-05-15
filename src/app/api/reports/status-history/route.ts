import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const history = await prisma.statusHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    const onuIds = [...new Set(history.map(h => h.onu_id))];
    const onus = await prisma.oNUConfigured.findMany({
      where: { id: { in: onuIds } }
    });

    const result = history.map(h => {
      const onu = onus.find(o => o.id === h.onu_id);
      return {
        ...h,
        onu_name: onu?.name || 'Unknown',
        sn_mac: onu?.sn_mac || 'N/A'
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch status history' }, { status: 500 });
  }
}
