import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { executeOltCommand, OltCredentials, normalizePonPort } from '@/lib/oltConnection';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const onu = await prisma.oNUConfigured.findUnique({
      where: { id: parseInt(id) },
      include: { olt: true, onu_type: true }
    });

    if (!onu || !onu.olt) {
      return NextResponse.json({ success: false, error: 'ONU or OLT not found' }, { status: 404 });
    }

    const creds: OltCredentials = {
      ip: onu.olt.ip_address,
      port: onu.olt.telnet_port || 23,
      username: onu.olt.telnet_user || '',
      password: onu.olt.telnet_pass || '',
      protocol: (onu.olt.protocol?.toLowerCase() as 'ssh' | 'telnet') || 'telnet',
      vendor: (onu.olt.manufacturer?.toLowerCase() as 'zte' | 'huawei') || 'zte'
    };

    const onuInterface = creds.vendor === 'zte' ? `${normalizePonPort(onu.pon_port || '')}:${onu.onu_id}` : '';
    let ports: any[] = [];
    let wifi: any[] = [];

    if (creds.vendor === 'zte') {
      try {
        const output = await executeOltCommand(creds, `show gpon remote-onu interface eth ${onuInterface}`);

        // Output format:
        // Interface      : eth_0/1
        // Operate status : disable
        // Admin status   : unlock
        // Speed config   : auto
        const blocks = output.split(/Interface\s*:\s*/i).filter(b => b.trim() !== '');

        ports = blocks.map(block => {
          const portMatch = block.match(/^\s*(eth_\d+\/\d+)/i);
          const opMatch = block.match(/Operate status\s*:\s*(\S+)/i);
          const adminMatch = block.match(/Admin status\s*:\s*(\S+)/i);
          const speedMatch = block.match(/Speed config\s*:\s*(\S+)/i);

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

      // WiFi ports — real data from the OLT (interface names wifi_0/x)
      const onuType = onu.onu_type?.name || '';
      const wifiPorts = onuType.toLowerCase().includes('f601') ? 0
        : onuType.toLowerCase().includes('f640') ? 0
        : 4;
      try {
        const wifiOutput = await executeOltCommand(creds, `show gpon remote-onu interface wifi ${onuInterface}`);
        const wifiBlocks = wifiOutput.split(/Interface\s*:\s*/i).filter(b => b.trim() !== '');
        wifi = wifiBlocks.map(block => {
          const portMatch = block.match(/^\s*(wifi_\d+\/\d+)/i);
          const adminMatch = block.match(/Admin status\s*:\s*(\S+)/i);
          const opMatch = block.match(/Operate status\s*:\s*(\S+)/i);
          if (!portMatch) return null;
          return {
            port: portMatch[1].replace('wifi_0/', 'wifi_1/'), // Normalize to wifi_1/x for UI
            adminState: adminMatch && adminMatch[1] === 'unlock' ? 'Enabled' : 'Shutdown',
            operateState: opMatch ? opMatch[1] : 'unknown',
            mode: 'LAN',
            ssid: '',
            dhcp: 'No control'
          };
        }).filter(Boolean).slice(0, wifiPorts || 4);
      } catch (e) {
        console.error("Failed to fetch wifi ports", e);
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
    if (wifi.length === 0) {
      wifi = [1, 2].map(i => ({
        port: `wifi_1/${i}`,
        adminState: 'Enabled',
        operateState: 'unknown',
        mode: 'LAN',
        ssid: '',
        dhcp: 'No control'
      }));
    }

    return NextResponse.json({ success: true, ports, wifi });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}