import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const zones = await prisma.zone.findMany({
      include: { _count: { select: { onus: true } } }
    });
    return NextResponse.json(zones);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch zones' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const zone = await prisma.zone.create({
      data: { name: body.name }
    });
    return NextResponse.json({ success: true, zone });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name } = body;
    const zone = await prisma.zone.update({
      where: { id: parseInt(id) },
      data: { name }
    });
    return NextResponse.json({ success: true, zone });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });

    await prisma.zone.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete zone' }, { status: 500 });
  }
}
