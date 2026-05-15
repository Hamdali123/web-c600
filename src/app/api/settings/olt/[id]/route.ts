import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params;
    console.log(`FETCHING OLT DETAILS FOR ID: ${idStr}`);
    const id = parseInt(idStr);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const olt = await prisma.oLTDevice.findUnique({
      where: { id: id },
      include: {
        vlans: true,
      }
    });

    console.log(`PRISMA RESULT FOR ID ${id}:`, JSON.stringify(olt));

    if (!olt) {
      return NextResponse.json({ error: 'OLT not found' }, { status: 404 });
    }

    return NextResponse.json(olt);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch OLT details' }, { status: 500 });
  }
}
