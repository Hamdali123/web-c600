import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const html = fs.readFileSync('scratch/configured_page.html', 'utf-8');
  const rows = html.split('<tr class="valign-center">');
  
  let updatedCount = 0;
  
  for (const row of rows) {
    if (!row.includes('onu-list-name-col')) continue;
    
    // Extract SN
    const snRegex = /<td><span class="onu-copy-cell" data-copy="([A-Z0-9]{10,16})"/;
    const snMatch = row.match(snRegex);
    
    if (!snMatch || !snMatch[1]) continue;
    
    const sn = snMatch[1];
    
    // Extract signal
    let signalVal: number | null = null;
    const signalMatch = row.match(/id="signal_onu_\d+">\s*<div[^>]*>.*?<div[^>]*>([-\d\.]+)<div/);
    if (signalMatch && signalMatch[1]) {
        signalVal = parseFloat(signalMatch[1]);
    }

    if (signalVal !== null && !isNaN(signalVal)) {
        await prisma.oNUConfigured.updateMany({
            where: { sn_mac: sn },
            data: {
                signal: signalVal
            }
        });
        updatedCount++;
    }
  }
  
  console.log(`Successfully synced actual SIGNAL for ${updatedCount} ONUs.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
