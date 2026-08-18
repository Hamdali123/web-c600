import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { executeOltCommand, getVlans, OltCredentials } from '@/lib/oltConnection';
import * as ZteC600 from '@/lib/vendors/zte-c600';

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
      port: olt.telnet_port,
      username: olt.telnet_user || '',
      password: olt.telnet_pass || '',
      protocol: (olt.protocol as any) || 'telnet',
      vendor: (olt.vendor as any) || 'zte'
    };

    // Step 1: Get all VLAN IDs from OLT
    const realVlans = await getVlans(creds);

    // Step 2: For each VLAN, get detail (name) via 'show vlan <id>'
    const enrichedVlans: { id: number, name: string, desc: string }[] = [];
    for (const v of realVlans) {
      let name = v.name || `VLAN${String(v.id).padStart(4, '0')}`;
      try {
        if (creds.vendor === 'zte') {
          const detail = await executeOltCommand(creds, `show vlan ${v.id}`);
          const parsed = ZteC600.parseVlanDetail(detail);
          if (parsed?.name && parsed.name !== 'N/A') name = parsed.name;
        }
      } catch (_) {}
      enrichedVlans.push({ id: v.id, name, desc: name });
    }

    // Step 3: Upsert into DB (add missing, update names)
    let added = 0;
    let updated = 0;
    for (const v of enrichedVlans) {
      const existing = await prisma.vLAN.findFirst({
        where: { vlan_id: v.id, olt_id: olt.id }
      });

      // Determine type from known VLANs
      let type = 'Management';
      const lowerName = v.name.toLowerCase();
      if (lowerName.includes('hotspot') || lowerName.includes('hotspot') || lowerName.includes('hostop')) type = 'Hotspot';
      else if (v.id === 125 || lowerName.includes('internet') || lowerName.includes('pppoe') || lowerName.includes('resid')) type = 'Residential';

      if (!existing) {
        await prisma.vLAN.create({
          data: {
            vlan_id: v.id,
            description: `${v.name}`,
            type,
            olt_id: olt.id
          }
        });
        added++;
      } else {
        // Update description if name changed
        if (existing.description !== v.name) {
          await prisma.vLAN.update({
            where: { id: existing.id },
            data: { description: v.name, type }
          });
          updated++;
        }
      }
    }

    return NextResponse.json({ success: true, added, updated, total: enrichedVlans.length, vlans: enrichedVlans });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
