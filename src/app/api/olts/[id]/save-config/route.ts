import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/activityLogger';
import { executeOltCommand } from '@/lib/oltConnection';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const oltId = parseInt(id);

    const olt = await prisma.oLTDevice.findUnique({
      where: { id: oltId }
    });

    if (!olt) return NextResponse.json({ success: false, error: 'OLT not found' }, { status: 404 });

    const command = olt.manufacturer?.toLowerCase() === 'zte' ? 'write' : 'save';
    
    await executeOltCommand({
      ip: olt.ip_address,
      port: olt.telnet_port,
      username: olt.telnet_user || '',
      password: olt.telnet_pass || '',
      protocol: (olt.protocol as any) || 'telnet',
      vendor: (olt.vendor as any) || 'zte'
    }, command);

    await logActivity('Save OLT Config', `Saved configuration on OLT: ${olt.name}`, 'Success');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
