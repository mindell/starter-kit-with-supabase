import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { TagForm } from "@/components/cms/tag-form"

export default async function EditTagPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect("/sign-in")
  }

  // Get tag
  const { data: tag } = await supabase
    .from("tags")
    .select("*")
    .eq("id", params.id)
    .single()

  if (!tag) {
    return redirect("/cms/tags")
  }

  const handleSubmit = async (formData: any) => {
    "use server"
    
    const supabase = await createClient()
    
    const { error } = await supabase
      .from("tags")
      .update(formData)
      .eq("id", params.id)

    if (error) throw error
  }

  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Edit Tag</h1>
        <TagForm 
          id={params.id}
          defaultValues={tag}
          onSubmit={handleSubmit} 
        />
      </div>
    </div>
  )
}