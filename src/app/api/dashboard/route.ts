import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const unconfiguredCount = await prisma.oNUUnconfigured.count();
    
    const onlineCount = await prisma.oNUConfigured.count({
      where: { status: 'Online' }
    });
    
    const pwrFailCount = await prisma.oNUConfigured.count({
      where: { offline_reason: 'Power Failed' }
    });

    const losCount = await prisma.oNUConfigured.count({
      where: { offline_reason: 'LOS' }
    });

    const totalOffline = await prisma.oNUConfigured.count({
      where: { status: 'Offline' }
    });

    const lowSignalsCount = await prisma.oNUConfigured.count({
      where: {
        status: 'Online',
        signal: { lt: -25 }
      }
    });

    const totalAuthorized = await prisma.oNUConfigured.count();

    const olts = await prisma.oLTDevice.findMany({
       select: { 
         id: true, name: true, manufacturer: true, ip_address: true,
         cpu_load: true, memory_load: true, temperature: true, last_polled: true
       }
    });

    const recentLogs = await prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    return NextResponse.json({
      unconfigured: unconfiguredCount,
      online: onlineCount,
      offline: totalOffline,
      powerFailed: pwrFailCount,
      los: losCount,
      totalAuthorized: totalAuthorized,
      lowSignals: lowSignalsCount,
      olts: olts,
      recentLogs: recentLogs,
      notifications: notifications
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}
