import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { CategoryForm } from "@/components/cms/category-form"

export default async function EditCategoryPage({
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

  // Get category
  const { data: category } = await supabase
    .from("categories")
    .select("*")
    .eq("id", params.id)
    .single()

  if (!category) {
    return redirect("/cms/categories")
  }

  const handleSubmit = async (formData: any) => {
    "use server"
    
    const supabase = await createClient()
    
    const { error } = await supabase
      .from("categories")
      .update(formData)
      .eq("id", params.id)

    if (error) throw error
  }

  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Edit Category</h1>
        <CategoryForm 
          id={params.id}
          defaultValues={category}
          onSubmit={handleSubmit} 
        />
      </div>
    </div>
  )
}