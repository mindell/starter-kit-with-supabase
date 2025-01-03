import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { NavigationMenu } from "@/components/cms/navigation-menu"

export default async function CMSLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Get session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect("/sign-in")
  }

  // Get user role
  const { data: roleData } = await supabase
    .from("roles_assignment")
    .select(`
      user_roles (
        role_name
      )
    `)
    .eq("user_id", user?.id)
    .single()

  const userRole = roleData?.user_roles?.role_name

  // Redirect subscribers away from CMS
  if (!userRole || userRole === "subscriber") {
    return redirect("/")
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-gray-50 border-r">
        <NavigationMenu userRole={userRole} />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="container mx-auto py-6 px-4">
          {children}
        </div>
      </main>
    </div>
  )
}
