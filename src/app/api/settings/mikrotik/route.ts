import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const routers = await prisma.mikrotikRouter.findMany();
    return NextResponse.json(routers);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const router = await prisma.mikrotikRouter.create({
      data: {
        name: body.name,
        ip_address: body.ip_address,
        api_port: body.api_port,
        username: body.username,
        password: body.password
      }
    });
    return NextResponse.json({ success: true, router });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
