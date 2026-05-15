import prisma from './prisma';

export async function logActivity(action: string, details?: string, status: 'Success' | 'Error' = 'Success', userId?: number) {
  try {
    await prisma.activityLog.create({
      data: {
        action,
        details,
        status,
        user_id: userId
      }
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}
