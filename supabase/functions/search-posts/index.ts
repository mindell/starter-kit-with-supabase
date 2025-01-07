import { serve } from 'https://deno.fresh.dev/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface SearchParams {
  search_query?: string
  category_slug?: string
  tag_slug?: string
  page?: number
  limit?: number
}

serve(async (req) => {
  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get search parameters
    const { search_query, category_slug, tag_slug, page = 1, limit = 10 }: SearchParams = await req.json()
    const offset = (page - 1) * limit

    console.log('Search params:', { search_query, category_slug, tag_slug, page, limit })

    // Get search results using the search_posts function
    const { data: searchResults, error: searchError } = await supabaseClient
      .rpc('search_posts', {
        search_query,
        category_slug,
        tag_slug
      })

    console.log('Search results:', searchResults)
    console.log('Search error:', searchError)

    if (searchError) {
      throw searchError
    }

    // Sort results by sort_rank and published_at (already done by the function)
    const paginatedResults = searchResults.slice(offset, offset + limit)

    // Log search analytics
    if (search_query) {
      await supabaseClient.rpc('log_search', {
        search_query,
        category: category_slug,
        tag: tag_slug,
        count: searchResults.length
      })
    }

    // Return paginated results with metadata
    return new Response(
      JSON.stringify({
        posts: paginatedResults,
        metadata: {
          total: searchResults.length,
          page,
          limit,
          totalPages: Math.ceil(searchResults.length / limit)
        }
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Search error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
