"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookOpen,
  FileText,
  FolderOpen,
  Hash,
  Image,
  Settings,
  PieChart,
} from "lucide-react"

interface NavigationMenuProps {
  userRole: string
}

export function NavigationMenu({ userRole }: NavigationMenuProps) {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  // Define navigation items based on user role
  const navigationItems = [
    {
      name: "Posts",
      href: "/cms/posts",
      icon: FileText,
      roles: ["super_admin", "admin", "editor", "author"],
    },
    {
      name: "Categories",
      href: "/cms/categories",
      icon: FolderOpen,
      roles: ["super_admin", "admin", "editor"],
    },
    {
      name: "Tags",
      href: "/cms/tags",
      icon: Hash,
      roles: ["super_admin", "admin", "editor"],
    },
    {
      name: "Media Library",
      href: "/cms/media",
      icon: Image,
      roles: ["super_admin", "admin", "editor", "author"],
    },
    {
      name: "API Tokens",
      href: "/cms/tokens",
      icon: Settings,
      roles: ["super_admin", "admin"],
    },
    {
      name: "Analytics",
      href: "/cms/analytics",
      icon: PieChart,
      roles: ["super_admin", "admin"],
    },
    {
      name: "Settings",
      href: "/cms/settings",
      icon: Settings,
      roles: ["super_admin"],
    },
  ]

  return (
    <nav className="p-4 space-y-2">
      <div className="mb-6">
        <Link
          href="/cms"
          className="text-lg font-semibold flex items-center space-x-2"
        >
          <BookOpen className="w-6 h-6" />
          <span>CMS Dashboard</span>
        </Link>
      </div>

      {navigationItems
        .filter((item) => item.roles.includes(userRole))
        .map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                isActive(item.href)
                  ? "bg-gray-200 text-gray-900"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          )
        })}
    </nav>
  )
}
