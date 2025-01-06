import { createClient } from '@supabase/supabase-js'
import { MetadataRoute } from 'next'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

  // Get all published posts
  const { data: posts } = await supabase
    .from('posts')
    .select('slug, updated_at')
    .eq('status', 'published')

  // Get all categories
  const { data: categories } = await supabase
    .from('categories')
    .select('slug, updated_at')

  // Get all tags
  const { data: tags } = await supabase
    .from('tags')
    .select('slug, updated_at')

  // Static pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
  ]

  // Blog posts
  const blogPages = posts?.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  })) || []

  // Category pages
  const categoryPages = categories?.map((category) => ({
    url: `${baseUrl}/blog/category/${category.slug}`,
    lastModified: new Date(category.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  })) || []

  // Tag pages
  const tagPages = tags?.map((tag) => ({
    url: `${baseUrl}/blog/tag/${tag.slug}`,
    lastModified: new Date(tag.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  })) || []

  return [...staticPages, ...blogPages, ...categoryPages, ...tagPages]
}
