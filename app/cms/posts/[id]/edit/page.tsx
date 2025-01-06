import { createClient } from "@/utils/supabase/server"
import { PostForm } from "@/components/cms/post-form"
import { revalidatePath } from "next/cache"

export default async function PostEditPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()

  // Get post data
  const { data: post, error: postError } = await supabase
    .from("posts")
    .select(`
      *,
      categories:post_categories (
        category:categories(*)
      ),
      tags:post_tags (
        tag:tags(*)
      )
    `)
    .eq("id", params.id)
    .single()

  if (postError) {
    console.error("Error fetching post:", postError)
    return <div>Error loading post</div>
  }

  // Get all categories
  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("*")
    .order("name")

  if (categoriesError) {
    console.error("Error fetching categories:", categoriesError)
    return <div>Error loading categories</div>
  }

  // Get all tags
  const { data: tags, error: tagsError } = await supabase
    .from("tags")
    .select("*")
    .order("name")

  if (tagsError) {
    console.error("Error fetching tags:", tagsError)
    return <div>Error loading tags</div>
  }

  // Format the post data for the form
  const formattedPost = {
    ...post,
    categories: post.categories?.map((c: any) => c.category.id) || [],
    tags: post.tags?.map((t: any) => t.tag.id) || [],
  }

  // Server action to handle form submission
  async function updatePost(formData: FormData) {
    "use server"
    
    const supabase = await createClient()

    // Get values from formData
    const title = formData.get("title") as string
    const slug = formData.get("slug") as string
    const content = formData.get("content") as string
    const excerpt = formData.get("excerpt") as string
    const status = formData.get("status") as string
    const seo_title = formData.get("seo_title") as string
    const seo_description = formData.get("seo_description") as string
    const categories = formData.getAll("categories") as string[]
    const tags = formData.getAll("tags") as string[]

    // Start a transaction
    const { data: { user } } = await supabase.auth.getUser()
    
    // Update post
    const { error: postError } = await supabase
      .from("posts")
      .update({
        title,
        slug,
        content,
        excerpt,
        status: status.toLowerCase(),
        seo_title,
        seo_description,
        updated_at: new Date().toISOString(),
        published_at: status.toLowerCase() === 'published' 
          ? (post.published_at || new Date().toISOString()) // Keep existing published_at if exists, otherwise set new date
          : null, // Set to null if not published
      })
      .eq("id", params.id)

    if (postError) throw postError

    // Update categories
    const { error: deleteCategoriesError } = await supabase
      .from("post_categories")
      .delete()
      .eq("post_id", params.id)

    if (deleteCategoriesError) throw deleteCategoriesError

    if (categories.length > 0) {
      const { error: insertCategoriesError } = await supabase
        .from("post_categories")
        .insert(
          categories.map((categoryId) => ({
            post_id: params.id,
            category_id: categoryId,
          }))
        )

      if (insertCategoriesError) throw insertCategoriesError
    }

    // Update tags
    const { error: deleteTagsError } = await supabase
      .from("post_tags")
      .delete()
      .eq("post_id", params.id)

    if (deleteTagsError) throw deleteTagsError

    if (tags.length > 0) {
      const { error: insertTagsError } = await supabase
        .from("post_tags")
        .insert(
          tags.map((tagId) => ({
            post_id: params.id,
            tag_id: tagId,
          }))
        )

      if (insertTagsError) throw insertTagsError
    }

    revalidatePath("/cms/posts")
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Edit Post</h1>
      </div>

      <PostForm
        categories={categories}
        tags={tags}
        onSubmit={updatePost}
        defaultValues={formattedPost}
      />
    </div>
  )
}
