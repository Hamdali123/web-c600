import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export async function GET() {
  try {
    const keys = await prisma.apiKey.findMany({
      orderBy: { id: 'desc' }
    });
    return NextResponse.json(keys);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const generatedKey = 'key_' + crypto.randomBytes(16).toString('hex');
    
    const newKey = await prisma.apiKey.create({
      data: {
        key: generatedKey,
        access_type: body.access_type || 'Read & Write',
        allowed_ips: body.allowed_ips || '',
        restriction_group: body.restriction_group || 'none'
      }
    });

    return NextResponse.json({ success: true, apiKey: newKey });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to create API key' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idStr = searchParams.get('id');
    if (!idStr) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const id = parseInt(idStr);
    await prisma.apiKey.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 });
  }
}
