import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const oltId = parseInt(id);

    const olt = await prisma.oLTDevice.findUnique({
      where: { id: oltId }
    });

    if (!olt) return NextResponse.json({ error: 'OLT not found' }, { status: 404 });

    const profiles = await prisma.speedProfile.findMany({
      include: {
        _count: {
          select: { onus: true }
        }
      }
    });

    return NextResponse.json(profiles.map(p => ({
      ...p,
      onus_using: p._count.onus
    })));
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
