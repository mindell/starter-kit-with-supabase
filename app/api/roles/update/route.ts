import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const formData = await request.formData()
  const role_id = formData.get("role_id") as string
  const description = formData.get("description") as string

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
        { error: "Cannot modify system roles" },
        { status: 403 }
      )
    }

    // Update the role if it's not a system role
    const { error } = await supabase
      .from("user_roles")
      .update({ description })
      .eq("role_id", role_id)

    if (error) throw error

    return NextResponse.redirect(new URL("/admin/roles", request.url), {
      status: 303,
    })
  } catch (error) {
    console.error("Error updating role:", error)
    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 }
    )
  }
}
