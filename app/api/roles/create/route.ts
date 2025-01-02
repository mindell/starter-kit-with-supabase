import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const formData = await request.formData()
  const role_name = formData.get("role_name") as string
  const description = formData.get("description") as string

  const supabase = await createClient()

  try {
    const { error } = await supabase
      .from("user_roles")
      .insert({ role_name, description })

    if (error) throw error

    return NextResponse.redirect(new URL("/admin/roles", request.url), {
      status: 303,
    })
  } catch (error) {
    console.error("Error creating role:", error)
    return NextResponse.json(
      { error: "Failed to create role" },
      { status: 500 }
    )
  }
}
