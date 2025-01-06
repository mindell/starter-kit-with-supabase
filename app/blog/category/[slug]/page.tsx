import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { serialize } from 'next-mdx-remote/serialize'
import { MDXContent } from '@/components/mdx-content'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

// Create a Supabase client for static generation
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Generate static params for all categories
export async function generateStaticParams() {
  const { data: categories } = await supabase
    .from('categories')
    .select('slug')

  return categories?.map(({ slug }) => ({
    slug,
  })) || []
}

// Generate metadata for each category
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slugParam = await params;
  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slugParam.slug)
    .single()

  if (!category) {
    return {}
  }

  return {
    title: `${category.name} - Blog Posts`,
    description: category.description,
    openGraph: {
      title: `${category.name} - Blog Posts`,
      description: category.description,
    },
    twitter: {
      card: 'summary',
      title: `${category.name} - Blog Posts`,
      description: category.description,
    }
  }
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
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

  // Get category info
  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slugParams.slug)
    .single()

  if (!category) {
    notFound()
  }

  // Generate CollectionPage structured data
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${category.name} - Blog Posts`,
    description: category.description,
    url: `${process.env.NEXT_PUBLIC_BASE_URL}/blog/category/${category.slug}`,
  }

  // Get all published posts in this category
  const { data: posts } = await supabase
  .from('posts')
  .select(`
    *,
    author:author_profiles!posts_author_profiles_fkey (
      display_name,
      avatar_url
    ),
    post_categories!inner(category_id)
  `)
  .eq('status', 'published')
  .eq('post_categories.category_id', category.id)
  .order('published_at', { ascending: false });

  if (!posts) {
    return []
  }

  // Serialize MDX content for each post
  const postsWithSerializedContent = await Promise.all(
    posts.map(async (post) => ({
      ...post,
      serializedContent: post.content ? await serialize(post.content, {
        mdxOptions: {
          development: process.env.NODE_ENV === 'development'
        }
      }) : null
    }))
  )

  return (
    <div className="container py-8 mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/blog">Blog</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/blog/categories">Categories</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{category.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <header className="mb-8">
        <h1 className="mb-2 text-4xl font-bold">{category.name}</h1>
        {category.description && (
          <p className="text-xl text-muted-foreground">{category.description}</p>
        )}
      </header>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {postsWithSerializedContent?.map((post) => (
          <article key={post.id} className="space-y-4">
            {post.featured_image && (
              <img
                src={post.featured_image}
                alt={post.title}
                className="w-full h-48 object-cover rounded-lg"
              />
            )}
            <h2 className="text-2xl font-bold">
              <Link href={`/blog/${post.slug}`} className="hover:underline">
                {post.title}
              </Link>
            </h2>
            {post.excerpt && (
              <p className="text-muted-foreground">{post.excerpt}</p>
            )}
            {post.content && (
              <div className="prose prose-lg max-w-none">
                <MDXContent serializedContent={post.serializedContent} />
              </div>
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
              {post.published_at && (
                <time dateTime={post.published_at} className="text-sm text-muted-foreground">
                  {new Date(post.published_at).toLocaleDateString()}
                </time>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
