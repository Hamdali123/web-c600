import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const oltId = parseInt(id);

    const onus = await prisma.oNUConfigured.findMany({
      where: { olt_id: oltId, mgmt_ip: { not: '' } },
      select: {
        id: true,
        name: true,
        sn_mac: true,
        mgmt_ip: true,
        pon_port: true,
        onu_id: true
      }
    });

    return NextResponse.json(onus);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
