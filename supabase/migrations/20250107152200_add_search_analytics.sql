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

-- Create function to get search suggestions
create or replace function get_search_suggestions(
    search_prefix text,
    category_filter text default null,
    tag_filter text default null,
    days_limit integer default 30,
    max_suggestions integer default 5
)
returns table (
    query text,
    count bigint
)
language sql
stable
as $$
    select 
        query,
        count(*) as count
    from public.search_analytics
    where 
        query ilike search_prefix || '%'
        and created_at > now() - (days_limit || ' days')::interval
        and (
            category_filter is null 
            or category_slug = category_filter
        )
        and (
            tag_filter is null 
            or tag_slug = tag_filter
        )
    group by query
    order by count desc
    limit max_suggestions;
$$;
