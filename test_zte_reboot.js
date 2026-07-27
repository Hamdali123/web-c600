const { Telnet } = require('telnet-client');

async function testZteC600() {
  const ip = '103.68.214.225';
  const port = 2334;
  const user = 'sanwanay';
  const pass = '1Sampai9';
  const onuToTest = 'gpon_onu-1/13:2';

  console.log(`Connecting to ${ip}:${port}...`);
  const connection = new Telnet();
  
  try {
    await connection.connect({ host: ip, port: port, timeout: 10000, disableLogon: true });
    
    // Login
    await connection.send(user, { waitFor: /password[: ]*$/i, timeout: 5000 }).catch(() => null);
    await connection.send(pass, { waitFor: /[#>]\s*$/i, timeout: 5000 });
    console.log("Logged in");

    await connection.send('terminal length 0', { waitFor: /[#>]\s*$/i, timeout: 5000 }).catch(() => null);
    await connection.send('configure terminal', { waitFor: /[#>]\s*$/i, timeout: 5000 });
    
    console.log("Testing pon-onu-mng reboot...");
    await connection.send(`pon-onu-mng ${onuToTest}`, { waitFor: /[#>]\s*$/i, timeout: 5000 });
    
    let rebootOut = await connection.send('reboot', { waitFor: /\[yes\/no\]:|#|>/i, timeout: 5000 });
    console.log("Reboot output:");
    console.log(rebootOut);
    
    if (rebootOut.toLowerCase().includes('yes/no')) {
       console.log("Sending 'yes'...");
       let yesOut = await connection.send('yes', { waitFor: /[#>]\s*$/i, timeout: 5000 });
       console.log(yesOut);
    }

    await connection.end();
  } catch(e) {
    console.log("Error:", e.message);
    try { await connection.destroy(); } catch(err){}
  }
}

testZteC600();
