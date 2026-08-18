import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip auth checks for login and static files
  if (
    pathname.startsWith('/auth/login') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const tokenCookie = request.cookies.get('auth_token');
  
  // No token = not logged in
  if (!tokenCookie) {
    // API request: return 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    // Page request: redirect to login
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  let user = null;
  try {
    // Our token is base64 encoded JSON
    const decoded = Buffer.from(tokenCookie.value, 'base64').toString('utf-8');
    user = JSON.parse(decoded);
  } catch (e) {
    // If it's the old 'dummy-token-id', fallback to admin for seamless upgrade during dev, 
    // or just let it fail. Let's just treat as invalid token so user logs in again.
    if (tokenCookie.value.startsWith('dummy-token-')) {
       const response = NextResponse.redirect(new URL('/auth/login', request.url));
       response.cookies.delete('auth_token');
       return response;
    }
    
    // Invalid token
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, error: 'Invalid token format' }, { status: 401 });
    }
    const response = NextResponse.redirect(new URL('/auth/login', request.url));
    response.cookies.delete('auth_token');
    return response;
  }

  const role = user?.role || 'readonly_users';

  // Define restricted prefixes for NON-ADMIN users (Settings dropdown)
  const adminOnlyRoutes = [
    '/settings/',
    '/api/settings/',
    '/system_config',
    '/locations/',
    '/odbs/',
    '/onu_types/',
    '/speed_profiles',
    '/olt', // this covers /olt and /olt_details
    '/onu_authorization_presets',
    '/general'
  ];

  const isRestricted = adminOnlyRoutes.some(route => pathname.startsWith(route));

  if (isRestricted && role !== 'admin') {
    // Block tech_user, readonly_users, installers from accessing Settings
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
    }
    // Redirect to home page with an error parameter or just redirect
    return NextResponse.redirect(new URL('/?error=forbidden', request.url));
  }

  // --- Read-only user restrictions ---
  // If role is readonly_users, block all non-GET API requests (except login/logout which is already handled/skipped)
  if (role === 'readonly_users' && request.method !== 'GET' && pathname.startsWith('/api/')) {
    // Allow logout
    if (pathname === '/api/auth/logout') {
      return NextResponse.next();
    }
    return NextResponse.json({ success: false, error: 'Forbidden: Read-only account' }, { status: 403 });
  }

  return NextResponse.next();
}

// Config to match all routes
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
