import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { executeOltCommand, saveConfig, OltCredentials, normalizePonPort, detectOnuType } from '@/lib/oltConnection';
import * as zteC600 from '@/lib/vendors/zte-c600';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    try {
        const onuId = parseInt(resolvedParams.id);
        if (isNaN(onuId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

        const body = await req.json();
        const { port, mode, adminState, ssid, action } = body;
        
        if (!port) return NextResponse.json({ error: 'Port is required' }, { status: 400 });

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
            const onuType = onu.onu_type?.name || (await detectOnuType(creds, onuInterface)) || 'ALL';
            const commandList = zteC600.updateWifiPortCommand(onuInterface, port, mode, adminState, ssid, action, onuType);
            output = await executeOltCommand(creds, commandList, { failOnError: true });
            await saveConfig(creds);
        } else {
            // Huawei logic here later
            output = 'Huawei not yet implemented for wifi port';
        }

        await prisma.activityLog.create({
            data: {
                action: 'Configure WiFi Port',
                details: `Configured ${port} on ONU ${onu.sn_mac}. Result: ${output.substring(0, 50)}...`
            }
        });

        return NextResponse.json({ success: true, message: 'WiFi port configured', result: output });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
    }
}
