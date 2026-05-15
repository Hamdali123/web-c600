import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { readOltAttenuation, OltCredentials, getOnuDetails } from '@/lib/oltConnection';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const onu = await prisma.oNUConfigured.findUnique({
      where: { id: parseInt(id) },
      include: { olt: true }
    });

    if (!onu || !onu.olt) {
      return NextResponse.json({ success: false, error: 'ONU or OLT not found' }, { status: 404 });
    }

    const creds: OltCredentials = {
      ip: onu.olt.ip_address,
      port: 23,
      username: onu.olt.telnet_user || '',
      password: onu.olt.telnet_pass || '',
      protocol: 'telnet',
      vendor: (onu.olt.manufacturer?.toLowerCase() as 'zte' | 'huawei') || 'zte'
    };

    const attenuation = await readOltAttenuation(creds, onu.pon_port || '');
    
    // Ambil detail tambahan (Uptime, Distance)
    let extraDetails = {};
    try {
        extraDetails = await getOnuDetails(creds, onu.pon_port || '', onu.onu_id || '');
    } catch (e) {
        console.warn("Gagal ambil detail tambahan", e);
    }
    
    const signalValue = parseFloat(attenuation.onu_rx_power);

    // Update DB
    await prisma.oNUConfigured.update({
      where: { id: onu.id },
      data: { 
        signal: isNaN(signalValue) ? null : signalValue,
        distance: (extraDetails as any).distance || onu.distance,
        uptime: (extraDetails as any).uptime || onu.uptime,
        last_online: new Date()
      }
    });

    return NextResponse.json({ 
      success: true, 
      attenuation, 
      details: extraDetails 
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
