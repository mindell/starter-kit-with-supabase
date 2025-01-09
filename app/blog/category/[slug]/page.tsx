import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { serialize } from 'next-mdx-remote/serialize'
import { BlogPostCard } from '@/components/blog-post-card'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'



// Generate static params for all categories
export async function generateStaticParams() {
  // Create a Supabase client for static generation
  const supabase = await createClient(true)
  const { data: categories } = await supabase
    .from('categories')
    .select('slug')

  return categories?.map(({ slug }) => ({
    slug,
  })) || []
}

// Generate metadata for each category
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  // Create a Supabase client for static generation
  const supabase = await createClient(true)
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
  // Create a Supabase client for static generation
  const supabase = await createClient()

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
          <BlogPostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  )
}
