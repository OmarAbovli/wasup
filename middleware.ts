import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Get the pathname of the request
  const { pathname } = request.nextUrl

  // Define protected routes
  const protectedRoutes = ["/chat", "/profile", "/create-group"]

  // Check if the current path is protected
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))

  if (isProtectedRoute) {
    // In a real app, you would check for a valid session token
    // For this demo, we'll just check if there's a user in localStorage (client-side)
    // In production, use proper JWT tokens or session management

    // Since we can't access localStorage in middleware, we'll let the client handle auth
    // and redirect in the component if needed
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
