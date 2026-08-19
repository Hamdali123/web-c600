import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { readOltAttenuation, OltCredentials, getOnuDetails, normalizePonPort } from '@/lib/oltConnection';

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
      port: onu.olt.telnet_port || 23,
      username: onu.olt.telnet_user || '',
      password: onu.olt.telnet_pass || '',
      protocol: (onu.olt.protocol?.toLowerCase() as 'ssh' | 'telnet') || 'telnet',
      vendor: (onu.olt.vendor?.toLowerCase() as 'zte' | 'huawei') || 'zte'
    };

    const onuInterface = creds.vendor === 'zte'
      ? `${normalizePonPort(onu.pon_port || '')}:${onu.onu_id}`
      : `gpon-onu_${normalizePonPort(onu.pon_port || '').replace('gpon_onu-', '')}:${onu.onu_id}`;
    const attenuation = await readOltAttenuation(creds, onuInterface);
    
    // Ambil detail tambahan (Uptime, Distance)
    let extraDetails = {};
    try {
        extraDetails = await getOnuDetails(creds, onuInterface, onu.onu_id || '');
    } catch (e) {
        console.warn("Gagal ambil detail tambahan", e);
    }
    
    const signalValue = parseFloat(attenuation.onu_rx_power);
    const oltSignalValue = parseFloat(attenuation.olt_rx_power);

    // Sync the status field with the physical OLT state
    const noSignal = (attenuation as any).no_signal;
    const isOnline = !noSignal && !isNaN(signalValue);

    // Update DB (last_online only advances when the ONU is actually reachable,
    // so the UI can show a truthful "offline since" duration)
    await prisma.oNUConfigured.update({
      where: { id: onu.id },
      data: { 
        signal: isNaN(signalValue) ? null : signalValue,
        signal_tx: isNaN(oltSignalValue) ? null : oltSignalValue,
        distance: (extraDetails as any).distance || onu.distance,
        uptime: (extraDetails as any).uptime || onu.uptime,
        last_online: isOnline ? new Date() : onu.last_online,
        status: isOnline ? 'Online' : 'Offline',
        offline_reason: isOnline ? null : (onu.offline_reason || 'los')
      }
    });

    // Store signal history sample when the ONU is reachable
    if (isOnline && !isNaN(signalValue)) {
      try {
        await prisma.signalHistory.create({
          data: { onu_id: onu.id, signal: signalValue }
        });
      } catch (e) {
        console.warn('Failed to save signal history', e);
      }
    }

    return NextResponse.json({ 
      success: true, 
      attenuation, 
      details: extraDetails,
      status: isOnline ? 'Online' : 'Offline'
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
