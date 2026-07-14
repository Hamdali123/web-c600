const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function main() {
    const lines = fs.readFileSync('/home/sanwanay/Downloads/SmartOLT_onus_list_2026-06-18_06_37_05.082413.csv', 'utf8').split('\n').filter(l => l.trim() !== '');
    const header = lines[0].split(',').map(h => h.replace(/^"|"$/g, ''));
    
    const snIndex = header.indexOf('SN');
    const nameIndex = header.indexOf('Name');

    if (snIndex === -1 || nameIndex === -1) {
        console.error("Missing SN or Name column");
        return;
    }

    let updated = 0;
    for (let i = 1; i < lines.length; i++) {
        // use regex to split by comma outside quotes
        const cols = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
        const sn = cols[snIndex];
        const name = cols[nameIndex];

        if (sn && name) {
            await prisma.oNUConfigured.updateMany({
                where: { sn_mac: sn },
                data: { name: name }
            });
            updated++;
        }
    }
    console.log(`Successfully updated ${updated} names from CSV!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
