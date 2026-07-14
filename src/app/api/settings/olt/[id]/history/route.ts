import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const olt = await prisma.oLTDevice.findUnique({
      where: { id: id }
    });

    if (!olt) {
      return NextResponse.json({ error: 'OLT not found' }, { status: 404 });
    }

    // Query activity logs where the details contains the OLT name or logs created during operations on this OLT
    const logs = await prisma.activityLog.findMany({
      where: {
        OR: [
          { details: { contains: olt.name } },
          { details: { contains: olt.ip_address } }
        ]
      },
      include: {
        user: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(logs);
  } catch (error: any) {
    console.error("Error fetching OLT history:", error);
    return NextResponse.json({ error: error.message || 'Failed to fetch OLT history' }, { status: 500 });
  }
}
