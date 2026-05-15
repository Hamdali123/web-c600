import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { executeOltCommand } from '@/lib/oltConnection';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const oltId = parseInt(id);

    const olt = await prisma.oLTDevice.findUnique({
      where: { id: oltId }
    });

    if (!olt) return NextResponse.json({ error: 'OLT not found' }, { status: 404 });

    let info = "";
    if (olt.vendor === 'zte') {
      info = await executeOltCommand({
        ip: olt.ip_address,
        port: olt.telnet_port,
        username: olt.telnet_user || '',
        password: olt.telnet_pass || '',
        protocol: (olt.protocol as any) || 'telnet',
        vendor: (olt.vendor as any) || 'zte'
      }, 'show version-running');
    } else {
      info = await executeOltCommand({
        ip: olt.ip_address,
        port: olt.telnet_port,
        username: olt.telnet_user || '',
        password: olt.telnet_pass || '',
        protocol: (olt.protocol as any) || 'telnet',
        vendor: (olt.vendor as any) || 'huawei'
      }, 'display version');
    }

    return NextResponse.json({ raw_version: info });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
