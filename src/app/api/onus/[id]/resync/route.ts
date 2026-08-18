import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizeOnu, saveConfig, executeOltCommand, OltCredentials } from '@/lib/oltConnection';
import * as zteC600 from '@/lib/vendors/zte-c600';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const onu = await prisma.oNUConfigured.findUnique({
      where: { id: parseInt(id) },
      include: { 
        olt: true,
        onu_type: true,
        profile: true
      }
    });

    if (!onu || !onu.olt) {
      return NextResponse.json({ success: false, error: 'ONU or OLT not found' }, { status: 404 });
    }

    const creds: OltCredentials = {
      ip: onu.olt.ip_address,
      port: onu.olt.telnet_port || 23,
      username: onu.olt.telnet_user || '',
      password: onu.olt.telnet_pass || '',
      protocol: (onu.olt.protocol as 'ssh' | 'telnet') || 'telnet',
      vendor: (onu.olt.vendor?.toLowerCase() as 'zte' | 'huawei') || 'zte'
    };

    try {
      const authorizeParams = {
        sn: onu.sn_mac,
        portInfo: onu.pon_port || '',
        onuId: onu.onu_id || '',
        onuType: onu.onu_type?.name || 'ZTE-F609',
        vlan: onu.vlan || '1',
        name: onu.name,
        mode: (onu.mode === 'bridge' ? 'bridge' : 'route') as 'bridge' | 'route',
        pppoeUser: onu.pppoe_user || '',
        pppoePass: onu.pppoe_pass || '',
        profileName: onu.profile?.name
      };
      let recreated = false;
      // Clear leftover OLT-side service-ports so re-adding service-ports in
      // authorizeOnuCommand is idempotent (a sport re-used with a different vlan
      // is rejected by the C600). Ignored when the ONU/vport doesn't exist yet.
      try {
        const vportIf = zteC600.vportInterface(onu.pon_port || '', onu.onu_id || '');
        const spOut = await executeOltCommand(creds, `show service-port interface ${vportIf}`);
        const sports = zteC600.parseServicePorts(spOut);
        if (sports.length > 0) {
          await executeOltCommand(creds, zteC600.clearServicePortCommand(vportIf, sports));
        }
      } catch (cleanErr: any) {
        console.warn('[resync] service-port cleanup failed (ignored):', cleanErr.message);
      }
      try {
        await authorizeOnu(creds, authorizeParams);
      } catch (e: any) {
        // Re-registering an existing ONU id is rejected by the C600 with
        // "%Error 222391: The entry is existed. This is a re-create operation."
        // In that case delete the ONU first, then re-add with the mapped type
        // (also repairs ONUs stuck registered as type ALL).
        if (/exist|re-create|recreate/i.test(e.message || '')) {
          await authorizeOnu(creds, { ...authorizeParams, recreate: true });
          recreated = true;
        } else {
          throw e;
        }
      }
      await saveConfig(creds);

      // After a recreate the ONU is registered with the mapped type on the OLT
      // (e.g. ZTE-F660 for former type-ALL registrations). Persist that type to
      // the DB so subsequent UNI-based commands (eth/wifi/vlan port) use the
      // correct port naming (eth_0/x vs eth_1/x) that matches the OLT.
      if (recreated) {
        const mappedType = zteC600.mapOnuType(authorizeParams.onuType, onu.sn_mac);
        const typeRow = await prisma.oNUType.findUnique({ where: { name: mappedType } });
        if (typeRow && typeRow.id !== onu.onu_type_id) {
          await prisma.oNUConfigured.update({
            where: { id: onu.id },
            data: { onu_type_id: typeRow.id }
          });
        }
      }
    } catch (e: any) {
      return NextResponse.json({ success: false, error: `Physical OLT rejected the config: ${e.message}` }, { status: 500 });
    }

    // Clean up unconfigured list if it was stuck there
    await prisma.oNUUnconfigured.deleteMany({ where: { sn_mac: onu.sn_mac } });


    return NextResponse.json({ success: true, message: 'Configuration successfully resynced.' });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
