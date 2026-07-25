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
    
    // Disable pagination
    await connection.exec('terminal length 0');
    
    // Check Tx power of a PON port
    const out1 = await connection.exec('show interface optical gpon_olt-1/2/1');
    console.log("OPTICAL:", out1);
    
    connection.end();
  } catch(e) { console.log(e) }
}
test();
