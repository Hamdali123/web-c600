import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/activityLogger';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const onuId = parseInt(id);

    const onu = await prisma.oNUConfigured.findUnique({
      where: { id: onuId },
      include: { olt: true }
    });

    if (!onu) return NextResponse.json({ success: false, error: 'ONU not found' }, { status: 404 });

    await logActivity('Factory Reset', `Requested factory reset for ONU: ${onu.name} (SN: ${onu.sn_mac})`, 'Success');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
