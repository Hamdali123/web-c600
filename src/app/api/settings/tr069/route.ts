import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const tr069 = await prisma.tR069Profile.findMany();
    return NextResponse.json(tr069);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const tr069 = await prisma.tR069Profile.create({
      data: { name: body.name, acs_url: body.acs_url }
    });
    return NextResponse.json({ success: true, tr069 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
  }
}
