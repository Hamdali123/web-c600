import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = (body.name || '').trim();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const speedProfile = await prisma.speedProfile.create({
      data: {
        name,
        upload: parseInt(body.upload) || 10240,
        download: parseInt(body.download) || 10240
      }
    });
    return NextResponse.json({ success: true, data: speedProfile });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Failed to create speed profile' }, { status: 500 });
  }
}