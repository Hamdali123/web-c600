import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const history = await prisma.signalHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    // Manually join with ONU data since they are not linked in the current schema
    const onuIds = [...new Set(history.map(h => h.onu_id))];
    const onus = await prisma.oNUConfigured.findMany({
      where: { id: { in: onuIds } },
      include: { olt: true }
    });

    const result = history.map(h => {
      const onu = onus.find(o => o.id === h.onu_id);
      return {
        ...h,
        onu_name: onu?.name || 'Unknown',
        sn_mac: onu?.sn_mac || 'N/A',
        olt_name: onu?.olt?.name || 'N/A'
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch signal history' }, { status: 500 });
  }
}
