import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { executeOltCommand, OltCredentials } from '@/lib/oltConnection';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const onu = await prisma.oNUConfigured.findUnique({
      where: { id: parseInt(id) },
      include: { olt: true }
    });

    if (!onu || !onu.olt) {
      return NextResponse.json({ success: false, error: 'ONU or OLT not found' }, { status: 404 });
    }

    const creds: OltCredentials = {
      ip: onu.olt.ip_address,
      port: 23,
      username: onu.olt.telnet_user || '',
      password: onu.olt.telnet_pass || '',
      protocol: 'telnet',
      vendor: (onu.olt.manufacturer?.toLowerCase() as 'zte' | 'huawei') || 'zte'
    };

    const onuInterface = onu.pon_port ? `${onu.pon_port.replace('olt', 'onu')}:${onu.onu_id}` : '';
    let ports: any[] = [];

    if (creds.vendor === 'zte') {
      try {
        const output = await executeOltCommand(creds, `show gpon remote-onu interface eth ${onuInterface}`);
        
        // Parsing output
        // Interface      : eth_0/1
        // Operate status : disable
        // Admin status   : unlock
        // Speed config   : auto
        const blocks = output.split(/Interface\s*:\s*/i).filter(b => b.trim() !== '');
        
        ports = blocks.map(block => {
          const portMatch = block.match(/^(eth_\d+\/\d+)/i);
          const opMatch = block.match(/Operate status\s*:\s*(\w+)/i);
          const adminMatch = block.match(/Admin status\s*:\s*(\w+)/i);
          const speedMatch = block.match(/Speed config\s*:\s*(\w+)/i);

          if (!portMatch) return null;
          
          return {
            port: portMatch[1].replace('eth_0/', 'eth_1/'), // Normalize to eth_1/x for UI
            adminState: adminMatch && adminMatch[1] === 'unlock' ? 'Enabled' : 'Shutdown',
            operateState: opMatch ? opMatch[1] : 'unknown',
            speed: speedMatch ? speedMatch[1] : 'Auto',
            mode: 'Transparent', // Default unless we parse running-config
            poe: 'N/A',
            dhcp: 'From ONU' // Default unless we parse running-config
          };
        }).filter(Boolean);
        
      } catch (e) {
        console.error("Failed to fetch eth ports", e);
      }
    }

    // Fallback if empty or failed
    if (ports.length === 0) {
      ports = [1, 2, 3, 4].map(i => ({
        port: `eth_1/${i}`,
        adminState: 'Enabled',
        operateState: 'unknown',
        speed: 'Auto',
        mode: 'Transparent',
        poe: 'N/A',
        dhcp: 'From ONU'
      }));
    }

    return NextResponse.json({ success: true, ports });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
