import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const filePath = 'SmartOLT_onus_authorizations_list_2026-07-25_06_41_51.483800.csv';
  
  if (!fs.existsSync(filePath)) {
    console.error(`File ${filePath} not found.`);
    return;
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  
  const lines = fileContent.split('\n');
  const headers = lines[0].split(',');
  const records = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Quick regex for splitting CSV by commas, ignoring commas inside quotes
    const regex = /(?:\"([^\"]*)\")|([^\,]+)/g;
    const values = [];
    let match;
    while (match = regex.exec(line)) {
      values.push(match[1] !== undefined ? match[1] : match[2]);
    }
    
    const record: any = {};
    for (let j = 0; j < Math.min(headers.length, values.length); j++) {
      const h = headers[j].trim().replace(/^"|"$/g, '');
      const v = values[j] ? values[j].trim().replace(/^"|"$/g, '') : '';
      record[h] = v;
    }
    records.push(record);
  }

  console.log(`Found ${records.length} records in the CSV.`);

  // Get the default OLT
  const olt = await prisma.oLT.findFirst();
  if (!olt) {
    console.error("No OLT found in database. Please run seed script first.");
    return;
  }

  let updated = 0;
  let created = 0;

  for (const record of records) {
    const snMac = record['SN/MAC'];
    const name = record['Location name'] || record['Name'] || '';
    
    if (!snMac) continue;

    const existing = await prisma.oNUConfigured.findUnique({
      where: { sn_mac: snMac }
    });

    if (existing) {
      await prisma.oNUConfigured.update({
        where: { id: existing.id },
        data: { name: name }
      });
      updated++;
    } else {
      // Create as offline ONU if it doesn't exist in our DB yet
      await prisma.oNUConfigured.create({
        data: {
          olt_id: olt.id,
          pon_port: 'gpon-olt_1/2/1', // default fallback port
          onu_id: '999', // dummy ID
          sn_mac: snMac,
          name: name,
          status: 'Offline',
          offline_reason: 'Not seen by hardware sync'
        }
      });
      created++;
    }
  }

  console.log(`Successfully updated ${updated} existing ONUs with correct names.`);
  console.log(`Successfully created ${created} missing ONUs as Offline.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
