import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const csvData = fs.readFileSync('/home/sanwanay/Downloads/SmartOLT_onus_list_2026-06-29_08_07_53.923015.csv', 'utf-8');
    const lines = csvData.split('\n');
    let updated = 0;
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const cols = [];
        let current = '';
        let inQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
            if (line[j] === '"') {
                inQuotes = !inQuotes;
            } else if (line[j] === ',' && !inQuotes) {
                cols.push(current);
                current = '';
            } else {
                current += line[j];
            }
        }
        cols.push(current);
        
        const sn_mac = cols[2];
        const name = cols[4];
        const vlan = cols[33]; // Service port VLAN is column 33 (0-indexed)
        
        if (sn_mac && sn_mac !== 'SN') {
            try {
                await prisma.oNUConfigured.updateMany({
                    where: { sn_mac: sn_mac },
                    data: { name: name, vlan: vlan }
                });
                updated++;
            } catch (e) {
                console.error("Error updating", sn_mac, e);
            }
        }
    }
    console.log(`Finished updating ${updated} records from CSV.`);
}

main().finally(() => prisma.$disconnect());
