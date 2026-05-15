import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const presets = await prisma.authPreset.findMany({
      // In a real app we'd include relations, but for now just the records
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(presets);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch presets' }, { status: 500 });
  }
}
