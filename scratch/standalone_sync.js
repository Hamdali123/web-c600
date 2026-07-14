const { PrismaClient } = require('@prisma/client');
const { Client } = require('ssh2');
const { Telnet } = require('telnet-client');

const prisma = new PrismaClient();

async function executeCommand(creds, command) {
    const connection = new Telnet();
    try {
        await connection.connect({
            host: creds.ip, port: creds.port || 23, timeout: 30000,
            negotiationMandatory: false, disableLogon: true
        });

        const promptRegex = /[#>]\s*$/i;
        await connection.send('\n', { waitFor: /name[: ]*$|username[: ]*$/i, timeout: 5000 }).catch(() => null);
        await connection.send(creds.username || '', { waitFor: /password[: ]*$/i, timeout: 5000 });
        await connection.send(creds.password || '', { waitFor: promptRegex, timeout: 10000 });
        
        try { await connection.send('terminal length 0', { waitFor: promptRegex, timeout: 5000 }); } catch (e) {}

        const lines = command.trim().split('\n');
        let totalOutput = '';
        for (const line of lines) {
            const res = await connection.send(line, { waitFor: promptRegex, timeout: 45000 });
            totalOutput += res + '\n';
        }
        
        try { await connection.send('exit', { waitFor: /closed/i, timeout: 2000 }); } catch(e) {}
        await connection.destroy();
        return totalOutput;
    } catch(e) {
        try { await connection.destroy(); } catch(err) {}
        throw e;
    }
}

async function main() {
    const olt = await prisma.oLTDevice.findFirst({});
    const creds = {
        ip: olt.ip_address, port: olt.telnet_port || 23,
        username: olt.telnet_user || '', password: olt.telnet_pass || ''
    };

    const onus = await prisma.oNUConfigured.findMany({
        where: { olt_id: olt.id, name: { startsWith: 'ONU-' } }
    });

    console.log(`Processing ${onus.length} ONUs...`);
    const batchSize = 10;
    let updatedCount = 0;

    for (let i = 0; i < onus.length; i += batchSize) {
        const batch = onus.slice(i, i + batchSize);
        const commands = batch.map(onu => {
            const portNumber = onu.pon_port.replace('gpon-olt_', '');
            return `show gpon onu detail-info gpon_onu-${portNumber}:${onu.onu_id}`;
        });

        const output = await executeCommand(creds, commands.join('\n'));
        const lines = output.split('\n');
        
        let currentInterface = '';
        let currentName = '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('ONU interface:')) {
                currentInterface = trimmed.substring(trimmed.indexOf(':') + 1).trim(); 
            } else if (trimmed.startsWith('Name:')) {
                const match = line.match(/Name:\s+(.+)/i);
                if (match && !match[1].includes('********')) currentName = match[1].trim();
            } else if (trimmed.startsWith('Description:')) {
                const match = line.match(/Description:\s+(.+)/i);
                if (match && !currentName && !match[1].includes('********')) currentName = match[1].trim();
            } else if (trimmed.startsWith('Serial number:') && currentInterface) {
                const sn = trimmed.split(':')[1].trim(); 
                
                const portMatch = currentInterface.replace('gpon_onu-', '').split(':');
                if (portMatch.length === 2) {
                    const portNumber = portMatch[0];
                    const onuId = portMatch[1];
                    const ponPort = `gpon-olt_${portNumber}`;
                    
                    if (currentName && !currentName.startsWith('ONU-')) {
                        await prisma.oNUConfigured.updateMany({
                            where: { olt_id: olt.id, pon_port: ponPort, onu_id: onuId },
                            data: { name: currentName }
                        });
                        updatedCount++;
                    }
                }
                currentInterface = ''; 
                currentName = '';
            }
        }
        console.log(`Batch ${Math.floor(i/batchSize) + 1} done. Total updated: ${updatedCount}`);
    }
    console.log(`DONE! Updated ${updatedCount} names.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
