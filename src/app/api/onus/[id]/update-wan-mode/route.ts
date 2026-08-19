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
        const { vlan, mode, dhcp, wanIpSource, wanIpv4, wanMask, wanGw, wanDns1, wanDns2, wanUser, wanPass, wanRemote } = body;
        
        if (!mode) return NextResponse.json({ error: 'Mode is required' }, { status: 400 });

        const onu = await prisma.oNUConfigured.findUnique({
            where: { id: onuId },
            include: { olt: true, onu_type: true }
        });

        if (!onu) return NextResponse.json({ error: 'ONU not found' }, { status: 404 });

        // Build credential object
        const creds: OltCredentials = {
            ip: onu.olt.ip_address,
            port: onu.olt.telnet_port || 23,
            username: onu.olt.telnet_user || '',
            password: onu.olt.telnet_pass || '',
            protocol: (onu.olt.protocol as any) || 'telnet',
            vendor: (onu.olt.vendor as any) || 'zte'
        };

        const targetVlan = vlan || onu.vlan;

        const onuInterface = `${normalizePonPort(onu.pon_port || '')}:${onu.onu_id}`;
        let output = '';
        if (creds.vendor === 'zte') {
            // Remove the previous service/wan entries so the new PPPoE/Static/DHCP
            // config truly replaces the old one on the OLT (idempotent). Services
            // are cleared by name (they may be named by VLAN or by index on the C600).
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
                console.warn('[update-wan-mode] cleanup failed (ignored):', cleanErr.message);
            }
            const commandList = zteC600.updateServiceCommand({
                portInfo: onu.pon_port || '',
                onuId: onu.onu_id || '',
                vlans: String(targetVlan),
                mode: mode,
                dhcp: dhcp,
                wanIpSource, wanIpv4, wanMask, wanGw, wanDns1, wanDns2,
                pppoeUser: wanUser || onu.pppoe_user || '',
                pppoePass: wanPass || onu.pppoe_pass || '',
                wanRemote,
                onuType: (await detectOnuType(creds, normalizePonPort(onu.pon_port || '') + ':' + (onu.onu_id || ''))) || onu.onu_type?.name || 'ALL'
            });
            output = await executeOltCommand(creds, commandList, { failOnError: true });
            // Persist to the running OLT config so it survives a reboot.
            await saveConfig(creds);
        }

        // Update database
        await prisma.oNUConfigured.update({
            where: { id: onuId },
            data: { 
                mode: mode,
                vlan: String(targetVlan),
                wan_mode: dhcp,
                pppoe_user: wanUser || onu.pppoe_user,
                pppoe_pass: wanPass || onu.pppoe_pass
            }
        });

        await prisma.activityLog.create({
            data: {
                action: 'Update ONU Mode',
                details: `Updated mode to ${mode} (VLAN: ${targetVlan}) for ONU ${onu.sn_mac}. Result: ${output.substring(0, 30)}...`
            }
        });

        return NextResponse.json({ success: true, message: 'ONU mode updated' });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
    }
}
