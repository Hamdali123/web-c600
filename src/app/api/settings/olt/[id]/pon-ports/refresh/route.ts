import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getOltPonPorts, OltCredentials } from '@/lib/oltConnection';

export async function POST(
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

    const creds: OltCredentials = {
      ip: olt.ip_address,
      port: olt.telnet_port,
      username: olt.telnet_user || '',
      password: olt.telnet_pass || '',
      protocol: (olt.protocol as any) || 'telnet',
      vendor: (olt.vendor as any) || 'zte'
    };

    // Force fetch LIVE PON ports and ONU counts from physical OLT
    const livePonPorts = await getOltPonPorts(creds);

    // Save to a cache file so the main GET route can read it quickly
    const fs = require('fs');
    fs.writeFileSync('./pon_tx_cache.json', JSON.stringify({
        timestamp: Date.now(),
        ports: livePonPorts
    }));

    return NextResponse.json({ success: true, ports: livePonPorts });
  } catch (error: any) {
    console.error("Refresh PON ports failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
