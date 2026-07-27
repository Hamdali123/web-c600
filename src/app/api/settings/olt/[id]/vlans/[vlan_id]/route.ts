import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { executeOltCommand, OltCredentials } from '@/lib/oltConnection';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string, vlan_id: string }> }
) {
  try {
    const { id, vlan_id } = await params;
    const oltId = parseInt(id);
    const vlanId = parseInt(vlan_id);

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

    if (creds.vendor === 'zte') {
      const command = `configure terminal\nno vlan ${vlanId}\nexit`;
      await executeOltCommand(creds, command);
    }

    // Try to delete from local DB if it exists, but don't fail if it doesn't
    try {
      // Find the VLAN in the local DB based on vlan_id
      const existingVlan = await prisma.vLAN.findFirst({
        where: { vlan_id: vlanId }
      });
      if (existingVlan) {
        await prisma.vLAN.delete({
          where: { id: existingVlan.id }
        });
      }
    } catch (dbError) {
      console.warn("Could not delete VLAN from local DB or it doesn't exist:", dbError);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
