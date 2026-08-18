import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { executeOltCommand, OltCredentials } from '@/lib/oltConnection';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string, portName: string }> }
) {
  try {
    const { id, portName } = await params;
    const oltId = parseInt(id);
    const decodedPortName = decodeURIComponent(portName);

    const body = await request.json();
    const { adminState, description, minRange, maxRange } = body;

    const olt = await prisma.oLTDevice.findUnique({
      where: { id: oltId }
    });

    if (!olt) return NextResponse.json({ error: 'OLT not found' }, { status: 404 });

    const creds: OltCredentials = {
      ip: olt.ip_address,
      port: olt.telnet_port,
      username: olt.telnet_user || '',
      password: olt.telnet_pass || '',
      protocol: (olt.protocol as any) || 'telnet',
      vendor: (olt.vendor as any) || 'zte'
    };

    if (creds.vendor === 'zte') {
       const { updatePonPortCommand } = await import('@/lib/vendors/zte-c600');
       const script = updatePonPortCommand(decodedPortName, adminState, description, minRange, maxRange);
       await executeOltCommand(creds, script, { failOnError: true });
       return NextResponse.json({ success: true, message: `PON port ${decodedPortName} updated successfully.` });
    }
    
    return NextResponse.json({ error: 'Unsupported vendor for this action' }, { status: 400 });
  } catch (error: any) {
    console.error(`Update PON port failed:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
