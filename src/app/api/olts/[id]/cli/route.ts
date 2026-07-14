import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { executeOltCommand } from '@/lib/oltConnection';
import type { OltCredentials } from '@/lib/oltConnection';

const prisma = new PrismaClient();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const command = body.command;

    if (!command) {
      return NextResponse.json({ error: 'Command is required' }, { status: 400 });
    }

    const oltId = parseInt(id);
    if (isNaN(oltId)) {
      return NextResponse.json({ error: 'Invalid OLT ID' }, { status: 400 });
    }

    const olt = await prisma.oLTDevice.findUnique({
      where: { id: oltId }
    });

    if (!olt) {
      return NextResponse.json({ error: 'OLT not found' }, { status: 404 });
    }

    const defaultProtocol = (olt.protocol?.toString().toLowerCase().includes('ssh')) ? 'ssh' : 'telnet';
    const creds: OltCredentials = {
      ip: olt.ip_address,
      port: defaultProtocol === 'ssh' ? 22 : (olt.telnet_port ?? 23),
      username: olt.telnet_user || '',
      password: olt.telnet_pass || '',
      protocol: defaultProtocol as 'ssh' | 'telnet',
      vendor: (olt.vendor?.toString().toLowerCase() as 'zte' | 'huawei') || 'zte',
    };

    const output = await executeOltCommand(creds, command);

    return NextResponse.json({ output });
  } catch (error: any) {
    console.error('CLI API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to execute command' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
