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
    const parentId = searchParams.get('parent_id');
    const includeChildren = searchParams.get('include_children') === 'true';

    let query = supabase
      .from('categories')
      .select('*, posts:post_categories(count)');

    if (parentId) {
      query = query.eq('parent_id', parentId);
    } else if (!includeChildren) {
      query = query.is('parent_id', null);
    }

    const { data: categories, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ categories });
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

    const body = await request.json();
    const { name, slug, description, parent_id, seo_title, seo_description } = body;

    const { data: category, error } = await supabase
      .from('categories')
      .insert({
        name,
        slug,
        description,
        parent_id,
        seo_title,
        seo_description,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(category);
  });
}
