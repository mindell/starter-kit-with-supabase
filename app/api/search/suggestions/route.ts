import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const prefix = searchParams.get('q') || ''
    const category = searchParams.get('category')
    const tag = searchParams.get('tag')

    const supabase = await createClient()

    // Build query for popular search queries
    let query = supabase
      .from('search_analytics')
      .select('query, results_count')
      .ilike('query', `${prefix}%`)
      .gt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    // Add filters only if they are provided
    if (category) {
      query = query.eq('category_slug', category)
    }
    if (tag) {
      query = query.eq('tag_slug', tag)
    }

    // Execute query with order and limit
    const { data: suggestions, error } = await query
      .order('results_count', { ascending: false })
      .limit(5)

    if (error) {
      console.error('Suggestions error:', error)
      return NextResponse.json(
        { error: 'Failed to get suggestions' },
        { status: 500 }
      )
    }

    // Get matching post titles as additional suggestions
    const { data: titleSuggestions, error: titleError } = await supabase
      .from('posts')
      .select('title')
      .eq('status', 'published')
      .lte('published_at', new Date().toISOString())
      .ilike('title', `%${prefix}%`)
      .limit(3)

    // Combine suggestions
    let allSuggestions = suggestions?.map(s => ({
      query: s.query,
      count: s.results_count
    })) || []

    if (!titleError && titleSuggestions) {
      allSuggestions = allSuggestions.concat(
        titleSuggestions.map(post => ({
          query: post.title,
          count: 0
        }))
      )
    }

    // Remove duplicates and sort
    const uniqueSuggestions = allSuggestions.reduce((acc: any[], curr) => {
      if (!acc.find(s => s.query.toLowerCase() === curr.query.toLowerCase())) {
        acc.push(curr)
      }
      return acc
    }, [])

    return NextResponse.json({ 
      suggestions: uniqueSuggestions.sort((a, b) => b.count - a.count)
    })
  } catch (error) {
    console.error('Suggestions error:', error)
    return NextResponse.json(
      { error: 'Failed to get suggestions' },
      { status: 500 }
    )
  }
}
