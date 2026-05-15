import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const odbs = await prisma.oDB.findMany({
      include: { zone: true },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(odbs);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch ODBs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, ports, zone_id, lat, lng } = body;

    const odb = await prisma.oDB.create({
      data: {
        name,
        ports: parseInt(ports),
        zone_id: parseInt(zone_id),
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null
      }
    });

    return NextResponse.json({ success: true, data: odb });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await prisma.oDB.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
