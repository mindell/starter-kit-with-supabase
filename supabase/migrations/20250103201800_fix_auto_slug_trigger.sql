-- Fix auto-generate slug trigger to respect provided slugs
create or replace function public.fn_auto_generate_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    -- Only generate slug if not provided
    if new.slug is null then
        -- Generate initial slug from title for posts, name for categories/tags
        if TG_TABLE_NAME = 'posts' then
            new.slug := public.fn_generate_slug(new.title);
        else
            new.slug := public.fn_generate_slug(new.name);
        end if;
        
        -- If slug exists, append a number
        while exists (
            select 1 
            from (
                select slug from public.categories
                union all
                select slug from public.tags
                union all
                select slug from public.posts
            ) as slugs
            where slugs.slug = new.slug
        ) loop
            new.slug := new.slug || '-' || floor(random() * 1000)::text;
        end loop;
    end if;
    
    return new;
end;
$$;
