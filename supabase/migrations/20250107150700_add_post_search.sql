-- Add search vector column to posts
alter table public.posts
    add column if not exists search_vector tsvector
    generated always as (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(excerpt, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(content, '')), 'C')
    ) stored;

-- Create GIN index for fast full-text search
create index if not exists posts_search_vector_idx
    on public.posts using gin(search_vector);

-- Function to show search vector
create or replace function show_search_vector(post_id uuid)
returns table (
    title text,
    content text,
    search_vector tsvector
)
language sql
stable
as $$
    select 
        title,
        content,
        search_vector
    from public.posts
    where id = post_id;
$$;

-- Create function for searching posts
create or replace function search_posts(
    search_query text,
    category_slug text default null,
    tag_slug text default null
)
returns table (
    id uuid,
    title text,
    slug text,
    excerpt text,
    featured_image text,
    content text,
    status text,
    published_at timestamptz,
    created_at timestamptz,
    updated_at timestamptz,
    author_id uuid,
    search_vector tsvector,
    search_rank real,
    sort_rank real
)
language sql
stable
as $$
    select distinct
        p.id,
        p.title,
        p.slug,
        p.excerpt,
        p.featured_image,
        p.content,
        p.status,
        p.published_at,
        p.created_at,
        p.updated_at,
        p.author_id,
        p.search_vector,
        ts_rank(p.search_vector, websearch_to_tsquery('english', search_query)) as search_rank,
        case when search_query is not null 
            then ts_rank(p.search_vector, websearch_to_tsquery('english', search_query))
            else 0
        end as sort_rank
    from public.posts p
    left join public.post_categories pc on p.id = pc.post_id
    left join public.categories c on pc.category_id = c.id
    left join public.post_tags pt on p.id = pt.post_id
    left join public.tags t on pt.tag_id = t.id
    where
        p.status = 'published'
        and p.published_at <= now()
        and (
            search_query is null
            or p.search_vector @@ websearch_to_tsquery('english', search_query)
        )
        and (
            category_slug is null
            or c.slug = category_slug
        )
        and (
            tag_slug is null
            or t.slug = tag_slug
        )
    order by
        sort_rank desc,
        p.published_at desc;
$$;

-- Create search analytics table
create table if not exists public.search_analytics (
    id uuid primary key default gen_random_uuid(),
    query text not null,
    category_slug text,
    tag_slug text,
    results_count integer not null,
    created_at timestamptz default now(),
    user_id uuid references auth.users(id),
    session_id text
);

-- Create indexes for analytics queries
create index if not exists search_analytics_query_idx on public.search_analytics(query);
create index if not exists search_analytics_created_at_idx on public.search_analytics(created_at);
create index if not exists search_analytics_user_id_idx on public.search_analytics(user_id);

-- Create function to log search
create or replace function log_search(
    search_query text,
    category text default null,
    tag text default null,
    count integer default 0,
    session text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
    new_id uuid;
begin
    insert into public.search_analytics (
        query,
        category_slug,
        tag_slug,
        results_count,
        user_id,
        session_id
    ) values (
        search_query,
        category,
        tag,
        count,
        auth.uid(),
        session
    )
    returning id into new_id;
    
    return new_id;
end;
$$;
