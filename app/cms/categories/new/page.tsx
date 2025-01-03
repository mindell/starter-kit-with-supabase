import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { CategoryForm } from "@/components/cms/category-form"

export default async function NewCategoryPage() {
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
      .from("categories")
      .insert([formData])

    if (error) throw error
  }

  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">New Category</h1>
        <CategoryForm onSubmit={handleSubmit} />
      </div>
    </div>
  )
}
