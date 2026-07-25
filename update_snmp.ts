import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Updating OLT ID 5...');
  
  const updatedOlt = await prisma.oLTDevice.update({
    where: { id: 5 },
    data: {
      snmp_port: 2162,
      snmp_ro: 'rahasia_ro',
      snmp_rw: 'rahasia_rw'
    }
  });

  console.log('Update Success!');
  console.log('New SNMP Settings:', {
    port: updatedOlt.snmp_port,
    ro: updatedOlt.snmp_ro,
    rw: updatedOlt.snmp_rw
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
