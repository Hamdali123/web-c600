import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { executeOltCommand } from '@/lib/oltConnection';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    
    // Check if it's a test_only request directly from the form
    if (body && body.test_only) {
      const command = body.vendor === 'zte' ? 'show processor' : 'display board 0/0';
      try {
        await executeOltCommand({
          ip: body.ip,
          port: body.port,
          username: body.username || '',
          password: body.password || '',
          protocol: 'telnet', // Default to telnet as per SmartOLT original
          vendor: body.vendor || 'zte'
        }, command);
        return NextResponse.json({ success: true });
      } catch (connError: any) {
        console.error("Connection test failed:", connError);
        return NextResponse.json({ success: false, error: connError.message || "Connection failed" });
      }
    }

    // Otherwise, it must be testing an existing OLT
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const olt = await prisma.oLTDevice.findUnique({
      where: { id: parseInt(id) }
    });

    if (!olt) return NextResponse.json({ error: 'OLT not found' }, { status: 404 });

    // Try a simple command to test connectivity
    const command = olt.vendor === 'zte' ? 'show processor' : 'display board 0/0';
    
    try {
      await executeOltCommand({
        ip: olt.ip_address,
        port: olt.telnet_port,
        username: olt.telnet_user || '',
        password: olt.telnet_pass || '',
        protocol: (olt.protocol as any) || 'telnet',
        vendor: (olt.vendor as any) || 'zte'
      }, command);

      return NextResponse.json({ success: true });
    } catch (connError: any) {
      console.error("Connection test failed:", connError);
      return NextResponse.json({ success: false, error: connError.message || "Connection failed" });
    }
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
