import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { apiMiddleware } from '@/utils/api/middleware';

export async function GET(request: NextRequest) {
  return apiMiddleware(request, async () => {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || 'published';
    const category = searchParams.get('category');
    const tag = searchParams.get('tag');

    let query = supabase
      .from('posts')
      .select(`
        id,
        title,
        content,
        status,
        published_at,
        created_at,
        updated_at,
        author:author_profiles!posts_author_profiles_fkey (
          author_id,
          display_name,
          avatar_url
        ),
        categories:post_categories (
          category:categories (
            id,
            name,
            slug
          )
        ),
        tags:post_tags (
          tag:tags (
            id,
            name,
            slug
          )
        )
      `);

    // If user is authenticated, handle user-specific data
    const user = (request as any).user;
    const userRoles = (request as any).userRoles || [];
    const isAdmin = userRoles.includes('admin');
    const path = request.nextUrl.pathname;

    if (path.endsWith('/my')) {
      // User's own posts
      if (!user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
      query = query.eq('author_id', user.id);
    } else {
      // Public posts or filtered by role
      if (status === 'published' || isAdmin) {
        query = query.eq('status', status);
      } else {
        // Non-admin users can only see their own non-published posts
        query = query
          .eq('status', status)
          .eq('author_id', user?.id || '');
      }
    }

    // Apply filters
    if (category) {
      query = query.contains('categories', [{ category_id: category }]);
    }

    if (tag) {
      query = query.contains('tags', [{ tag_id: tag }]);
    }

    // Apply pagination
    query = query
      .order('published_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    const { data: posts, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: count ? Math.ceil(count / limit) : 0,
      },
    });
  });
}

export async function POST(request: NextRequest) {
  return apiMiddleware(request, async () => {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await request.json();
    const {
      title,
      content,
      excerpt,
      featured_image,
      status,
      categories,
      tags,
      seo_title,
      seo_description,
      seo_keywords,
      canonical_url,
      structured_data,
      is_indexable,
    } = body;

    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        title,
        content,
        excerpt,
        featured_image,
        author_id: user?.id,
        status,
        published_at: status === 'published' ? new Date().toISOString() : null,
        seo_title,
        seo_description,
        seo_keywords,
        canonical_url,
        structured_data,
        is_indexable,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Add categories
    if (categories?.length) {
      await supabase
        .from('post_categories')
        .insert(
          categories.map((categoryId: string) => ({
            post_id: post.id,
            category_id: categoryId,
          }))
        );
    }

    // Add tags
    if (tags?.length) {
      await supabase
        .from('post_tags')
        .insert(
          tags.map((tagId: string) => ({
            post_id: post.id,
            tag_id: tagId,
          }))
        );
    }

    return NextResponse.json(post);
  });
}
