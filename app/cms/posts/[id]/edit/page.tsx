import { createClient } from "@/utils/supabase/server"
import { PostForm } from "@/components/cms/post-form"
import { revalidatePath } from "next/cache"

export default async function PostEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const idParam = await params
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
    .eq("id", idParam.id)
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

    if (!roleData || !['admin', 'editor', 'author'].includes(roleData.user_roles.role_name)) {
      throw new Error("Insufficient permissions")
    }

    // Get post ID from formData
    const postId = formData.get("id") as string
    if (!postId) {
      throw new Error("Post ID is required")
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
      .update({
        title,
        slug,
        content,
        excerpt,
        status,
        scheduled_at: status === 'scheduled' ? scheduled_at : null,
        published_at: status === 'published' ? new Date().toISOString() : null,
        seo_title,
        seo_description,
      })
      .eq('id', postId)
      .select()
      .single()

    if (postError) {
      console.error("Error updating post:", postError)
      throw new Error("Failed to update post")
    }

    // Update categories
    const { error: deleteCategoriesError } = await supabase
      .from("post_categories")
      .delete()
      .eq("post_id", postId)

    if (deleteCategoriesError) {
      console.error("Error deleting categories:", deleteCategoriesError)
      throw new Error("Failed to update categories")
    }

    if (categories.length > 0) {
      const { error: categoriesError } = await supabase
        .from("post_categories")
        .insert(
          categories.map((categoryId) => ({
            post_id: postId,
            category_id: categoryId,
          }))
        )

      if (categoriesError) {
        console.error("Error adding categories:", categoriesError)
        throw new Error("Failed to update categories")
      }
    }

    // Update tags
    const { error: deleteTagsError } = await supabase
      .from("post_tags")
      .delete()
      .eq("post_id", postId)

    if (deleteTagsError) {
      console.error("Error deleting tags:", deleteTagsError)
      throw new Error("Failed to update tags")
    }

    if (tags.length > 0) {
      const { error: tagsError } = await supabase
        .from("post_tags")
        .insert(
          tags.map((tagId) => ({
            post_id: postId,
            tag_id: tagId,
          }))
        )

      if (tagsError) {
        console.error("Error adding tags:", tagsError)
        throw new Error("Failed to update tags")
      }
    }
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
