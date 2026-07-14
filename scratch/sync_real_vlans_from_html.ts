import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const html = fs.readFileSync('scratch/configured_page.html', 'utf-8');
  const rows = html.split('<tr class="valign-center">');
  
  let updatedCount = 0;
  
  for (const row of rows) {
    if (!row.includes('onu-list-name-col')) continue;
    
    // Extract Name
    const nameMatch = row.match(/onu-list-name-text" data-copy="([^"]+)"/);
    
    // Extract SN
    const snRegex = /<td><span class="onu-copy-cell" data-copy="([A-Z0-9]{10,16})"/;
    const snMatch = row.match(snRegex);
    
    // Extract mode
    const isBridge = row.includes('label-bridge') || row.includes('>Bridge<');
    let mode = isBridge ? 'bridge' : 'route';
    
    // Extract VLAN by looking explicitly for the mode span first
    // The HTML has:
    // <td>\n  <span class="label label-info">Router</span> </td>\n <td>125</td>
    const vlanMatch = row.match(/<span class="label[^>]+>[^<]+<\/span>\s*<\/td>\s*<td>([^<]+)<\/td>/);
    let vlanStr = '1';
    if (vlanMatch && vlanMatch[1]) {
        vlanStr = vlanMatch[1].trim();
    }
    
    if (nameMatch && snMatch && snMatch[1]) {
        const sn = snMatch[1];
        
        await prisma.oNUConfigured.updateMany({
            where: { sn_mac: sn },
            data: {
                vlan: vlanStr
            }
        });
        updatedCount++;
    }
  }
  
  console.log(`Successfully synced actual VLAN for ${updatedCount} ONUs.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
