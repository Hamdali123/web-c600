import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const unconfiguredOnus = await prisma.oNUUnconfigured.findMany({
       include: { olt: true }
    });
    return NextResponse.json(unconfiguredOnus);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
