import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = (body.name || '').trim();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const onuType = await prisma.oNUType.create({
      data: {
        name,
        pon_type: body.pon_type || 'GPON',
        capability: body.capability || 'Bridging',
        eth_ports: body.eth_ports || 1,
        wifi_ssids: body.wifi_ssids || 0,
        pots_ports: body.pots_ports || 0,
        catv: body.catv || false,
        allow_custom_profiles: body.allow_custom_profiles || false
      }
    });
    return NextResponse.json({ success: true, data: onuType });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Failed to create ONU type' }, { status: 500 });
  }
}