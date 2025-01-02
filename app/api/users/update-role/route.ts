import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const formData = await request.formData()
  const userId = formData.get("userId") as string
  const roleId = formData.get("roleId") as string
  const supabase = await createClient()

  try {
    // Check if user already has a role
    const { data: existingRole } = await supabase
      .from("roles_assignment")
      .select()
      .eq("user_id", userId)
      .single()

    if (existingRole) {
      // Update existing role
      await supabase
        .from("roles_assignment")
        .update({ role_id: roleId })
        .eq("user_id", userId)
    } else {
      // Assign new role
      await supabase
        .from("roles_assignment")
        .insert({ user_id: userId, role_id: roleId })
    }

    return NextResponse.redirect(new URL("/admin/users", request.url), {
      status: 303,
    })
  } catch (error) {
    console.error("Error updating role:", error)
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 })
  }
}
