import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addOlt() {
  try {
    const olt = await prisma.oLTDevice.create({
      data: {
        name: 'C600-SANWANI',
        ip_address: '103.68.214.171',
        telnet_port: 2334,
        telnet_user: 'sanwanay',
        telnet_pass: '1Sampai9',
        protocol: 'telnet',
        vendor: 'zte',
        snmp_ro: 'aT5jhAyeqxw8',
        snmp_rw: '0emuSUphl3yq',
        snmp_port: 2162,
        snmp_version: 'v2c',
        timeout: 10,
        signal_threshold: -27,
        manufacturer: 'ZTE',
        hardware_version: 'ZTE-C600',
        pon_types: 'GPON',
        cpu_load: 0,
        memory_load: 0,
        temperature: 0,
        last_polled: new Date()
      }
    });
    console.log('Successfully added OLT:', olt);
  } catch (err) {
    console.error('Error adding OLT:', err);
  } finally {
    await prisma.$disconnect();
  }
}

addOlt();
