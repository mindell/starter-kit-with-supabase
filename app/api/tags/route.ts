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
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || 'name';
    const order = searchParams.get('order') || 'asc';

    let query = supabase
      .from('tags')
      .select('*, posts:post_tags(count)');

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    query = query.order(sort, { ascending: order === 'asc' });

    const { data: tags, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tags });
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
    const { name, slug, description } = body;

    const { data: tag, error } = await supabase
      .from('tags')
      .insert({
        name,
        slug,
        description,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(tag);
  });
}
