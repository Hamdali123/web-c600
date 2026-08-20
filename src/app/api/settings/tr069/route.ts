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
      data: { name: body.name, acs_url: body.acs_url, olt_ids: body.olt_ids || null }
    });
    return NextResponse.json({ success: true, tr069 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const body = await request.json();
    const tr069 = await prisma.tR069Profile.update({
      where: { id: parseInt(id) },
      data: { name: body.name, acs_url: body.acs_url, olt_ids: body.olt_ids }
    });
    return NextResponse.json({ success: true, tr069 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update profile' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await prisma.tR069Profile.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete profile' }, { status: 500 });
  }
}
