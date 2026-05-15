import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const vlans = await prisma.vLAN.findMany({
      include: { olt: true },
      orderBy: { vlan_id: 'asc' }
    });
    return NextResponse.json(vlans);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch VLANs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { vlan_id, description, olt_id } = body;

    const vlan = await prisma.vLAN.create({
      data: {
        vlan_id: parseInt(vlan_id),
        description,
        olt_id: parseInt(olt_id)
      }
    });

    return NextResponse.json({ success: true, data: vlan });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await prisma.vLAN.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
