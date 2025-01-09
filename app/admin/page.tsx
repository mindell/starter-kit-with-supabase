import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/utils/supabase/server"

interface RoleMeta {
  role_id: number
  created_at: string
}

interface AdminUser {
  id: string
  email: string
  created_at: string
  updated_at: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  website: string | null
  social_links: Record<string, any> | null
  roles: string[]
  roles_meta: Record<string, RoleMeta>
}

interface RoleCounts {
  [role: string]: number
}

export default async function AdminPage() {
  const supabase = await createClient()

  // Get users data using admin function
  const { data: users, error } = await supabase
    .rpc('admin_users') as { data: AdminUser[] | null, error: any }

  if (error) {
    console.error('Error fetching users:', error)
    return <div>Error loading admin dashboard</div>
  }

  // Calculate total users
  const usersCount = users?.length || 0

  // Calculate role counts with type safety
  const roleCounts = users?.reduce((acc: RoleCounts, user) => {
    if (user.roles && Array.isArray(user.roles)) {
      user.roles.forEach((role) => {
        acc[role] = (acc[role] || 0) + 1
      })
    }
    return acc
  }, {})

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{usersCount}</div>
        </CardContent>
      </Card>
      {Object.entries(roleCounts || {}).map(([role, count]) => (
        <Card key={role}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {role.replace("_", " ").toUpperCase()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{count}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
