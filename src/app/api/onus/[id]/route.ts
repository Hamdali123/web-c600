import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const onu = await prisma.oNUConfigured.findUnique({
      where: { id: parseInt(id) },
      include: {
        olt: true,
        onu_type: true,
        zone: true,
        odb: true,
        profile: true
      }
    });

    if (!onu) {
      return NextResponse.json({ error: 'ONU not found' }, { status: 404 });
    }

    return NextResponse.json(onu);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
