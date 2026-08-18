import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const userEmail = "admin@example.com";
    
    await prisma.autoTask.updateMany({
      where: { status: 'Running' },
      data: { 
        status: 'Stopped', 
        end_time: new Date(),
        stopped_by: userEmail
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to stop tasks' }, { status: 500 });
  }
}
