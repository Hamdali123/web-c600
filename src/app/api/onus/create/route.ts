import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizeOnu, getOnuStateOnPort, pickFreeOnuId, saveConfig, OltCredentials } from '@/lib/oltConnection';
import { logActivity } from '@/lib/activityLogger';

function sanitizeCliValue(value: string): string {
  return (value || '').replace(/[\r\n"]/g, '').trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      sn, name, vlan, mode, pppoeUser, pppoePass, 
      onuTypeId, zoneId, odbId, profileId,
      oltId, portInfo, onuId,
      contact, notes, wan_mode
    } = body;
    // The offline authorization page sends snake_case onu_id — accept both.
    const requestedOnuId = onuId || body.onu_id || '';
    const presetId = body.presetId;

    if (!sn || !name || !vlan || !oltId) {
      return NextResponse.json({ success: false, error: 'Missing required fields (SN, Name, VLAN, OLT all required)' }, { status: 400 });
    }

    const olt = await prisma.oLTDevice.findUnique({ where: { id: parseInt(oltId) } });
    if (!olt) return NextResponse.json({ success: false, error: 'OLT not found' }, { status: 404 });

    // Apply auth-preset defaults when a preset was selected (unconfigured page)
    let preset = null;
    if (presetId) {
      preset = await prisma.authPreset.findUnique({ where: { id: parseInt(presetId) } });
    }
    const effectiveOnuTypeId = onuTypeId || preset?.onu_type_id || null;
    const effectiveProfileId = profileId || body.download_speed || body.upload_speed || preset?.profile_id || null;
    const effectiveZoneId = zoneId || preset?.zone_id || null;
    const effectiveOdbId = odbId || preset?.odb_id || null;
    const effectiveVlan = vlan || preset?.vlan || '';
    const effectiveMode = mode || (preset?.mode === 'Routing' ? 'route' : 'bridge');

    const onuType = effectiveOnuTypeId ? await prisma.oNUType.findUnique({ where: { id: parseInt(effectiveOnuTypeId) } }) : null;
    const speedProfile = effectiveProfileId ? await prisma.speedProfile.findUnique({ where: { id: parseInt(effectiveProfileId) } }) : null;

    // Check if ONU already exists to prevent unique constraint error
    const existingOnu = await prisma.oNUConfigured.findUnique({ where: { sn_mac: sn } });
    if (existingOnu) {
      return NextResponse.json({ success: false, error: `ONU with SN ${sn} is already configured.` }, { status: 400 });
    }

    const creds: OltCredentials = {
      ip: olt.ip_address,
      port: olt.telnet_port || (olt.protocol === 'ssh' ? 22 : 23),
      username: olt.telnet_user || '',
      password: olt.telnet_pass || '',
      protocol: (olt.protocol as any) || 'telnet',
      vendor: (olt.vendor as any) || 'zte'
    };

    // Pick ONU id: prefer the REAL free id on the physical OLT (DB ids drift from
    // the hardware, e.g. deleted/duplicated records → '%Error 222391: The entry is
    // existed' on the OLT). Fall back to DB-based counting if the OLT scan fails.
    let finalOnuId = (requestedOnuId && requestedOnuId !== 'null') ? String(requestedOnuId) : '';

    // Normalize PON port: the offline page sends "1/1" (no gpon_olt- prefix) —
    // make sure the CLI and DB always use the canonical gpon_olt-1/1/1 form.
    // (matching card/port numbers are expanded later by autoDiscovery/pon scan)
    let canonicalPort = (portInfo || '').trim();
    if (canonicalPort && !/^gpon[-_]?olt[-_]?/i.test(canonicalPort)) {
      canonicalPort = canonicalPort.startsWith('epon') ? `epon_olt-${canonicalPort}` : `gpon_olt-${canonicalPort}`;
    }

    if (!finalOnuId) {
      const physicalEntries = await getOnuStateOnPort(creds, canonicalPort);
      const physicalFreeId = pickFreeOnuId(physicalEntries);
      if (physicalFreeId !== null) {
        finalOnuId = String(physicalFreeId);
      } else {
        const existingOnus = await prisma.oNUConfigured.findMany({
          where: { olt_id: parseInt(oltId), pon_port: canonicalPort },
          select: { onu_id: true }
        });
        const usedIds = existingOnus.map(o => parseInt(o.onu_id || '0')).filter(n => !isNaN(n));
        let nextId = 1;
        while (usedIds.includes(nextId)) {
          nextId++;
        }
        finalOnuId = nextId.toString();
      }
    }

    // 1. Execute CLI Command — authorizing now FAILS LOUDLY when the OLT rejects
    // any line with %Error (e.g. SN already registered, ONU id taken, missing
    // vlan-profile). No DB record is created unless the physical config applied.
    let cliResult: string;
    try {
      cliResult = await authorizeOnu(creds, {
        sn: sanitizeCliValue(sn),
        portInfo: canonicalPort,
        onuId: finalOnuId,
        onuType: onuType?.name,
        vlan: effectiveVlan,
        name: sanitizeCliValue(name),
        mode: effectiveMode === 'bridge' ? 'bridge' : 'route',
        pppoeUser: sanitizeCliValue(pppoeUser || ''),
        pppoePass: sanitizeCliValue(pppoePass || ''),
        profileName: speedProfile?.name
      });
    } catch (e: any) {
      await logActivity('Authorize ONU', `OLT rejected config for SN ${sn} (${e.message})`, 'Error');
      return NextResponse.json({
        success: false,
        error: `OLT menolak konfigurasi: ${e.message}`
      }, { status: 400 });
    }

    // 2. Persist the config to the OLT's startup config (like the licensed tool does)
    try {
      await saveConfig(creds);
    } catch (e) {
      console.warn('Authorize succeeded but save-config failed:', e);
    }

    // 3. Verify the physical registration actually took effect
    const verifiedEntries = await getOnuStateOnPort(creds, canonicalPort);
    const registered = verifiedEntries.find(e => e.onuId === finalOnuId);
    const physicalState = registered ? `${registered.adminState}/${registered.phase}` : 'not-found';

    // 4. Save to Database (only reached when the physical OLT accepted the config)
    const newOnu = await prisma.oNUConfigured.create({
      data: {
        sn_mac: sn,
        name: name,
        olt_id: parseInt(oltId),
        pon_port: canonicalPort,
        onu_id: finalOnuId,
        vlan: String(effectiveVlan),
        mode: effectiveMode,
        pppoe_user: pppoeUser,
        pppoe_pass: pppoePass,
        onu_type_id: effectiveOnuTypeId ? parseInt(effectiveOnuTypeId) : null,
        zone_id: effectiveZoneId ? parseInt(effectiveZoneId) : null,
        odb_id: effectiveOdbId ? parseInt(effectiveOdbId) : null,
        profile_id: effectiveProfileId ? parseInt(effectiveProfileId) : null,
        status: physicalState.startsWith('enable/working')
          ? 'Online'
          : (body.isOffline ? 'Offline' : 'Online'),
        contact: contact,
        notes: notes,
        wan_mode: wan_mode || 'PPPoE'
      }
    });

    await prisma.oNUUnconfigured.deleteMany({ where: { sn_mac: sn } });

    await logActivity('Authorize ONU', `Authorized SN: ${sn}, Name: ${name} (onu ${finalOnuId}, state ${physicalState})`, 'Success');

    return NextResponse.json({
      success: true,
      data: newOnu,
      onu_id: finalOnuId,
      physical_state: physicalState,
      cli: cliResult
    });

  } catch (error: any) {
    console.error('ONU creation error:', error);
    await logActivity('Authorize ONU', `Error: ${error.message}`, 'Error');
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}