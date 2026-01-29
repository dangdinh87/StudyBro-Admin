import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'studybro-admin-secret-key-minimum-32-chars!'
)

const publicPaths = ['/login', '/api/auth/login']

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Allow public paths
  if (publicPaths.some(path => pathname.startsWith(path))) {
    // If logged in, redirect away from login
    if (pathname === '/login') {
      const token = request.cookies.get('admin_session')?.value
      if (token) {
        try {
          await jwtVerify(token, JWT_SECRET)
          return NextResponse.redirect(new URL('/', request.url))
        } catch {
          // Invalid token, let them access login
        }
      }
    }
    return NextResponse.next()
  }

  // Protect all other routes
  const token = request.cookies.get('admin_session')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    await jwtVerify(token, JWT_SECRET)
    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
