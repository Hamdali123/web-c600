import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { executeOltCommand, saveConfig, OltCredentials } from '@/lib/oltConnection';
import * as zteC600 from '@/lib/vendors/zte-c600';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const onuId = parseInt(resolvedParams.id);
        if (isNaN(onuId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

        const body = await req.json();
        const { speedProfileId } = body;

        if (!speedProfileId) return NextResponse.json({ error: 'speedProfileId is required' }, { status: 400 });

        const onu = await prisma.oNUConfigured.findUnique({
            where: { id: onuId },
            include: { olt: true }
        });

        if (!onu) return NextResponse.json({ error: 'ONU not found' }, { status: 404 });

        const speedProfile = await prisma.speedProfile.findUnique({
            where: { id: parseInt(speedProfileId) }
        });

        if (!speedProfile) return NextResponse.json({ error: 'Speed profile not found' }, { status: 404 });

        // Build credential object
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
            const commandList = zteC600.updateSpeedProfileCommand(
                onu.pon_port || '',
                onu.onu_id || '',
                speedProfile.name,
                speedProfile.name
            );
            output = await executeOltCommand(creds, commandList, { failOnError: true });
            await saveConfig(creds);
        }

        // Update database
        await prisma.oNUConfigured.update({
            where: { id: onuId },
            data: {
                profile_id: parseInt(speedProfileId)
            }
        });

        await prisma.activityLog.create({
            data: {
                action: 'Update Speed Profile',
                details: `Updated speed profile to ${speedProfile.name} for ONU ${onu.sn_mac}. Result: ${output.substring(0, 30)}...`
            }
        });

        return NextResponse.json({ success: true, message: 'Speed profile updated' });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
    }
}
