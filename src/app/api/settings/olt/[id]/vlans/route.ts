import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getVlans } from '@/lib/oltConnection';

export const dynamic = 'force-dynamic';

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

    // Fetch from local database instead of OLT since OLT commands are unreliable
    const vlans = await prisma.vLAN.findMany({
      where: { olt_id: oltId }
    });

    // Format them to match the UI expectations
    const formattedVlans = vlans.map(v => ({
      id: v.vlan_id,
      desc: v.description
    }));

    return NextResponse.json(formattedVlans);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const oltId = parseInt(id);
    const body = await request.json();
    const { vlan_id, description } = body;

    if (!vlan_id) {
      return NextResponse.json({ error: 'VLAN ID is required' }, { status: 400 });
    }

    const olt = await prisma.oLTDevice.findUnique({
      where: { id: oltId }
    });

    if (!olt) return NextResponse.json({ error: 'OLT not found' }, { status: 404 });

    const creds = {
      ip: olt.ip_address,
      port: olt.telnet_port,
      username: olt.telnet_user || '',
      password: olt.telnet_pass || '',
      protocol: (olt.protocol as any) || 'telnet',
      vendor: (olt.vendor as any) || 'zte'
    };

    if (creds.vendor === 'zte') {
      const { executeOltCommand } = await import('@/lib/oltConnection');
      let command = `configure terminal\nvlan ${vlan_id}\n`;
      if (description) {
        command += `name ${description.replace(/\s+/g, '_')}\n`;
      }
      command += `exit\nexit`;
      await executeOltCommand(creds, command);
    }

    // Optionally save to local DB
    try {
      await prisma.vLAN.create({
        data: {
          vlan_id: parseInt(vlan_id),
          description: description || `VLAN${vlan_id}`,
          olt_id: oltId
        }
      });
    } catch (e) {
      // Ignore unique constraint errors
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

