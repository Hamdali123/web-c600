const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function main() {
    const fetch = require('node-fetch');
    // I can't use node-fetch if it's ESM, but I can use standard fetch if node v18+
    const res = await fetch('http://localhost:3009/api/test_olt_help');
    console.log(await res.text());
}

main().catch(console.error).finally(() => prisma.$disconnect());
