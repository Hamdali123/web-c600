import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const types = await prisma.oNUType.findMany();
    return NextResponse.json(types);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const onuType = await prisma.oNUType.create({
      data: {
        name: body.name,
        pon_type: body.ponType,
        eth_ports: parseInt(body.ethPorts),
        wifi_ssids: parseInt(body.wifiSsids),
        pots_ports: parseInt(body.potsPorts),
        catv: body.catv
      }
    });
    return NextResponse.json({ success: true, onuType });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });

    await prisma.oNUType.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete ONU Type' }, { status: 500 });
  }
}
