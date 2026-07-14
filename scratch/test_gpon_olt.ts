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
      username: 'sanwanay',
      password: '1Sampai9',
      timeout: 10000,
    });
    
    await connection.exec('terminal length 0');
    
    // Check PON ports commands
    const out1 = await connection.exec('show interface gpon_olt');
    console.log("OUT1:", out1.substring(0, 500));

    connection.end();
  } catch(e) { console.log(e) }
}
test();
