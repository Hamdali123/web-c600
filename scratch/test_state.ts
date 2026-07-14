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
    console.log("LOGIN SUCCESSFUL!");
    
    // Test getting state
    const out = await connection.exec('show gpon onu state');
    console.log("STATE DATA LENGTH:", out.length);
    console.log("First 100 chars:", out.substring(0, 100));
    console.log("Last 100 chars:", out.substring(out.length - 100));

    connection.end();
  } catch(e) { console.log(e) }
}
test();
