import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  cookieStore.delete('auth_token');
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3009';
  return NextResponse.redirect(new URL('/auth/login', baseUrl));
}
