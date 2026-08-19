import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { executeOltCommand, OltCredentials } from '@/lib/oltConnection';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const oltId = searchParams.get('oltId');
    if (!oltId) return NextResponse.json({ error: 'OLT ID required' }, { status: 400 });

    const olt = await prisma.oLTDevice.findUnique({
      where: { id: parseInt(oltId) }
    });

    if (!olt) return NextResponse.json({ error: 'OLT not found' }, { status: 404 });

    const creds: OltCredentials = {
      ip: olt.ip_address,
      port: olt.telnet_port || 23,
      username: olt.telnet_user || '',
      password: olt.telnet_pass || '',
      protocol: (olt.protocol as any) || 'telnet',
      vendor: (olt.vendor as any) || 'zte'
    };

    // ZTE C600: T-CONT profiles define the bandwidth limits applied to ONUs
    let raw = '';
    if (creds.vendor === 'zte') {
      raw = await executeOltCommand(creds, 'show gpon profile tcont');
    } else {
      return NextResponse.json({ success: true, count: 0, message: 'Sync only supported for ZTE OLTs' });
    }

    // Parse: "Profile name :<name>" followed by a data row "  <type>  FBW  ABW  MBW  ..."
    const profiles: { name: string; upload: number; download: number }[] = [];
    const lines = raw.split('\n');
    let currentName: string | null = null;
    for (const line of lines) {
      const nameMatch = line.match(/Profile name\s*:(\S+)/i);
      if (nameMatch) {
        currentName = nameMatch[1].trim();
        continue;
      }
      const rowMatch = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s/i);
      if (rowMatch && currentName) {
        const fbw = parseInt(rowMatch[2]);
        const abw = parseInt(rowMatch[3]);
        const mbw = parseInt(rowMatch[4]);
        const bw = mbw > 0 ? mbw : fbw;
        if (bw > 0) {
          profiles.push({ name: currentName, upload: bw, download: bw });
        }
        currentName = null;
      }
    }

    let count = 0;
    for (const p of profiles) {
      const exists = await prisma.speedProfile.findFirst({
        where: { name: p.name }
      });
      if (!exists) {
        await prisma.speedProfile.create({
          data: { name: p.name, upload: p.upload, download: p.download }
        });
        count++;
      } else {
        await prisma.speedProfile.update({
          where: { id: exists.id },
          data: { upload: p.upload, download: p.download }
        });
      }
    }

    return NextResponse.json({ success: true, count, total: profiles.length });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}