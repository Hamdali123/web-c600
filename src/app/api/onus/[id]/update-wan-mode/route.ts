import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { executeOltCommand, OltCredentials } from '@/lib/oltConnection';
import * as zteC600 from '@/lib/vendors/zte-c600';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const onuId = parseInt(resolvedParams.id);
        if (isNaN(onuId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

        const body = await req.json();
        const { vlan, mode, wan_mode, dhcp } = body;
        
        if (!mode) return NextResponse.json({ error: 'Mode is required' }, { status: 400 });

        const onu = await prisma.oNUConfigured.findUnique({
            where: { id: onuId },
            include: { olt: true }
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
        
        let output = '';
        if (creds.vendor === 'zte') {
            const commandList = zteC600.updateServiceCommand({
                portInfo: onu.pon_port || '',
                onuId: onu.onu_id || '',
                vlans: String(targetVlan),
                mode: mode,
                pppoeUser: onu.pppoe_user || '',
                pppoePass: onu.pppoe_pass || ''
            });
            output = await executeOltCommand(creds, commandList);
        }

        // Update database
        await prisma.oNUConfigured.update({
            where: { id: onuId },
            data: { 
                mode: mode,
                vlan: String(targetVlan),
                wan_mode: dhcp === 'Enable' ? 'DHCP' : wan_mode // Simplified for now
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
