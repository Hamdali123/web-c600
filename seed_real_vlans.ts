import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const olt = await prisma.oLTDevice.findFirst();
  if (!olt) return;

  await prisma.vLAN.deleteMany({});
  
  const realVlans = [1, 25, 99, 125, 323, 1000, 3000];
  for (const v of realVlans) {
    let desc = 'Unknown';
    let type = 'Management';
    if (v === 125) {
       desc = 'PPPoE Client';
       type = 'Residential';
    } else if (v === 323) {
       desc = 'Management';
    }
    await prisma.vLAN.create({
      data: { vlan_id: v, description: desc, type: type, olt_id: olt.id }
    });
  }
  console.log('Real VLANs seeded.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
