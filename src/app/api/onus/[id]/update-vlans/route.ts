import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { executeOltCommand, saveConfig, OltCredentials, normalizePonPort, detectOnuType } from '@/lib/oltConnection';
import * as zteC600 from '@/lib/vendors/zte-c600';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const onuId = parseInt(resolvedParams.id);
        if (isNaN(onuId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

        const body = await req.json();
        const { vlan } = body;
        
        if (!vlan) return NextResponse.json({ error: 'VLAN string is required' }, { status: 400 });

        const onu = await prisma.oNUConfigured.findUnique({
            where: { id: onuId },
            include: { olt: true, onu_type: true }
        });

        if (!onu) return NextResponse.json({ error: 'ONU not found' }, { status: 404 });

        // Sync with OLT
        const creds: OltCredentials = {
            ip: onu.olt.ip_address,
            port: onu.olt.telnet_port || 23,
            username: onu.olt.telnet_user || '',
            password: onu.olt.telnet_pass || '',
            protocol: (onu.olt.protocol as any) || 'telnet',
            vendor: (onu.olt.vendor as any) || 'zte'
        };

        let output = '';
        if (creds.vendor === 'zte') {
            const onuInterface = `${normalizePonPort(onu.pon_port || '')}:${onu.onu_id}`;
            // Remove old service/wan entries first (by name — the C600 names
            // services by VLAN or by index), then apply the new VLAN set.
            try {
                const svcOut = await executeOltCommand(creds, `show gpon remote-onu service ${onuInterface}`);
                const svcNames = zteC600.parseServiceNames(svcOut);
                if (svcNames.length > 0) {
                    await executeOltCommand(creds, zteC600.clearServiceCommandByName(onuInterface, svcNames));
                }
                const vportIf = zteC600.vportInterface(onu.pon_port || '', onu.onu_id || '');
                const spOut = await executeOltCommand(creds, `show service-port interface ${vportIf}`);
                const sports = zteC600.parseServicePorts(spOut);
                if (sports.length > 0) {
                    await executeOltCommand(creds, zteC600.clearServicePortCommand(vportIf, sports));
                }
            } catch (cleanErr: any) {
                console.warn('[update-vlans] cleanup failed (ignored):', cleanErr.message);
            }
            const commandList = zteC600.updateServiceCommand({
                portInfo: onu.pon_port || '',
                onuId: onu.onu_id || '',
                vlans: String(vlan),
                mode: (onu.mode as any) || 'bridge',
                pppoeUser: onu.pppoe_user || '',
                pppoePass: onu.pppoe_pass || '',
                onuType: (await detectOnuType(creds, normalizePonPort(onu.pon_port || '') + ':' + (onu.onu_id || ''))) || onu.onu_type?.name || 'ALL'
            });
            output = await executeOltCommand(creds, commandList, { failOnError: true });
            await saveConfig(creds);
        }

        // Update database
        await prisma.oNUConfigured.update({
            where: { id: onuId },
            data: { vlan: String(vlan) }
        });

        await prisma.activityLog.create({
            data: {
                action: 'Update Attached VLANs',
                details: `Updated VLANs to ${vlan} for ONU ${onu.sn_mac}. Result: ${output.substring(0, 30)}...`
            }
        });

        return NextResponse.json({ success: true, message: 'Attached VLANs updated' });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
    }
}
