import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const onuId = parseInt(params.id);
        if (isNaN(onuId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

        const body = await req.json();
        const { vlan } = body;
        
        if (!vlan) return NextResponse.json({ error: 'VLAN string is required' }, { status: 400 });

        const onu = await prisma.oNUConfigured.findUnique({
            where: { id: onuId },
            include: { olt: true }
        });

        if (!onu) return NextResponse.json({ error: 'ONU not found' }, { status: 404 });

        // Update database
        await prisma.oNUConfigured.update({
            where: { id: onuId },
            data: { vlan: String(vlan) }
        });

        await prisma.activityLog.create({
            data: {
                action: 'Update Attached VLANs',
                details: `Updated VLANs to ${vlan} for ONU ${onu.sn_mac}`
            }
        });

        return NextResponse.json({ success: true, message: 'Attached VLANs updated' });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
    }
}
