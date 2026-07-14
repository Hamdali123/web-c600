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
      password: 'admin', // we don't have the real password, wait, I can just use executeOltCommand
      timeout: 10000,
    });
  } catch(e) { console.log(e) }
}
test();
