import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { getVlans } from '@/lib/oltConnection';

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

    const vlans = await prisma.vLAN.findMany({
      where: { olt_id: oltId }
    });

    // Prefer LIVE VLANs from the physical OLT ('show vlan summary'), falling
    // back to the DB copy if the OLT is unreachable.
    let liveVlans: { id: number, desc: string }[] = [];
    try {
        const creds = {
            ip: olt.ip_address,
            port: olt.telnet_port || 23,
            username: olt.telnet_user || '',
            password: olt.telnet_pass || '',
            protocol: (olt.protocol as any) || 'telnet',
            vendor: (olt.vendor as any) || 'zte'
        };
        liveVlans = await getVlans(creds);
    } catch (e) {
        console.error("Failed to fetch live VLANs, falling back to DB", e);
    }
    const liveMap = new Map(liveVlans.map(v => [String(v.id), v.desc]));
    const dbMap = new Map(vlans.map(v => [String(v.vlan_id), v.description]));
    const mergedVlanIds = liveVlans.length > 0
        ? Array.from(liveMap.keys())
        : vlans.map(v => String(v.vlan_id));

    // Fetch all ONUs for this OLT to accurately count VLANs in memory
    // because Prisma's `contains` matches substrings (e.g., "1" matches "125")
    const allOnus = await prisma.oNUConfigured.findMany({
      where: { olt_id: oltId },
      select: { vlan: true }
    });

    // Format them to match the UI expectations
    const formattedVlans = [];
    for (const vlanStr of mergedVlanIds) {
      
      // Count ONUs that have this exact VLAN ID
      let onusCount = 0;
      for (const onu of allOnus) {
        if (!onu.vlan) continue;
        // Split by comma, trim spaces, and check for exact match
        const onuVlans = onu.vlan.split(',').map(vid => vid.trim());
        if (onuVlans.includes(vlanStr)) {
          onusCount++;
        }
      }

      formattedVlans.push({
        id: parseInt(vlanStr),
        desc: liveMap.get(vlanStr) || dbMap.get(vlanStr) || `VLAN${vlanStr.padStart(4, '0')}`,
        onu_count: onusCount
      });
    }

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
      await executeOltCommand(creds, command, { failOnError: true });
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

