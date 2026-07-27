import { Telnet } from 'telnet-client';

async function run() {
    const connection = new Telnet();
    const creds = { ip: '103.68.214.225', port: 2334, username: 'sanwanay', password: '1Sampai9' };
    
    try {
        await connection.connect({
            host: creds.ip, 
            port: creds.port, 
            timeout: 15000,
            negotiationMandatory: false,
            disableLogon: true
        });

        const promptRegex = /[#>]\s*$|\[yes\/no\]:?\s*$|\(y\/n\)\[n\]:?\s*$/i;

        try {
            await connection.send(creds.username, { waitFor: /password[: ]*$/i, timeout: 5000 });
        } catch (e) {
            await connection.send('\n', { waitFor: /name[: ]*$|username[: ]*$/i, timeout: 5000 }).catch(() => null);
            await connection.send(creds.username, { waitFor: /password[: ]*$/i, timeout: 5000 });
        }
        
        await connection.send(creds.password, { waitFor: promptRegex, timeout: 10000 });
        await connection.send('terminal length 0', { waitFor: promptRegex, timeout: 5000 }).catch(()=>null);
        
        console.log("SENDING COMMAND: show vlan summary");
        let out = await connection.send('show vlan summary', { waitFor: promptRegex, timeout: 10000 });
        console.log(out);
        console.log("SENDING COMMAND: show vlan all");
        out = await connection.send('show vlan all', { waitFor: promptRegex, timeout: 10000 });
        console.log(out);
        console.log("SENDING COMMAND: show vlan port");
        out = await connection.send('show vlan port', { waitFor: promptRegex, timeout: 10000 });
        console.log(out);
        
        await connection.end();
    } catch(e) {
        console.error(e);
    }
}
run();
