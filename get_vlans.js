const { Telnet } = require('telnet-client');

async function main() {
  const connection = new Telnet();
  const params = {
    host: '103.68.214.225',
    port: 2334,
    shellPrompt: />|#/,
    timeout: 5000,
    loginPrompt: /Username:/i,
    passwordPrompt: /Password:/i,
    username: 'sanwanay',
    password: '1Sampai9'
  };

  try {
    await connection.connect(params);
    let result = await connection.send('show vlan summary');
    console.log(result);
    await connection.destroy();
  } catch (e) {
    console.error(e);
  }
}

main();
