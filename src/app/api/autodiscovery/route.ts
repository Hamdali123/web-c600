import { NextResponse } from 'next/server';

export async function GET() {
  // Dalam aslinya, di sini Node.js menembakkan telnet/ssh ke OLT:
  // const connection = await ssh.connect({...})
  // const result = await connection.execCommand('show gpon onu uncfg')
  
  // Karena saat ini simulasi lokal, kita melempar jumlah ONU Unconfigured:
  const simulationData = {
    olt: 'ZTE-C320',
    waitingAuth: Math.floor(Math.random() * 5) + 1, // Random 1-5 ONUs discovered
    timestamp: new Date().toISOString()
  };

  return NextResponse.json(simulationData);
}
