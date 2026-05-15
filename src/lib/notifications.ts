import prisma from './prisma';

export async function createNotification(onuId: number, message: string, type: 'info' | 'warning' | 'error' = 'info') {
  // Cooldown logic: Check if a similar notification was created in the last 10 minutes
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  
  const existing = await prisma.notification.findFirst({
    where: {
      onu_id: onuId,
      message: message,
      createdAt: {
        gte: tenMinutesAgo
      }
    }
  });

  if (existing) {
    // console.log(`[Notification] Cooldown active for ONU ${onuId}: ${message}`);
    return null;
  }

  return await prisma.notification.create({
    data: {
      onu_id: onuId,
      message: message,
      type: type
    }
  });
}
