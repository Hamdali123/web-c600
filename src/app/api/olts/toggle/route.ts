import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const olt = await prisma.oLTDevice.findUnique({ where: { id: parseInt(id) } });
    if (!olt) return NextResponse.json({ error: 'OLT not found' }, { status: 404 });

    const updated = await prisma.oLTDevice.update({
      where: { id: parseInt(id) },
      data: { disabled: !olt.disabled }
    });

    return NextResponse.json({ success: true, disabled: updated.disabled });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to toggle OLT' }, { status: 500 });
  }
}