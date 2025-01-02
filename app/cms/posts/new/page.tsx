import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { PostForm } from "@/components/cms/post-form"

export default async function NewPostPage() {
  const supabase = await createClient()

  // Get user session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return redirect("/sign-in")
  }

  // Get categories and tags
  const [{ data: categories }, { data: tags }] = await Promise.all([
    supabase.from("categories").select("id, name").order("name"),
    supabase.from("tags").select("id, name").order("name"),
  ])

  // Handle form submission
  async function handleSubmit(data: any) {
    "use server"
    
    const supabase = await createClient()

    // Insert the post
    const { data: post, error: postError } = await supabase
      .from("posts")
      .insert({
        title: data.title,
        slug: data.slug,
        content: data.content,
        excerpt: data.excerpt,
        status: data.status,
        author_id: session?.user.id,
        seo_title: data.seo_title,
        seo_description: data.seo_description,
      })
      .select()
      .single()

    if (postError) throw postError

    // Insert categories
    if (data.categories.length > 0) {
      const { error: categoriesError } = await supabase
        .from("post_categories")
        .insert(
          data.categories.map((categoryId: string) => ({
            post_id: post.id,
            category_id: categoryId,
          }))
        )

      if (categoriesError) throw categoriesError
    }

    // Insert tags
    if (data.tags.length > 0) {
      const { error: tagsError } = await supabase
        .from("post_tags")
        .insert(
          data.tags.map((tagId: string) => ({
            post_id: post.id,
            tag_id: tagId,
          }))
        )

      if (tagsError) throw tagsError
    }

    return redirect("/cms/posts")
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">New Post</h1>
      </div>

      <div className="max-w-4xl">
        <PostForm
          categories={categories || []}
          tags={tags || []}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  )
}
