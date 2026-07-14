import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const onus = await prisma.oNUConfigured.findMany();
  
  for (let i = 0; i < onus.length; i++) {
    const onu = onus[i];
    
    // Simulate real SmartOLT data parsing
    let mode = 'route';
    let vlanStr = '125';
    
    if (i % 4 === 0) {
      mode = 'bridge';
      vlanStr = '1000, 125';
    } else if (i % 3 === 0) {
      mode = 'bridge';
      vlanStr = '1000';
    } else if (i % 2 === 0) {
      mode = 'route';
      vlanStr = '1000';
    }
    
    await prisma.oNUConfigured.update({
      where: { id: onu.id },
      data: {
        mode: mode,
        vlan: vlanStr,
      }
    });
  }
  console.log("Updated ONUs with VLAN strings and modes.");
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
