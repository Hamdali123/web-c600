import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { executeOltCommand, saveConfig, OltCredentials, normalizePonPort, detectOnuType, fetchOltRunningConfig } from '@/lib/oltConnection';
import * as zteC600 from '@/lib/vendors/zte-c600';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    try {
        const onuId = parseInt(resolvedParams.id);
        if (isNaN(onuId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

        const body = await req.json();
        const { port, mode, vlans, adminState, dhcp } = body;
        
        if (!port || !mode) return NextResponse.json({ error: 'Port and mode are required' }, { status: 400 });

        const onu = await prisma.oNUConfigured.findUnique({
            where: { id: onuId },
            include: { olt: true, onu_type: true }
        });

        if (!onu) return NextResponse.json({ error: 'ONU not found' }, { status: 404 });

        const creds: OltCredentials = {
            ip: onu.olt.ip_address,
            port: onu.olt.telnet_port || 23,
            username: onu.olt.telnet_user || '',
            password: onu.olt.telnet_pass || '',
            protocol: (onu.olt.protocol as any) || 'telnet',
            vendor: (onu.olt.vendor as any) || 'zte'
        };

        const onuInterface = creds.vendor === 'zte' 
            ? `${normalizePonPort(onu.pon_port || '')}:${onu.onu_id}`
            : onu.pon_port || '';

        let output = '';
        if (creds.vendor === 'zte') {
            // The OLT is the source of truth for UNI naming (eth_1/x vs eth_0/x):
            // the DB onu_type is often wrong (e.g. 'HG8242H' while the ONU is
            // actually registered as type ALL). Ask the physical OLT first.
            const onuType = (await detectOnuType(creds, onuInterface)) || onu.onu_type?.name || 'ALL';
            let commandList: string;
            // 'mode tag'/'mode transparent' are only accepted once the port has
            // no VLAN list, but the list on the OLT may hold VLANs the app set
            // earlier (e.g. via Trunk) that are NOT in the DB. Ask the OLT for
            // the real per-port list before switching (verified live on C600).
            if (['Access', 'LAN', 'Transparent', 'Transparent_old'].includes(mode)) {
                const rc = await fetchOltRunningConfig(creds);
                const existingList = zteC600.extractPortVlanList(rc, onuInterface, zteC600.toZtePort(port, onuType));
                commandList = zteC600.updateEthPortCommand(onuInterface, port, mode, vlans || '', adminState, dhcp, onuType, existingList);
            } else {
                commandList = zteC600.updateEthPortCommand(onuInterface, port, mode, vlans || '', adminState, dhcp, onuType, onu.vlan || '');
            }
            output = await executeOltCommand(creds, commandList, { failOnError: true });
            await saveConfig(creds);
        } else {
            // Huawei logic here later
            output = 'Huawei not yet implemented for port mode';
        }

        await prisma.activityLog.create({
            data: {
                action: 'Configure Ethernet Port',
                details: `Configured ${port} to ${mode} on ONU ${onu.sn_mac}. Result: ${output.substring(0, 50)}...`
            }
        });

        return NextResponse.json({ success: true, message: 'Ethernet port configured', result: output });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
    }
}
