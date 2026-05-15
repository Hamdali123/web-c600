import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '24h'; // 1h, 24h, 7d

    let startTime = new Date();
    if (range === '1h') startTime.setHours(startTime.getHours() - 1);
    else if (range === '24h') startTime.setHours(startTime.getHours() - 24);
    else if (range === '7d') startTime.setDate(startTime.getDate() - 7);

    const history = await prisma.signalHistory.findMany({
      where: {
        onu_id: parseInt(id),
        createdAt: { gte: startTime }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Aggregation logic for 7d to prevent frontend lag
    if (range === '7d' && history.length > 200) {
      // Group by 4-hour intervals for 7 days
      const aggregated: any[] = [];
      let currentGroup: any[] = [];
      let lastGroupTime = history[0].createdAt.getTime();
      const interval = 4 * 60 * 60 * 1000; // 4 hours

      for (const item of history) {
        if (item.createdAt.getTime() - lastGroupTime < interval) {
          currentGroup.push(item.signal);
        } else {
          if (currentGroup.length > 0) {
            const avg = currentGroup.reduce((a, b) => a + b, 0) / currentGroup.length;
            aggregated.push({
              signal: parseFloat(avg.toFixed(2)),
              createdAt: new Date(lastGroupTime)
            });
          }
          currentGroup = [item.signal];
          lastGroupTime = item.createdAt.getTime();
        }
      }
      return NextResponse.json(aggregated);
    }

    return NextResponse.json(history.map(h => ({
      signal: h.signal,
      createdAt: h.createdAt
    })));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch signal history' }, { status: 500 });
  }
}
