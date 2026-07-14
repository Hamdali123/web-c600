import { PrismaClient } from '@prisma/client';
import { executeOltCommand, OltCredentials } from './src/lib/oltConnection';

const prisma = new PrismaClient();

async function main() {
  const olts = await prisma.oLTDevice.findMany();
  if (olts.length === 0) return;

  const olt = olts[0];
  const creds: OltCredentials = {
    ip: olt.ip_address,
    port: olt.telnet_port || 23,
    username: olt.telnet_user || '',
    password: olt.telnet_pass || '',
    protocol: (olt.protocol as any) || 'telnet',
    vendor: (olt.vendor as any) || 'zte'
  };

  console.log(`Connecting to OLT...`);
  try {
    const stateOutput = await executeOltCommand(creds, 'show gpon onu state');
    const stateLines = stateOutput.split('\n');
    console.log(`Fetched state output. Parsing...`);

    const configuredOnus = await prisma.oNUConfigured.findMany({ where: { olt_id: olt.id } });
    console.log(`Found ${configuredOnus.length} configured ONUs in DB.`);

    let onlineCount = 0;
    let offlineCount = 0;

    for (const onu of configuredOnus) {
      const portNumber = (onu.pon_port || '').replace('gpon-olt_', '');
      const targetIndex = `${portNumber}:${onu.onu_id}`;

      let state = 'offline';
      for (const line of stateLines) {
        const trimmed = line.trim();
        if (trimmed.startsWith(targetIndex + ' ') || trimmed.startsWith(targetIndex + '\t')) {
          const parts = trimmed.split(/\s+/);
          if (parts.length >= 4) {
            state = parts[3].toLowerCase();
          }
          break;
        }
      }

      const status = state === 'working' ? 'Online' : 'Offline';
      const reason = state !== 'working' ? state : null;

      if (status === 'Online') {
        onlineCount++;
      } else {
        offlineCount++;
      }

      await prisma.oNUConfigured.update({
        where: { id: onu.id },
        data: {
          status: status,
          offline_reason: reason === 'working' ? null : reason
        }
      });
    }

    console.log(`Finished! Status updated: ${onlineCount} Online, ${offlineCount} Offline.`);
  } catch (e: any) {
    console.error("Error during manual status sync:", e);
  }
}

main().finally(() => prisma.$disconnect());
