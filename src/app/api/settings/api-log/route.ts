import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const method = searchParams.get('method') || '';
    const statusStr = searchParams.get('status') || '';
    const uri = searchParams.get('uri') || '';
    const period = searchParams.get('period') || '24h'; // 1h, 24h, 7d, 30d

    // Build filter
    const where: any = {};
    if (method) where.method = method;
    if (statusStr) where.status = parseInt(statusStr);
    if (uri) {
      where.uri = { contains: uri };
    }

    // Filter by period
    let dateLimit = new Date();
    if (period === '1h') dateLimit.setHours(dateLimit.getHours() - 1);
    else if (period === '24h') dateLimit.setDate(dateLimit.getDate() - 1);
    else if (period === '7d') dateLimit.setDate(dateLimit.getDate() - 7);
    else if (period === '30d') dateLimit.setDate(dateLimit.getDate() - 30);
    else dateLimit.setDate(dateLimit.getDate() - 1); // fallback 24h

    where.createdAt = { gte: dateLimit };

    const logs = await prisma.apiLog.findMany({
      where,
      orderBy: { id: 'desc' },
      take: 100
    });

    return NextResponse.json(logs);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch API logs' }, { status: 500 });
  }
}
