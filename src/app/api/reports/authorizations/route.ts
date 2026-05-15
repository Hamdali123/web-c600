import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    let whereClause: any = {
      action: 'Authorize ONU'
    };

    if (search) {
      whereClause.details = {
        contains: search
      };
    }

    const logs = await prisma.activityLog.findMany({
      where: whereClause,
      include: {
        user: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}
