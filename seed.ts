import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { email: 'mohamadsanwani9@gmail.com' },
    update: { password: '72UubSHF4m2z', role: 'admin', status: 'Active' },
    create: { name: 'Admin', email: 'mohamadsanwani9@gmail.com', password: '72UubSHF4m2z', role: 'admin', status: 'Active' }
  });
  
  await prisma.user.upsert({
    where: { email: 'admin@smrtolt.com' },
    update: { password: 'admin123', role: 'admin', status: 'Active' },
    create: { name: 'Admin2', email: 'admin@smrtolt.com', password: 'admin123', role: 'admin', status: 'Active' }
  });

  await prisma.user.upsert({
    where: { email: 'admin@smartolt.com' },
    update: { password: 'admin123', role: 'admin', status: 'Active' },
    create: { name: 'Admin3', email: 'admin@smartolt.com', password: 'admin123', role: 'admin', status: 'Active' }
  });
  
  await prisma.oLTDevice.upsert({
    where: { id: 2 },
    update: {
      name: 'C600-SANWANI',
      ip_address: '103.68.214.225',
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
      signal_threshold: -27.0,
      manufacturer: 'ZTE',
      hardware_version: 'ZTE-C600',
      pon_types: 'GPON'
    },
    create: {
      id: 2,
      name: 'C600-SANWANI',
      ip_address: '103.68.214.225',
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
      signal_threshold: -27.0,
      manufacturer: 'ZTE',
      hardware_version: 'ZTE-C600',
      pon_types: 'GPON'
    }
  });

  console.log('User and OLT created or updated successfully');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
