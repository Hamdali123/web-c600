import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    console.log("GET /api/dashboard PARAMS:", searchParams.toString());
    const oltIdStr = searchParams.get('olt_id');
    let oltId: number | undefined = undefined;
    if (oltIdStr && oltIdStr !== 'all') {
      const parsed = parseInt(oltIdStr);
      if (!isNaN(parsed)) {
        const exists = await prisma.oLTDevice.findUnique({ where: { id: parsed } });
        if (exists) oltId = parsed;
      }
    }

    const filter = oltId ? { olt_id: oltId } : {};

    const unconfiguredCount = await prisma.oNUUnconfigured.count({
      where: filter
    });
    
    const onlineCount = await prisma.oNUConfigured.count({
      where: { ...filter, status: 'Online' }
    });
    
    const pwrFailCount = await prisma.oNUConfigured.count({
      where: {
        ...filter,
        OR: [
          { offline_reason: { contains: 'power' } },
          { offline_reason: { contains: 'dying' } }
        ]
      }
    });

    const losCount = await prisma.oNUConfigured.count({
      where: {
        ...filter,
        offline_reason: { contains: 'los' }
      }
    });

    const totalOffline = await prisma.oNUConfigured.count({
      where: { ...filter, status: 'Offline' }
    });

    const oltDevice = oltId ? await prisma.oLTDevice.findUnique({ where: { id: oltId } }) : await prisma.oLTDevice.findFirst();
    const threshold = oltDevice?.signal_threshold ?? -27.0;

    const signalWarningCount = await prisma.oNUConfigured.count({
      where: {
        ...filter,
        status: 'Online',
        signal: { lte: threshold, gt: -30.0 }
      }
    });

    const signalCriticalCount = await prisma.oNUConfigured.count({
      where: {
        ...filter,
        status: 'Online',
        signal: { lte: -30.0 }
      }
    });

    const lowSignalsCount = signalWarningCount + signalCriticalCount;

    const totalAuthorized = await prisma.oNUConfigured.count({
      where: filter
    });

    const olts = await prisma.oLTDevice.findMany({
       select: { 
         id: true, name: true, manufacturer: true, ip_address: true,
         cpu_load: true, memory_load: true, temperature: true, last_polled: true
       }
    });

    const recentLogs = await prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6
    });

    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Calculate last 7 days authorizations grouped by day
    const authPerDay = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const startOfDay = new Date(d.setHours(0, 0, 0, 0));
      const endOfDay = new Date(d.setHours(23, 59, 59, 999));

      const count = await prisma.oNUConfigured.count({
        where: {
          ...filter,
          createdAt: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      });

      authPerDay.push({
        date: startOfDay.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        gpon_total: count,
        epon_total: 0
      });
    }

    return NextResponse.json({
      unconfigured: unconfiguredCount,
      online: onlineCount,
      offline: totalOffline,
      powerFailed: pwrFailCount,
      los: losCount,
      totalAuthorized: totalAuthorized,
      lowSignals: lowSignalsCount,
      signalWarning: signalWarningCount,
      signalCritical: signalCriticalCount,
      olts: olts,
      recentLogs: recentLogs,
      notifications: notifications,
      authPerDay: authPerDay
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}
