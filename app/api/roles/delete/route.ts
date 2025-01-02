import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const formData = await request.formData()
  const role_id = formData.get("role_id") as string

  const supabase = await createClient()

  try {
    // First check if this is a system role
    const { data: role } = await supabase
      .from("user_roles")
      .select("role_name")
      .eq("role_id", role_id)
      .single()

    if (!role) {
      throw new Error("Role not found")
    }

    // Check if this is a system role
    if (["super_admin", "admin", "subscriber", "system"].includes(role.role_name)) {
      return NextResponse.json(
        { error: "Cannot delete system roles" },
        { status: 403 }
      )
    }

    // Check if the role has any assigned users
    const { count } = await supabase
      .from("roles_assignment")
      .select("*", { count: "exact" })
      .eq("role_id", role_id)

    if (count && count > 0) {
      return NextResponse.json(
        { error: "Cannot delete role with assigned users" },
        { status: 400 }
      )
    }

    // Delete the role if it passes all checks
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("role_id", role_id)

    if (error) throw error

    return NextResponse.redirect(new URL("/admin/roles", request.url), {
      status: 303,
    })
  } catch (error) {
    console.error("Error deleting role:", error)
    return NextResponse.json(
      { error: "Failed to delete role" },
      { status: 500 }
    )
  }
}
