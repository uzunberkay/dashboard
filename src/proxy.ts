import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"

function isPublicPath(pathname: string) {
  return (
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/api/register" ||
    pathname === "/api/health" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/admin/login" ||
    pathname.startsWith("/_next/static") ||
    pathname.startsWith("/_next/image") ||
    pathname === "/favicon.ico"
  )
}

export default async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  if (!token?.sub || token.isActive === false) {
    const loginPath = pathname.startsWith("/admin") ? "/admin/login" : "/login"
    const url = new URL(loginPath, request.url)
    url.searchParams.set("callbackUrl", `${pathname}${search}`)
    return NextResponse.redirect(url)
  }

  if (pathname.startsWith("/admin") && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/:path*"],
}
