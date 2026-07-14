import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { executeOltCommand } from '@/lib/oltConnection';

export async function GET() {
  const olt = await prisma.oLTDevice.findFirst({});
  if (!olt) return NextResponse.json({error: "no olt"});

  const creds = {
    ip: olt.ip_address, host: olt.ip_address, port: olt.telnet_port || 23,
    username: olt.telnet_user || '', password: olt.telnet_pass || '',
    vendor: 'zte', protocol: 'telnet'
  };

  try {
    const output = await executeOltCommand(creds, 'show gpon onu baseinfo');
    return NextResponse.json({ output: output.split('\n') });
  } catch(e: any) {
    return NextResponse.json({ error: e.message });
  }
}
