import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyPassword, hashPassword, isHashed } from '@/lib/password';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identity, password, remember } = body;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identity },
          { username: identity }
        ]
      }
    });

    if (!user || !verifyPassword(password || '', user.password)) {
      return NextResponse.json({ success: false, error: 'Invalid email/username or password' }, { status: 401 });
    }

    // Upgrade legacy plaintext passwords to scrypt hash on successful login
    if (!isHashed(user.password)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashPassword(user.password) }
      });
    }

    if (user.status !== 'Active') {
      return NextResponse.json({ success: false, error: 'User account is inactive' }, { status: 403 });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { last_login: new Date() }
    });

    const userInfo = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };
    
    // Encode user info as base64 for easy parsing in Edge middleware and frontend
    const tokenPayload = Buffer.from(JSON.stringify(userInfo)).toString('base64');

    // Set cookie — remember me: 30 days, otherwise session-scoped (deleted on browser close)
    const cookieStore = await cookies();
    cookieStore.set('auth_token', tokenPayload, {
      httpOnly: false, // false so ClientLayout can read it
      secure: false,
      maxAge: remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24, // 30 days or 1 day
      path: '/'
    });

    return NextResponse.json({ 
      success: true, 
      user: userInfo 
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
