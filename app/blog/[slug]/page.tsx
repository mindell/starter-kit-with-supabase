import { createClient } from '@/utils/supabase/server'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { MDXContent } from '@/components/mdx-content'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {Category, Tag} from '@/types/blog'
import { Suspense } from 'react'
import MarkdownIt from 'markdown-it'

// Generate static params for all published posts
export async function generateStaticParams() {
  // Create a Supabase client for static generation
  const supabase = await createClient(true)
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
  // Create a Supabase client for static generation
  const supabase = await createClient(true)
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

  const categories = post.categories?.map(({category}:Category) => category.name).join(', ')
  
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
  const supabase = await createClient()

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

  const md = new MarkdownIt()

  return (
    <article className="max-w-2xl mx-auto px-4 py-8">
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
            <BreadcrumbPage>{post.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
        {post.excerpt && (
          <p className="text-xl text-gray-600 mb-4">{post.excerpt}</p>
        )}
        <div className="flex items-center text-gray-600">
          {post.author?.avatar_url && (
            <img
              src={post.author.avatar_url}
              alt={post.author.display_name}
              className="w-10 h-10 rounded-full mr-3"
            />
          )}
          <div>
            <p className="font-medium">{post.author?.display_name}</p>
            <p className="text-sm">
              {new Date(post.published_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </header>

      {post.featured_image && (
        <img
          src={post.featured_image}
          alt={post.title}
          className="w-full h-64 object-cover rounded-lg mb-8"
        />
      )}

      <div className="prose prose-lg max-w-none">
        <Suspense fallback={<div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>}>
          <div dangerouslySetInnerHTML={{ __html: md.render(post.content || '') }} />
        </Suspense>
      </div>

      <footer className="mt-8 pt-8 border-t">
        <div className="flex flex-wrap gap-2 mb-4">
          {post.categories?.map(({category}: Category) => (
            <a
              key={category.slug}
              href={`/blog/category/${category.slug}`}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-sm"
            >
              {category.name}
            </a>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {post.tags?.map(({tag}: Tag) => (
            <a
              key={tag.slug}
              href={`/blog/tag/${tag.slug}`}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-sm"
            >
              {tag.name}
            </a>
          ))}
        </div>
      </footer>
    </article>
  )
}
