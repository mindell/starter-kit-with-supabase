import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { nanoid } from 'nanoid'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const category = searchParams.get('category')
    const tag = searchParams.get('tag')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit
    const sessionId = searchParams.get('sid') || nanoid()

    // Create Supabase client\
    const supabase = await createClient()
    
    // Get search results
    const { data: posts, error, count } = await supabase
      .rpc('search_posts', {
        search_query: query,
        category_slug: category,
        tag_slug: tag
      })
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
      .range(offset, offset + limit - 1)
      .order('published_at', { ascending: false })

    if (error) {
      console.error('Search error:', error)
      return NextResponse.json(
        { error: 'Failed to search posts' },
        { status: 500 }
      )
    }

    // Log search analytics
    if (query) {
      await supabase.rpc('log_search', {
        search_query: query,
        category: category,
        tag: tag,
        count: count || 0,
        session: sessionId
      })
    }

    return NextResponse.json({
      posts,
      metadata: {
        total: count || 0,
        page,
        limit,
        totalPages: count ? Math.ceil(count / limit) : 0,
        sessionId
      }
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Failed to search posts' },
      { status: 500 }
    )
  }
}
