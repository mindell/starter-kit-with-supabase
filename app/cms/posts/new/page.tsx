import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { PostForm } from "@/components/cms/post-form"
import { revalidatePath } from "next/cache"

// Server action for creating a new post
async function createPost(formData: FormData) {
  "use server"
  
  const supabase = await createClient()
  
  // Get user and validate session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  // Get user role
  const { data: roleData } = await supabase
    .from('roles_assignment')
    .select(`
      *,
      user_roles (
        role_name
      )
    `)
    .eq('user_id', user.id)
    .single()

  if (!roleData || !['admin', 'editor', 'author', 'super_admin'].includes(roleData.user_roles.role_name)) {
    throw new Error("Insufficient permissions")
  }

  // Get values from formData
  const title = formData.get("title") as string
  const slug = formData.get("slug") as string
  const content = formData.get("content") as string
  const excerpt = formData.get("excerpt") as string
  const status = formData.get("status") as string
  const scheduled_at = formData.get("scheduled_at") as string
  const seo_title = formData.get("seo_title") as string
  const seo_description = formData.get("seo_description") as string
  const categories = formData.getAll("categories") as string[]
  const tags = formData.getAll("tags") as string[]

  // Validate scheduled_at if status is scheduled
  if (status === 'scheduled') {
    if (!scheduled_at) {
      throw new Error("Schedule date is required for scheduled posts")
    }
    const scheduleDate = new Date(scheduled_at)
    if (scheduleDate <= new Date()) {
      throw new Error("Schedule date must be in the future")
    }
  }

  // Create the post
  const { data: post, error: postError } = await supabase
    .from("posts")
    .insert({
      title,
      slug,
      content,
      excerpt: excerpt || null,
      status,
      scheduled_at: scheduled_at || null,
      published_at: status === 'published' ? new Date().toISOString() : null,
      seo_title: seo_title || null,
      seo_description: seo_description || null,
      author_id: user.id,
    })
    .select()
    .single()

  if (postError) {
    throw postError
  }

  // Delete any existing draft after successful post creation
  if (formData.get("draft_id")) {
    await supabase
      .from("post_drafts")
      .delete()
      .eq("id", formData.get("draft_id"))
  }

  // Add categories
  if (categories.length > 0) {
    const { error: categoriesError } = await supabase
      .from("post_categories")
      .insert(
        categories.map((categoryId) => ({
          post_id: post.id,
          category_id: categoryId,
        }))
      )

    if (categoriesError) {
      console.error("Error adding categories:", categoriesError)
      throw new Error("Failed to add categories")
    }
  }

  // Add tags
  if (tags.length > 0) {
    const { error: tagsError } = await supabase
      .from("post_tags")
      .insert(
        tags.map((tagId) => ({
          post_id: post.id,
          tag_id: tagId,
        }))
      )

    if (tagsError) {
      console.error("Error adding tags:", tagsError)
      throw new Error("Failed to add tags")
    }
  }

  revalidatePath('/cms/posts')
  redirect('/cms/posts')
}

export default async function NewPostPage() {
  const supabase = await createClient()

  // Get user session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect("/sign-in")
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

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Create New Post</h1>
      <PostForm
        categories={categories}
        tags={tags}
        onSubmit={createPost}
      />
    </div>
  )
}
