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

  // Start a transaction
  const { data: post, error: postError } = await supabase
    .from("posts")
    .insert({
      title,
      slug,
      content,
      excerpt,
      status,
      scheduled_at: status === 'scheduled' ? scheduled_at : null,
      published_at: status === 'published' ? new Date().toISOString() : null,
      seo_title,
      seo_description,
      author_id: user.id,
    })
    .select()
    .single()

  if (postError) {
    console.error("Error creating post:", postError)
    throw new Error("Failed to create post")
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

  // Get categories and tags
  const [{ data: categories }, { data: tags }] = await Promise.all([
    supabase.from("categories").select("id, name").order("name"),
    supabase.from("tags").select("id, name").order("name"),
  ])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">New Post</h1>
      </div>

      <div className="max-w-4xl">
        <PostForm
          categories={categories || []}
          tags={tags || []}
          onSubmit={createPost}
        />
      </div>
    </div>
  )
}
