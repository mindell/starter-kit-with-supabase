'use server'
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const createClient = async (useStatic?: boolean) => {
  if (useStatic) {
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: () => '',
          set: () => {},
          remove: () => {},
        },
      }
    )
  }

  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value ?? ''
        },
        set(name: string, value: string, options: any) {
          try {
            // In server actions and route handlers only
            if (cookieStore.set) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Silently ignore if we're not in a server action
          }
        },
        remove(name: string, options: any) {
          try {
            // In server actions and route handlers only
            if (cookieStore.set) {
              cookieStore.set(name, '', { ...options, maxAge: 0 })
            }
          } catch {
            // Silently ignore if we're not in a server action
          }
        },
      },
    }
  )
}
