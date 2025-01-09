import { createClient } from '@/utils/supabase/server'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  Breadcrumb,
  BreadcrumbSeparator,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbList,
} from '@/components/ui/breadcrumb'

// Generate static params for all tags
export async function generateStaticParams() {
  // Create a Supabase client for static generation
  const supabase = await createClient(true)
  const { data: tags } = await supabase
    .from('tags')
    .select('slug')

  return tags?.map(({ slug }) => ({
    slug,
  })) || []
}

// Generate metadata for each tag
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  // Create a Supabase client for static generation
  const supabase = await createClient(true)
  const slugParam = await params;
  const { data: tag } = await supabase
    .from('tags')
    .select('*')
    .eq('slug', slugParam.slug)
    .single()

  if (!tag) {
    return {}
  }

  return {
    title: `${tag.name} - Blog Posts`,
    description: tag.description,
    openGraph: {
      title: `${tag.name} - Blog Posts`,
      description: tag.description,
    },
    twitter: {
      card: 'summary',
      title: `${tag.name} - Blog Posts`,
      description: tag.description,
    }
  }
}

export default async function TagPage({ params }: { params: Promise<{ slug: string }> }) {
  const slugParams = await params
  const supabase = await createClient()

  // Get tag info
  const { data: tag } = await supabase
    .from('tags')
    .select('*')
    .eq('slug', slugParams.slug)
    .single()

  if (!tag) {
    notFound()
  }

  // Get all published posts with this tag
  const { data: posts } = await supabase
    .from('posts')
    .select(`
      *,
      author:author_profiles!posts_author_profiles_fkey (
        display_name,
        avatar_url
      ),
      post_tags!inner(tag_id)
    `)
    .eq('status', 'published')
    .eq('post_tags.tag_id', tag.id)
    .order('published_at', { ascending: false })

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
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
            <BreadcrumbPage>{tag.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-4">{tag.name}</h1>
        {tag.description && (
          <p className="text-xl text-gray-600">{tag.description}</p>
        )}
      </header>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {posts?.map((post) => (
          <article key={post.id} className="flex flex-col space-y-4">
            {post.featured_image && (
              <Link href={`/blog/${post.slug}`} className="block">
                <img
                  src={post.featured_image}
                  alt={post.title}
                  className="w-full h-48 object-cover rounded-lg hover:opacity-90 transition-opacity"
                />
              </Link>
            )}
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">
                <Link href={`/blog/${post.slug}`} className="hover:text-indigo-600 transition-colors">
                  {post.title}
                </Link>
              </h2>
              {post.excerpt && (
                <p className="text-gray-600 mb-4">{post.excerpt}</p>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              {post.author && (
                <div className="flex items-center gap-2">
                  {post.author.avatar_url && (
                    <img
                      src={post.author.avatar_url}
                      alt={post.author.display_name}
                      className="w-6 h-6 rounded-full"
                    />
                  )}
                  <span>{post.author.display_name}</span>
                </div>
              )}
              {post.published_at && (
                <time dateTime={post.published_at}>
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
