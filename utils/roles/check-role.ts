import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export type Role = 'super_admin' | 'admin' | 'editor' | 'author' | 'system'

export async function checkUserRole(allowedRoles: Role[]): Promise<boolean> {
  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return false

  const { data: userRoles } = await supabase
    .from('roles_assignment')
    .select('role_id, user_roles(role_name)')
    .eq('user_id', user.id)
    .single()

  if (!userRoles) return false

  const userRole = userRoles.user_roles?.role_name as Role
  return allowedRoles.includes(userRole)
}
