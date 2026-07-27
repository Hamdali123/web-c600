import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { executeOltCommandBatch, OltCredentials, getOltPonPorts } from '@/lib/oltConnection';

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
      const livePonPorts = await getOltPonPorts(creds);
      
      const commands = ['configure terminal'];
      for (const port of livePonPorts) {
         if (port.name) {
             const zteName = port.name.replace('gpon_olt-', 'gpon-olt_');
             commands.push(`interface ${zteName}`);
             commands.push('no shutdown');
             commands.push('exit');
         }
      }
      
      if (commands.length > 1) {
         await executeOltCommandBatch(creds, commands);
      }
      return NextResponse.json({ success: true, message: 'All active PON ports have been enabled.' });
    }
    
    return NextResponse.json({ error: 'Unsupported vendor for this action' }, { status: 400 });
  } catch (error: any) {
    console.error(`Enable all PON ports failed:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
