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
    
    // Test getting signal
    const out = await connection.exec('show pon power attenuation gpon_onu-1/2/1:1');
    console.log("SIGNAL DATA:");
    console.log(out);

    connection.end();
  } catch(e) { console.log(e) }
}
test();
