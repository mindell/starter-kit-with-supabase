import { ReactNode } from "react"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

async function AdminLayout({ children }: { children: ReactNode }) {
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
      role_id,
      user_roles!inner (
        role_name
      )
    `)
    .eq("user_id", user.id)
    .single()

  const role = roleData?.user_roles?.role_name

  if (!["super_admin", "admin"].includes(role as string)) {
    redirect("/unauthorized")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link href="/admin" className="mr-6 flex items-center space-x-2">
              <span className="font-bold">Admin Dashboard</span>
            </Link>
            <nav className="flex items-center space-x-6 text-sm font-medium">
              <Link
                href="/admin/users"
                className="transition-colors hover:text-foreground/80"
              >
                Users
              </Link>
              {role === "super_admin" && (
                <Link
                  href="/admin/roles"
                  className="transition-colors hover:text-foreground/80"
                >
                  Roles
                </Link>
              )}
            </nav>
          </div>
          <div className="ml-auto flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  {user.email?.charAt(0).toUpperCase()}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuItem className="flex-col items-start">
                  <div className="text-xs font-medium">{user.email}</div>
                  <div className="text-xs text-muted-foreground">
                    {role?.replace("_", " ").toUpperCase()}
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/sign-out">Sign Out</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <div className="container py-6">{children}</div>
      </main>
    </div>
  )
}

export default AdminLayout
