import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { executeOltCommand } from '@/lib/oltConnection';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const oltId = searchParams.get('oltId');
    if (!oltId) return NextResponse.json({ error: 'OLT ID required' }, { status: 400 });

    const olt = await prisma.oLTDevice.findUnique({
      where: { id: parseInt(oltId) }
    });

    if (!olt) return NextResponse.json({ error: 'OLT not found' }, { status: 404 });

    // Sync logic (simplified)
    const mockProfiles = [
      { name: '10M_UPLOAD', upload: 10240, download: 10240 },
      { name: '50M_DOWNLOAD', upload: 10240, download: 51200 },
      { name: '100M_FULL', upload: 102400, download: 102400 }
    ];

    let count = 0;
    for (const p of mockProfiles) {
      const exists = await prisma.speedProfile.findFirst({
        where: { name: p.name }
      });
      if (!exists) {
        await prisma.speedProfile.create({
          data: {
            name: p.name,
            upload: p.upload,
            download: p.download
          }
        });
        count++;
      }
    }

    return NextResponse.json({ success: true, count });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
