import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import { apiMiddleware } from "@/utils/api/middleware";
import { PUBLIC_PATHS } from "@/utils/constants";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Check if current path is public
  const isPublicPath = PUBLIC_PATHS.some(pp => 
    path === pp || path.startsWith(`${pp}/`)
  );

  // Public paths bypass all middleware
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Handle API routes
  if (path.startsWith('/api/')) {
    return apiMiddleware(request, async () => NextResponse.next());
  }

  // Handle protected routes
  return updateSession(request);
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
