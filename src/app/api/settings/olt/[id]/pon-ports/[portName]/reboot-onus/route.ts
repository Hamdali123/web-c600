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
       // Typically to reboot all ONUs on a port: `pon-onu-mng gpon_onu-1/1/1:* reboot` but we might need to iterate.
       // A safer approach if the wildcard doesn't work is to get the onus for this port from DB and loop,
       // but for ZTE C600, `pon-onu-mng gpon_onu-1/1/1:*` is often NOT supported. 
       // Let's iterate via DB since it's safer and we know the exact ONUs.
       
       const onus = await prisma.oNUConfigured.findMany({
          where: { olt_id: oltId, pon_port: decodedPortName }
       });
       
       if (onus.length === 0) {
          return NextResponse.json({ success: true, message: 'No configured ONUs found on this port.' });
       }
       
       const { executeOltCommandBatch } = await import('@/lib/oltConnection');
       const commands = [];
       
       for (const onu of onus) {
          const interfacePort = onu.pon_port.replace('gpon-olt_', 'gpon_onu-').replace('gpon_olt-', 'gpon_onu-');
          commands.push(`pon-onu-mng ${interfacePort}:${onu.onu_id}`);
          commands.push('reboot');
          commands.push('yes');
          commands.push('exit');
       }
       
       if (commands.length > 0) {
          await executeOltCommandBatch(creds, commands);
       }
       
       return NextResponse.json({ success: true, message: `Initiated reboot for ${onus.length} ONUs on port ${decodedPortName}.` });
    }
    
    return NextResponse.json({ error: 'Unsupported vendor for this action' }, { status: 400 });
  } catch (error: any) {
    console.error(`Reboot ONUs on port failed:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
