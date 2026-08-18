import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const unconfigured = await prisma.oNUUnconfigured.findMany({
    include: { olt: true },
    orderBy: { discoveredAt: 'desc' }
  });

  const waitingAuth = unconfigured.length;
  const oltName = unconfigured[0]?.olt?.name || null;

  return NextResponse.json({
    olt: oltName,
    waitingAuth,
    timestamp: new Date().toISOString()
  });
}
