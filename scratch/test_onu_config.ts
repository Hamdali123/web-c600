import { Telnet } from 'telnet-client';

async function test() {
  const connection = new Telnet();
  try {
    await connection.connect({
      host: '103.68.214.225',
      port: 2334,
      shellPrompt: /#\s*$/,
      loginPrompt: /Username:/i,
      passwordPrompt: /Password:/i,
      username: 'admin',
      password: 'admin',
      timeout: 10000,
    });
    await connection.exec('terminal length 0');
    
    // Check one ONU
    const out = await connection.exec('show running-config interface gpon_onu-1/2/1:1');
    console.log("ONU_RUN_CONFIG:");
    console.log(out);

    connection.end();
  } catch(e) { console.log(e) }
}
test();
