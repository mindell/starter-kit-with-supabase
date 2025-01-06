import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import ApiTester from "@/components/api-docs/ApiTester"

export default async function ApiTestPage() {
  const cookieStore = await cookies()
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/sign-in")
  }

  const { data: roleData } = await supabase
    .from("roles_assignment")
    .select(`
      *,
      user_roles!inner (
        role_name
      )
    `)
    .eq("user_id", user.id)
    .single()

  const role = roleData?.user_roles?.role_name

  if (role !== "super_admin") {
    redirect("/unauthorized")
  }

  // Fetch active tokens
  const { data: tokens } = await supabase
    .from("api_tokens")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")

  // Fetch API endpoints
  const { data: endpoints } = await supabase
    .from("api_endpoints")
    .select("*")
    .eq("is_active", true)
    .order("path")

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Tester</h1>
          <p className="text-muted-foreground">
            Test your API endpoints with your active tokens
          </p>
        </div>
      </div>
      <ApiTester tokens={tokens || []} endpoints={endpoints || []} />
    </div>
  )
}
