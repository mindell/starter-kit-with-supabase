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

  const role = roleData?.user_roles?.role_name
  console.log('role:', role);
  // Check if user has permission to create posts
  if (!['super_admin', 'admin', 'editor', 'author'].includes(role as string)) {
    throw new Error("Insufficient permissions")
  }

  // Parse form data
  const formValues = {
    title: formData.get('title') as string,
    slug: formData.get('slug') as string,
    content: formData.get('content') as string,
    excerpt: formData.get('excerpt') as string,
    status: formData.get('status')?.toString().toLowerCase() as string,
    seo_title: formData.get('seo_title') as string,
    seo_description: formData.get('seo_description') as string,
    categories: formData.getAll('categories') as string[],
    tags: formData.getAll('tags') as string[],
  }

  // Validate required fields
  if (!formValues.title || !formValues.slug || !formValues.content || !formValues.status) {
    throw new Error('Missing required fields')
  }

  console.log('Form values:', formValues);

  // Start a transaction by using a single batch operation
  const { data: post, error: postError } = await supabase
    .from("posts")
    .insert({
      title: formValues.title,
      slug: formValues.slug,
      content: formValues.content,
      excerpt: formValues.excerpt || null,
      status: formValues.status as 'draft' | 'published' | 'archived',
      author_id: user.id,
      seo_title: formValues.seo_title || null,
      seo_description: formValues.seo_description || null,
    })
    .select()
    .single()

  if (postError) {
    console.error('Post creation error:', postError);
    throw new Error(`Failed to create post: ${postError.message}`)
  }

  console.log('Created post:', post);

  // Insert categories if any
  if (formValues.categories?.length > 0) {
    const categoryInserts = formValues.categories.map((categoryId: string) => ({
      post_id: post.id,
      category_id: categoryId,
    }));
    console.log('Category inserts:', categoryInserts);

    const { error: categoriesError } = await supabase
      .from("post_categories")
      .insert(categoryInserts)

    if (categoriesError) {
      console.error('Categories error:', categoriesError);
      throw new Error(`Failed to add categories: ${categoriesError.message}`)
    }
  }

  // Insert tags if any
  if (formValues.tags?.length > 0) {
    const tagInserts = formValues.tags.map((tagId: string) => ({
      post_id: post.id,
      tag_id: tagId,
    }));
    console.log('Tag inserts:', tagInserts);

    const { error: tagsError } = await supabase
      .from("post_tags")
      .insert(tagInserts)

    if (tagsError) {
      console.error('Tags error:', tagsError);
      throw new Error(`Failed to add tags: ${tagsError.message}`)
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
