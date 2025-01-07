import { Metadata } from 'next'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { SearchBar } from '@/components/search/search-bar'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

export const metadata: Metadata = {
  title: 'Search Blog Posts',
  description: 'Search through our blog posts',
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; tag?: string; page?: string }>
}) {
  const params = await searchParams
  const query = await params.q
  const category = params.category
  const tag = params.tag
  const page = parseInt(params.page || '1')
  const limit = 10

  const supabase = await createClient()

  let posts = []
  let total = 0

  if (query) {
    // Get search results using the database function
    const { data: searchResults, error: searchError } = await supabase
      .rpc('search_posts', {
        search_query: query,
        category_slug: category,
        tag_slug: tag
      })

    // console.log('Search query:', query)
    // console.log('Search results:', searchResults)
    // console.log('Search error:', searchError)

    // Get example post search vector
    const { data: vectorData, error: postError } = await supabase
      .from('posts')
      .select('*')
      .eq('title', 'Hello blog!')
      .single()

    // console.log('Post data:', vectorData)
    // console.log('Post error:', postError)

    if (vectorData) {
      const { data: searchVector, error: vectorError } = await supabase
        .rpc('show_search_vector', {
          post_id: vectorData.id
        })
      console.log('Search vector for Hello blog!:', searchVector)
      console.log('Vector error:', vectorError)
    }

    if (!searchError && searchResults?.length > 0) {
      // Get the full post data for the search results
      const { data, count, error } = await supabase
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
        `, { count: 'exact' })
        .in('id', searchResults.map(r => r.id))
        .eq('status', 'published')
        .lte('published_at', new Date().toISOString())
        .range((page - 1) * limit, page * limit - 1)
        .order('published_at', { ascending: false })

      if (!error) {
        posts = data
        total = count || 0
      }

      // Log search analytics
      if (posts.length > 0) {
        await supabase.rpc('log_search', {
          search_query: query,
          category: category,
          tag: tag,
          count: total
        })
      }
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="container py-8 mx-auto">
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
            <BreadcrumbPage>Search</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="max-w-2xl mx-auto space-y-8">
        <SearchBar />

        {query ? (
          <>
            <h1 className="text-2xl font-bold">
              Search Results for "{query}"
              {total > 0 && <span className="text-muted-foreground ml-2">({total} results)</span>}
            </h1>

            {posts.length > 0 ? (
              <div className="space-y-8">
                {posts.map((post) => (
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
                        <time
                          dateTime={post.published_at}
                          className="text-sm text-muted-foreground"
                        >
                          {new Date(post.published_at).toLocaleDateString()}
                        </time>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {post.categories?.map(({ category }) => (
                        <Link
                          key={category.slug}
                          href={`/blog/category/${category.slug}`}
                          className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm"
                        >
                          {category.name}
                        </Link>
                      ))}
                      {post.tags?.map(({ tag }) => (
                        <Link
                          key={tag.slug}
                          href={`/blog/tag/${tag.slug}`}
                          className="px-3 py-1 border rounded-full text-sm"
                        >
                          {tag.name}
                        </Link>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No posts found matching your search.</p>
            )}

            {totalPages > 1 && (
              <div className="flex justify-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <Link
                    key={pageNum}
                    href={{
                      pathname: '/blog/search',
                      query: {
                        ...searchParams,
                        page: pageNum.toString(),
                      },
                    }}
                    className={`px-4 py-2 rounded-md ${
                      pageNum === page
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary hover:bg-secondary/80'
                    }`}
                  >
                    {pageNum}
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Search Blog Posts</h1>
            <p className="text-muted-foreground">
              Enter a search term above to find blog posts.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
