import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/utils/supabase/server"

export default async function AdminPage() {
  const supabase = await createClient()

  // Get total users count using auth.users
  const { count: usersCount } = await supabase
    .from("users_with_roles")
    .select("*", { count: "exact", head: true })

  // Get users by role
  const { data: roleStats } = await supabase
    .from("users_with_roles")
    .select("role_name")

  const roleCounts = roleStats?.reduce((acc: { [key: string]: number }, curr) => {
    if (curr.role_name) {
      acc[curr.role_name] = (acc[curr.role_name] || 0) + 1
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
          <div className="text-2xl font-bold">{usersCount || 0}</div>
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
