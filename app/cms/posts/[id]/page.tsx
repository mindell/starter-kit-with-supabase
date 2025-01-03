import { createClient } from "@/utils/supabase/server"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit } from "lucide-react"
import Link from "next/link"
import { serialize } from 'next-mdx-remote/serialize'
import { MDXContent } from '@/components/mdx-content'

export default async function PostViewPage({
  params,
}: {
  params:  Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const idParams = await params;
  // Get post with author and category information
  const { data: post, error } = await supabase
    .from("posts")
    .select(`
      *,
      author:author_profiles!posts_author_profiles_fkey (
        display_name,
        avatar_url,
        email
      ),
      categories:post_categories (
        category:categories(name)
      )
    `)
    .eq("id", idParams.id)
    .single()

  if (error) {
    console.error("Error fetching post:", error)
    return <div>Error loading post</div>
  }

  if (!post) {
    return <div>Post not found</div>
  }
  const serializedContent = await serialize(post.content, {
    mdxOptions: {
      development: process.env.NODE_ENV === 'development'
    }
  })
  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-100 text-green-800"
      case "draft":
        return "bg-yellow-100 text-yellow-800"
      case "archived":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">View Post</h1>
        <div className="space-x-2">
          <Link href={`/cms/posts/${idParams.id}/edit`}>
            <Button variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Link href="/cms/posts">
            <Button variant="outline">Back to Posts</Button>
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        {/* Post Header */}
        <div className="space-y-4">
          <h2 className="text-3xl font-bold">{post.title}</h2>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>By {post.author?.display_name}</span>
            <span>•</span>
            <span>{formatDate(post.created_at)}</span>
            <span>•</span>
            <Badge className={getStatusColor(post.status.toLowerCase())}>
              {post.status}
            </Badge>
          </div>
        </div>

        {/* Categories */}
        {post.categories && post.categories.length > 0 && (
          <div className="flex gap-2">
            {post.categories.map((cat: any) => (
              <Badge key={cat.category.name} variant="outline">
                {cat.category.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Excerpt */}
        {post.excerpt && (
          <div className="prose max-w-none">
            <p className="text-lg text-gray-600">{post.excerpt}</p>
          </div>
        )}

        {/* Content */}
        <div className="prose max-w-none">
          <MDXContent serializedContent={serializedContent} />
        </div>

        {/* SEO Info */}
        {(post.seo_title || post.seo_description) && (
          <div className="border-t pt-6 mt-6">
            <h3 className="text-lg font-semibold mb-4">SEO Information</h3>
            {post.seo_title && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  SEO Title
                </label>
                <p className="mt-1">{post.seo_title}</p>
              </div>
            )}
            {post.seo_description && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  SEO Description
                </label>
                <p className="mt-1">{post.seo_description}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
