import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "./server";
import { PROTECTED_PATHS, PUBLIC_PATHS } from "@/utils/constants";

export const updateSession = async (request: NextRequest) => {
  try {
    const path = request.nextUrl.pathname;

    // Create an unmodified response
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    // Check if path is public (double-check)
    const isPublicPath = PUBLIC_PATHS.some(pp => 
      path === pp || path.startsWith(`${pp}/`)
    );
    if (isPublicPath) {
      return response;
    }

    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    // If not authenticated, redirect to sign-in
    if (userError) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    // Get user role
    const { data: roleData, error: roleError } = await supabase
      .from('roles_assignment')
      .select(`
        *,
        user_roles (
          *
        )
      `)
      .eq('user_id', user?.id)
      .single();

    const role = roleData?.user_roles?.role_name;

    // If no role assigned, redirect to unauthorized
    if (!role || roleError) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    // Check path against protected paths
    for (const [key, config] of Object.entries(PROTECTED_PATHS)) {
      if (path.startsWith(config.path)) {
        // Check if user has required role
        if (!config.roles.includes(role)) {
          return NextResponse.redirect(new URL("/unauthorized", request.url));
        }
        break;
      }
    }

    // If we get here, user is authenticated and authorized
    return response;
  } catch (e) {
    // On error, allow public paths, redirect others to sign-in
    const isPublicPath = PUBLIC_PATHS.some(pp => 
      request.nextUrl.pathname === pp || 
      request.nextUrl.pathname.startsWith(`${pp}/`)
    );
    
    if (isPublicPath) {
      return NextResponse.next({
        request: {
          headers: request.headers,
        },
      });
    }

    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
};
