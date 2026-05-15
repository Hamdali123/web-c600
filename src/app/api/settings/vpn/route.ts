import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Combined handler for VPN (simpler for this case, or separate files if preferred)
// Using separate files is cleaner for Next.js app router.
// Creating /api/settings/vpn/route.ts

export async function GET() {
  try {
    const vpn = await prisma.vPNTunnel.findMany();
    return NextResponse.json(vpn);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const vpn = await prisma.vPNTunnel.create({
      data: { name: body.name, subnet: body.subnet }
    });
    return NextResponse.json({ success: true, vpn });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
  }
}
