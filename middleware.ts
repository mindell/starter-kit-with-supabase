import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import { apiMiddleware } from "@/utils/api/middleware";

export async function middleware(request: NextRequest) {
  // Handle API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return apiMiddleware(request, async () => NextResponse.next());
  }

  // Handle regular routes
  const res = await updateSession(request);
  
  // Get response from updateSession if it's a redirect
  if (res.headers.get("location")) {
    return res;
  }

  // Check protected routes
  const protectedPaths = [
    '/admin',           // Super Admin and Admin only
    '/admin/roles',     // Super Admin only
    '/admin/users',     // Super Admin and Admin only
    '/admin/settings',  // Super Admin only
    '/editor',          // Editor and above
    '/author',          // Author and above
    '/cms',             // CMS
  ]

  const path = request.nextUrl.pathname;
  const isProtectedPath = protectedPaths.some(pp => path.startsWith(pp));

  if (isProtectedPath) {
    const response = NextResponse.next();
    response.headers.set("x-middleware-cache", "no-cache");
    return response;
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
