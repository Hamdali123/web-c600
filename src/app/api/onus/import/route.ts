import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { onus } = await request.json();

    if (!onus || !Array.isArray(onus)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    let updated = 0;
    for (const onu of onus) {
      if (onu.sn_mac && onu.name) {
        // clean up sn just in case
        const cleanSn = onu.sn_mac.trim().toUpperCase();
        await prisma.oNUConfigured.updateMany({
          where: { sn_mac: cleanSn },
          data: { name: onu.name.trim() }
        });
        updated++;
      }
    }

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to import names' }, { status: 500 });
  }
}
