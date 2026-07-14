import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { executeOltCommand, OltCredentials } from '@/lib/oltConnection';
import * as zteC600 from '@/lib/vendors/zte-c600';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const onuId = parseInt(params.id);
        if (isNaN(onuId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

        const body = await req.json();
        const { port, mode, vlans, adminState, dhcp } = body;
        
        if (!port || !mode) return NextResponse.json({ error: 'Port and mode are required' }, { status: 400 });

        const onu = await prisma.oNUConfigured.findUnique({
            where: { id: onuId },
            include: { olt: true }
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
            ? `gpon_onu-${onu.pon_port?.replace('gpon-olt_', '')}:${onu.onu_id}`
            : onu.pon_port || '';

        let output = '';
        if (creds.vendor === 'zte') {
            const commandList = zteC600.updateEthPortCommand(onuInterface, port, mode, vlans || '', adminState, dhcp);
            output = await executeOltCommand(creds, commandList);
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

        return NextResponse.json({ success: true, message: 'Ethernet port configured' });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
    }
}
