import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const oltId = searchParams.get('olt');
    const user = searchParams.get('user');
    const action = searchParams.get('action');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    
    let filter: any = {};
    if (oltId && oltId !== '0') filter.olt_id = parseInt(oltId);
    if (user && user !== 'Any') filter.user_email = user;
    if (action && action !== 'Any') filter.action = action;
    if (from || to) {
      filter.start_time = {};
      if (from) filter.start_time.gte = new Date(`${from}T00:00:00`);
      if (to) filter.start_time.lte = new Date(`${to}T23:59:59.999`);
    }

    const tasks = await prisma.autoTask.findMany({
      where: filter,
      include: { olt: true },
      orderBy: { start_time: 'desc' },
      take: 100
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}
