import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { TagForm } from "@/components/cms/tag-form"

export default async function NewTagPage() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect("/sign-in")
  }

  const handleSubmit = async (formData: any) => {
    "use server"
    
    const supabase = await createClient()
    
    const { error } = await supabase
      .from("tags")
      .insert([formData])

    if (error) throw error
  }

  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">New Tag</h1>
        <TagForm onSubmit={handleSubmit} />
      </div>
    </div>
  )
}
