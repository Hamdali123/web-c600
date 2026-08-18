import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { olt_id, resync, move, authorize } = body;
    
    // In a real app we'd get the user from session
    const userEmail = "admin@example.com";

    const oltsToProcess = olt_id === 0 
      ? (await prisma.oLTDevice.findMany()).map(o => o.id) 
      : [olt_id];

    for (const id of oltsToProcess) {
      if (resync) {
        await prisma.autoTask.create({
          data: { action: 'Auto-Resync', olt_id: id, user_email: userEmail }
        });
      }
      if (move) {
        await prisma.autoTask.create({
          data: { action: 'Auto-Move', olt_id: id, user_email: userEmail }
        });
      }
      if (authorize) {
        await prisma.autoTask.create({
          data: { action: 'Auto-Authorize', olt_id: id, user_email: userEmail }
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to start tasks' }, { status: 500 });
  }
}
