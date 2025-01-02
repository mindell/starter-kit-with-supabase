import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export const updateSession = async (request: NextRequest) => {
  try {
    // Create an unmodified response
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            request.cookies.set(name, value);
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set(name, value, options);
          },
          remove(name: string, options: any) {
            request.cookies.set(name, '');
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set(name, '', options);
          },
        },
      },
    );

    // Refresh session if expired
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    // Check if user is authenticated
    if (userError) {
      // If accessing protected routes, redirect to sign-in
      if (request.nextUrl.pathname.startsWith('/admin') ||
          request.nextUrl.pathname.startsWith('/editor') ||
          request.nextUrl.pathname.startsWith('/author')) {
        return NextResponse.redirect(new URL("/sign-in", request.url));
      }
      return response;
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
      .eq('user_id', user.id)
      .single();

    console.log('Role Query Result:', { roleData, roleError }); // Debug log
    console.log('User ID:', user.id); // Debug log

    const role = roleData?.user_roles?.role_name;

    console.log('User Role:', role); // For debugging

    // Role-based access control
    if (request.nextUrl.pathname.startsWith('/admin/roles') && role !== 'super_admin') {
      console.log('Unauthorized: Requires super_admin role'); // For debugging
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    if (request.nextUrl.pathname.startsWith('/admin') && 
        !['super_admin', 'admin'].includes(role as string)) {
      console.log('Unauthorized: Requires admin or super_admin role'); // For debugging
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    if (request.nextUrl.pathname.startsWith('/editor') && 
        !['super_admin', 'admin', 'editor'].includes(role as string)) {
      console.log('Unauthorized: Requires editor, admin or super_admin role'); // For debugging
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    if (request.nextUrl.pathname.startsWith('/author') && 
        !['super_admin', 'admin', 'editor', 'author'].includes(role as string)) {
      console.log('Unauthorized: Requires author, editor, admin or super_admin role'); // For debugging
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    // Redirect authenticated users from public pages
    if (request.nextUrl.pathname === "/" && user) {
      switch(role) {
        case 'super_admin':
        case 'admin':
          return NextResponse.redirect(new URL("/admin", request.url));
        case 'editor':
          return NextResponse.redirect(new URL("/editor", request.url));
        case 'author':
          return NextResponse.redirect(new URL("/author", request.url));
        default:
          return NextResponse.redirect(new URL("/unauthorized", request.url));
      }
    }

    return response;
  } catch (e) {
    console.error('Middleware Error:', e); // For debugging
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
};
