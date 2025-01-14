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
import { HomeIcon, UsersIcon, ShieldCheckIcon, CogIcon, FileText, BeakerIcon } from "lucide-react"

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
      *,
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

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: HomeIcon },
    { name: 'Users', href: '/admin/users', icon: UsersIcon },
    { name: 'Roles', href: '/admin/roles', icon: ShieldCheckIcon },
    { name: 'Settings', href: '/admin/settings', icon: CogIcon },
    { name: 'API Docs', href: '/admin/api-docs', icon: FileText },
    ...(role === 'super_admin' ? [
      { name: 'API Tester', href: '/admin/api-docs/test', icon: BeakerIcon }
    ] : [])
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link href="/admin" className="mr-6 flex items-center space-x-2">
              <span className="font-bold">Admin Dashboard</span>
            </Link>
            <nav className="flex items-center space-x-6 text-sm font-medium">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="transition-colors hover:text-foreground/80 flex items-center gap-1"
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              ))}
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
