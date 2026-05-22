import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  // API routes handle their own auth via getServerSession
  if (pathname.startsWith('/api/')) return NextResponse.next()

  const token = await getToken({ req })

  if (!token) {
    return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(pathname)}`, req.url))
  }

  if (token.mustChange && pathname !== '/settings/change-password') {
    return NextResponse.redirect(new URL('/settings/change-password', req.url))
  }

  const role = token.role as string | undefined

  if (pathname.startsWith('/executive') && role !== 'EXECUTIVE' && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  if (pathname.startsWith('/settings') && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  if (pathname.startsWith('/analytics') && role !== 'MANAGER' && role !== 'EXECUTIVE' && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|login|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|eot)$).*)'],
}
