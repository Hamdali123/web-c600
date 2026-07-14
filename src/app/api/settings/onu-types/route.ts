import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const types = await prisma.oNUType.findMany({
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(types);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch types' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      name, pon_type, eth_ports, wifi_ssids, pots_ports, catv, 
      capability, allow_custom_profiles 
    } = body;

    const type = await prisma.oNUType.create({
      data: {
        name,
        pon_type,
        capability: capability || 'Bridging',
        eth_ports: parseInt(eth_ports || '1'),
        wifi_ssids: parseInt(wifi_ssids || '0'),
        pots_ports: parseInt(pots_ports || '0'),
        catv: Boolean(catv),
        allow_custom_profiles: Boolean(allow_custom_profiles)
      }
    });

    return NextResponse.json({ success: true, data: type });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { 
      id, name, pon_type, eth_ports, wifi_ssids, pots_ports, catv, 
      capability, allow_custom_profiles 
    } = body;

    const type = await prisma.oNUType.update({
      where: { id: parseInt(id) },
      data: {
        name,
        pon_type,
        capability: capability || 'Bridging',
        eth_ports: parseInt(eth_ports || '1'),
        wifi_ssids: parseInt(wifi_ssids || '0'),
        pots_ports: parseInt(pots_ports || '0'),
        catv: Boolean(catv),
        allow_custom_profiles: Boolean(allow_custom_profiles)
      }
    });

    return NextResponse.json({ success: true, data: type });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await prisma.oNUType.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
