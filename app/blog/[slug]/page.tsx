import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'

// Create a Supabase client for static generation
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Generate static params for all published posts
export async function generateStaticParams() {
  const { data: posts } = await supabase
    .from('posts')
    .select('slug')
    .eq('status', 'published')

  return posts?.map(({ slug }) => ({
    slug,
  })) || []
}

// Generate metadata for each post
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slugParam = await params;
  const { data: post } = await supabase
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
    .eq('slug', slugParam.slug)
    .eq('status', 'published')
    .single()

  if (!post) {
    return {}
  }

  const categories = post.categories?.map(c => c.category.name).join(', ')
  
  return {
    title: post.seo_title || post.title,
    description: post.seo_description || post.excerpt,
    keywords: post.seo_keywords,
    authors: [
      {
        name: post.author?.display_name,
        url: `/authors/${post.author_id}`,
      },
    ],
    openGraph: {
      title: post.seo_title || post.title,
      description: post.seo_description || post.excerpt,
      type: 'article',
      publishedTime: post.published_at,
      modifiedTime: post.updated_at,
      authors: post.author?.display_name,
      images: [post.featured_image],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.seo_title || post.title,
      description: post.seo_description || post.excerpt,
      images: [post.featured_image],
    },
    other: {
      'article:published_time': post.published_at,
      'article:modified_time': post.updated_at,
      'article:author': post.author?.display_name,
      'article:section': categories,
    },
  }
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const slugParams = await params
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const { data: post } = await supabase
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
      ),
      tags:post_tags (
        tag:tags (
          name,
          slug
        )
      )
    `)
    .eq('slug', slugParams.slug)
    .eq('status', 'published')
    .single()

  if (!post) {
    notFound()
  }

  return (
    <article className="container py-8 mx-auto">
      <header className="mb-8">
        <h1 className="mb-2 text-4xl font-bold">{post.title}</h1>
        {post.excerpt && (
          <p className="text-xl text-muted-foreground">{post.excerpt}</p>
        )}
        <div className="flex items-center gap-4 mt-4">
          {post.author && (
            <div className="flex items-center gap-2">
              {post.author.avatar_url && (
                <img
                  src={post.author.avatar_url}
                  alt={post.author.display_name}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span>{post.author.display_name}</span>
            </div>
          )}
          <time dateTime={post.published_at} className="text-muted-foreground">
            {new Date(post.published_at).toLocaleDateString()}
          </time>
        </div>
      </header>

      {post.featured_image && (
        <img
          src={post.featured_image}
          alt={post.title}
          className="w-full h-[400px] object-cover rounded-lg mb-8"
        />
      )}

      <div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: post.content }} />

      <footer className="mt-8 pt-8 border-t">
        <div className="flex flex-wrap gap-2">
          {post.categories?.map(({ category }) => (
            <a
              key={category.slug}
              href={`/blog/category/${category.slug}`}
              className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm"
            >
              {category.name}
            </a>
          ))}
          {post.tags?.map(({ tag }) => (
            <a
              key={tag.slug}
              href={`/blog/tag/${tag.slug}`}
              className="px-3 py-1 border rounded-full text-sm"
            >
              {tag.name}
            </a>
          ))}
        </div>
      </footer>
    </article>
  )
}
