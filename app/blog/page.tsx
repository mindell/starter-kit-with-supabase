import { createClient } from '@supabase/supabase-js'
import { Metadata } from 'next'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Read our latest blog posts and articles',
}

// Create a Supabase client for static generation
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function BlogPage() {
  const { data: posts } = await supabase
    .from('posts')
    .select(`
      *,
      author:author_profiles!posts_author_profiles_fkey (
        display_name,
        avatar_url
      ),
      categories:post_categories (
        category:categories (
          name,
          slug
        )
      )
    `)
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  return (
    <div className="container py-8 mx-auto">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Blog</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="mb-8 text-4xl font-bold">Blog</h1>
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {posts?.map((post) => (
          <article key={post.id} className="group">
            <a href={`/blog/${post.slug}`} className="block">
              {post.featured_image && (
                <img
                  src={post.featured_image}
                  alt={post.title}
                  className="w-full h-48 object-cover rounded-lg mb-4 transition-transform group-hover:scale-105"
                />
              )}
              <h2 className="text-2xl font-bold mb-2 group-hover:text-primary">
                {post.title}
              </h2>
              {post.excerpt && (
                <p className="text-muted-foreground mb-4">{post.excerpt}</p>
              )}
              <div className="flex items-center gap-4">
                {post.author && (
                  <div className="flex items-center gap-2">
                    {post.author.avatar_url && (
                      <img
                        src={post.author.avatar_url}
                        alt={post.author.display_name}
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    <span className="text-sm">{post.author.display_name}</span>
                  </div>
                )}
                <time
                  dateTime={post.published_at}
                  className="text-sm text-muted-foreground"
                >
                  {new Date(post.published_at).toLocaleDateString()}
                </time>
              </div>
            </a>
          </article>
        ))}
      </div>
    </div>
  )
}
