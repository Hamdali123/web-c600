const { Telnet } = require('telnet-client');
const { PrismaClient } = require('@prisma/client');

async function testReboot() {
  const prisma = new PrismaClient();
  const olts = await prisma.oLTDevice.findMany();
  const olt = olts[0];
  await prisma.$disconnect();

  if (!olt) {
    console.log("No OLT found");
    return;
  }

  console.log(`Connecting to ${olt.ip_address}:${olt.telnet_port}...`);
  const connection = new Telnet();
  
  try {
    await connection.connect({
      host: olt.ip_address,
      port: olt.telnet_port || 23,
      timeout: 10000,
      negotiationMandatory: false,
      disableLogon: true
    });

    console.log("Connected. Waiting for login prompt...");
    const promptRegex = /[#>]\s*$/i;

    try {
      await connection.send(olt.telnet_user, { waitFor: /password[: ]*$/i, timeout: 5000 });
    } catch (e) {
      await connection.send('\n', { waitFor: /name[: ]*$|username[: ]*$/i, timeout: 5000 }).catch(() => null);
      await connection.send(olt.telnet_user, { waitFor: /password[: ]*$/i, timeout: 5000 });
    }
    
    console.log("Sending password...");
    await connection.send(olt.telnet_pass, { waitFor: promptRegex, timeout: 5000 });
    console.log("Logged in.");

    await connection.send('terminal length 0', { waitFor: promptRegex, timeout: 5000 }).catch(() => null);

    console.log("Entering configure terminal...");
    await connection.send('configure terminal', { waitFor: promptRegex, timeout: 5000 });

    console.log("Entering pon-onu-mng...");
    let out = await connection.send('pon-onu-mng gpon_onu-1/13:2', { waitFor: promptRegex, timeout: 5000 });
    console.log(out);

    console.log("Sending reboot...");
    // Wait for ANY response (like [yes/no]) using a catch-all regex or short timeout
    let rebootOut = await connection.send('reboot', { waitFor: /\[yes\/no\]:|#|>/i, timeout: 5000 });
    console.log("Reboot output:");
    console.log(rebootOut);
    
    // If it asks for yes/no, send no for this test just to be safe, or yes if we really want to test.
    // The user was expecting it to reboot, so let's send 'yes' if prompted.
    if (rebootOut.toLowerCase().includes('yes/no')) {
       console.log("Prompt detected, sending 'yes'...");
       let confOut = await connection.send('yes', { waitFor: promptRegex, timeout: 5000 });
       console.log(confOut);
    }

    await connection.end();
    console.log("Done.");

  } catch (err) {
    console.error("Error:", err.message);
    try { await connection.destroy(); } catch (e) {}
  }
}

testReboot();
