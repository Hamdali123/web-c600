import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding SmartOLT Settings Database...');

  // 1. OLT
  let olt = await prisma.oLTDevice.findFirst();
  if (!olt) {
    olt = await prisma.oLTDevice.create({
      data: {
        name: 'OLT-ZTE-C600-Main',
        ip_address: '192.168.1.100',
        telnet_user: 'admin',
        telnet_pass: 'admin',
        
        
        vendor: 'zte'
      }
    });
    console.log('Created Default OLT');
  }

  // 2. VLANs
  const vlans = [
    { vlan_id: 100, description: 'Management', type: 'Management' },
    { vlan_id: 110, description: 'PPPoE Client 1', type: 'Residential' },
    { vlan_id: 120, description: 'PPPoE Client 2', type: 'Residential' },
    { vlan_id: 125, description: 'Hotspot', type: 'Residential' }
  ];

  for (const v of vlans) {
    const exists = await prisma.vLAN.findFirst({ where: { vlan_id: v.vlan_id } });
    if (!exists) {
      await prisma.vLAN.create({
        data: { ...v, olt_id: olt.id }
      });
      console.log(`Created VLAN ${v.vlan_id}`);
    }
  }

  // 3. Speed Profiles
  const profiles = [
    { name: '10M_UNLIMITED', upload: 10000, download: 10000 },
    { name: '20M_UNLIMITED', upload: 20000, download: 20000 },
    { name: '50M_UNLIMITED', upload: 50000, download: 50000 },
    { name: '100M_UNLIMITED', upload: 100000, download: 100000 }
  ];

  for (const p of profiles) {
    const exists = await prisma.speedProfile.findFirst({ where: { name: p.name } });
    if (!exists) {
      await prisma.speedProfile.create({ data: p });
      console.log(`Created SpeedProfile ${p.name}`);
    }
  }

  // 4. ONU Types (Merek ONU)
  const onuTypes = [
    { name: 'ZTE-F609', pon_type: 'GPON', capability: 'Bridging/Routing', eth_ports: 4, wifi_ssids: 4, pots_ports: 1, catv: false },
    { name: 'ZTE-F660', pon_type: 'GPON', capability: 'Bridging/Routing', eth_ports: 4, wifi_ssids: 4, pots_ports: 2, catv: false },
    { name: 'ZTE-F670L', pon_type: 'GPON', capability: 'Bridging/Routing', eth_ports: 4, wifi_ssids: 4, pots_ports: 1, catv: false },
    { name: 'Huawei-HG8245H', pon_type: 'GPON', capability: 'Bridging/Routing', eth_ports: 4, wifi_ssids: 4, pots_ports: 2, catv: false },
    { name: 'Generic-1GE', pon_type: 'GPON', capability: 'Bridging', eth_ports: 1, wifi_ssids: 0, pots_ports: 0, catv: false }
  ];

  for (const t of onuTypes) {
    const exists = await prisma.oNUType.findFirst({ where: { name: t.name } });
    if (!exists) {
      await prisma.oNUType.create({ data: t });
      console.log(`Created ONUType ${t.name}`);
    }
  }

  // 5. TR069 / GenieACS
  const tr069 = await prisma.tR069Profile.findFirst({ where: { name: 'GenieACS-Main' } });
  if (!tr069) {
    await prisma.tR069Profile.create({
      data: {
        name: 'GenieACS-Main',
        acs_url: 'http://genieacs.local:7547'
      }
    });
    console.log('Created TR069 Profile for GenieACS');
  }

  console.log('Seeding completed successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
