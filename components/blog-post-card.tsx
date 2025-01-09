'use client'

import Link from 'next/link'
import { MDXContent } from './mdx-content'

interface BlogPostCardProps {
  post: {
    id: string
    slug: string
    title: string
    excerpt?: string
    featured_image?: string
    content?: string
    serializedContent?: any
    author?: {
      display_name: string
      avatar_url?: string
    }
    published_at?: string
  }
}

export function BlogPostCard({ post }: BlogPostCardProps) {
  return (
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
  )
}
