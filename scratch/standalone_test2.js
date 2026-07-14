const { PrismaClient } = require('@prisma/client');
const { Telnet } = require('telnet-client');
const prisma = new PrismaClient();

async function main() {
    const olt = await prisma.oLTDevice.findFirst({});
    const creds = { ip: olt.ip_address, port: olt.telnet_port || 23, username: olt.telnet_user || '', password: olt.telnet_pass || '' };

    const connection = new Telnet();
    await connection.connect({ host: creds.ip, port: creds.port, timeout: 30000, negotiationMandatory: false, disableLogon: true });
    
    const promptRegex = /[#>]\s*$/i;
    await connection.send('\n', { waitFor: /name[: ]*$|username[: ]*$/i, timeout: 5000 }).catch(() => null);
    await connection.send(creds.username, { waitFor: /password[: ]*$/i, timeout: 5000 });
    await connection.send(creds.password, { waitFor: promptRegex, timeout: 10000 });
    try { await connection.send('terminal length 0', { waitFor: promptRegex, timeout: 5000 }); } catch (e) {}

    const res = await connection.send('show gpon onu detail-info gpon_onu-1/2/3:32', { waitFor: promptRegex, timeout: 15000 });
    console.log(res);
    await connection.destroy();
}
main().catch(console.error).finally(() => prisma.$disconnect());
