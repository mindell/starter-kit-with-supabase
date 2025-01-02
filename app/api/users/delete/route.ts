import { createClient } from "@/utils/supabase/server";

import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const formData = await request.formData()
  const userId = formData.get("userId") as string


  const supabase = await createClient()

  try {
    // Delete user's role first (due to foreign key constraint)
    await supabase.from("roles_assignment").delete().eq("user_id", userId)

    // Delete user from auth.users
    const { error } = await supabase.auth.admin.deleteUser(userId)
    if (error) throw error

    return NextResponse.redirect(new URL("/admin/users", request.url), {
      status: 303,
    })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}
