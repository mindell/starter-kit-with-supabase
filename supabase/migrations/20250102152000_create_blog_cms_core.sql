-- Migration file: Blog/CMS Core Features
-- Description: Creates tables for posts, categories, tags, media, and SEO features
-- Author: Cascade AI
-- Date: 2025-01-02

-- Create enum types for post status
create type public.post_status as enum ('draft', 'published', 'archived');

-- Create posts table
create table public.posts (
    id uuid primary key default uuid_generate_v4(),
    title text not null,
    slug text not null unique,
    content text,
    excerpt text,
    featured_image uuid,
    author_id uuid not null references auth.users(id),
    status public.post_status default 'draft',
    published_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    -- SEO fields
    seo_title text,
    seo_description text,
    seo_keywords text[],
    canonical_url text,
    structured_data jsonb,
    is_indexable boolean default true,
    constraint title_length check (char_length(title) >= 1 and char_length(title) <= 255),
    constraint excerpt_length check (excerpt is null or char_length(excerpt) <= 500),
    constraint seo_title_length check (seo_title is null or char_length(seo_title) <= 60),
    constraint seo_description_length check (seo_description is null or char_length(seo_description) <= 160)
);

-- Create post versions table for version history
create table public.post_versions (
    id uuid primary key default uuid_generate_v4(),
    post_id uuid not null references public.posts(id) on delete cascade,
    title text not null,
    content text,
    excerpt text,
    version_number integer not null,
    created_by uuid not null references auth.users(id),
    created_at timestamptz default now(),
    constraint version_number_positive check (version_number > 0)
);

-- Create categories table
create table public.categories (
    id uuid primary key default uuid_generate_v4(),
    name text not null unique,
    slug text not null unique,
    description text,
    parent_id uuid references public.categories(id),
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    -- SEO fields
    seo_title text,
    seo_description text,
    constraint name_length check (char_length(name) >= 1 and char_length(name) <= 100),
    constraint description_length check (description is null or char_length(description) <= 500)
);

-- Create tags table
create table public.tags (
    id uuid primary key default uuid_generate_v4(),
    name text not null unique,
    slug text not null unique,
    description text,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    constraint name_length check (char_length(name) >= 1 and char_length(name) <= 100)
);

-- Create post_categories junction table
create table public.post_categories (
    post_id uuid not null references public.posts(id) on delete cascade,
    category_id uuid not null references public.categories(id) on delete cascade,
    created_at timestamptz default now(),
    primary key (post_id, category_id)
);

-- Create post_tags junction table
create table public.post_tags (
    post_id uuid not null references public.posts(id) on delete cascade,
    tag_id uuid not null references public.tags(id) on delete cascade,
    created_at timestamptz default now(),
    primary key (post_id, tag_id)
);

-- Create media table
create table public.media (
    id uuid primary key default uuid_generate_v4(),
    filename text not null,
    filepath text not null,
    filesize bigint not null,
    mimetype text not null,
    width integer,
    height integer,
    alt_text text,
    caption text,
    uploaded_by uuid not null references auth.users(id),
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    metadata jsonb default '{}'::jsonb,
    storage_bucket text not null,
    storage_key text not null unique,
    is_optimized boolean default false,
    constraint filesize_positive check (filesize > 0),
    constraint dimensions_positive check (
        (width is null or width > 0) and
        (height is null or height > 0)
    )
);

-- Create media_versions table for different sizes
create table public.media_versions (
    id uuid primary key default uuid_generate_v4(),
    media_id uuid not null references public.media(id) on delete cascade,
    version_type text not null, -- 'thumbnail', 'small', 'medium', 'large', 'webp'
    width integer,
    height integer,
    filesize bigint not null,
    filepath text not null,
    storage_key text not null unique,
    created_at timestamptz default now(),
    constraint filesize_positive check (filesize > 0),
    constraint dimensions_positive check (
        (width is null or width > 0) and
        (height is null or height > 0)
    )
);

-- Function to update updated_at timestamp
create or replace function public.fn_update_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- Create triggers for updating updated_at
create trigger update_posts_updated_at
    before update on public.posts
    for each row
    execute function public.fn_update_updated_at();

create trigger update_categories_updated_at
    before update on public.categories
    for each row
    execute function public.fn_update_updated_at();

create trigger update_tags_updated_at
    before update on public.tags
    for each row
    execute function public.fn_update_updated_at();

create trigger update_media_updated_at
    before update on public.media
    for each row
    execute function public.fn_update_updated_at();

-- Function to generate slug
create or replace function public.fn_generate_slug(title text)
returns text
language plpgsql
immutable
security definer
set search_path = public
as $$
declare
    slug text;
begin
    -- Convert to lowercase and replace spaces with hyphens
    slug := lower(title);
    -- Remove special characters
    slug := regexp_replace(slug, '[^a-z0-9\s-]', '', 'g');
    -- Replace spaces with hyphens
    slug := regexp_replace(slug, '\s+', '-', 'g');
    -- Remove multiple consecutive hyphens
    slug := regexp_replace(slug, '-+', '-', 'g');
    -- Remove leading and trailing hyphens
    slug := trim(both '-' from slug);
    return slug;
end;
$$;

-- Function to auto-generate slug before insert
create or replace function public.fn_auto_generate_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    -- Generate initial slug
    new.slug := public.fn_generate_slug(new.name);
    
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
    
    return new;
end;
$$;

-- Create triggers for auto-generating slugs
create trigger auto_generate_category_slug
    before insert on public.categories
    for each row
    execute function public.fn_auto_generate_slug();

create trigger auto_generate_tag_slug
    before insert on public.tags
    for each row
    execute function public.fn_auto_generate_slug();

create trigger auto_generate_post_slug
    before insert on public.posts
    for each row
    execute function public.fn_auto_generate_slug();

-- Enable RLS on all tables
alter table public.posts enable row level security;
alter table public.post_versions enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.post_categories enable row level security;
alter table public.post_tags enable row level security;
alter table public.media enable row level security;
alter table public.media_versions enable row level security;

-- RLS Policies

-- Posts policies
create policy "Posts are viewable by everyone when published"
    on public.posts
    for select
    to authenticated, anon
    using (status = 'published');

create policy "Posts are viewable by author regardless of status"
    on public.posts
    for select
    to authenticated
    using (author_id = auth.uid());

create policy "Posts can be updated by author"
    on public.posts
    for update
    to authenticated
    using (author_id = auth.uid())
    with check (author_id = auth.uid());

create policy "Posts can be deleted by author"
    on public.posts
    for delete
    to authenticated
    using (author_id = auth.uid());

create policy "Posts can be created by authors and editors"
    on public.posts
    for insert
    to authenticated
    with check (
        exists (
            select 1 from public.roles_assignment ra
            join public.user_roles ur on ra.role_id = ur.role_id
            where ra.user_id = auth.uid()
            and ur.role_name in ('author', 'editor', 'admin', 'super_admin')
        )
    );

-- Post versions policies
create policy "Post versions are viewable by post author"
    on public.post_versions
    for select
    to authenticated
    using (
        exists (
            select 1 from public.posts
            where posts.id = post_versions.post_id
            and posts.author_id = auth.uid()
        )
    );

-- Categories policies
create policy "Categories are viewable by everyone"
    on public.categories
    for select
    to authenticated, anon
    using (true);

create policy "Categories can be managed by editors and admins"
    on public.categories
    for all
    to authenticated
    using (
        exists (
            select 1 from public.roles_assignment ra
            join public.user_roles ur on ra.role_id = ur.role_id
            where ra.user_id = auth.uid()
            and ur.role_name in ('editor', 'admin', 'super_admin')
        )
    );

-- Tags policies
create policy "Tags are viewable by everyone"
    on public.tags
    for select
    to authenticated, anon
    using (true);

create policy "Tags can be managed by authors and editors"
    on public.tags
    for all
    to authenticated
    using (
        exists (
            select 1 from public.roles_assignment ra
            join public.user_roles ur on ra.role_id = ur.role_id
            where ra.user_id = auth.uid()
            and ur.role_name in ('author', 'editor', 'admin', 'super_admin')
        )
    );

-- Post categories policies
create policy "Post categories are viewable by everyone"
    on public.post_categories
    for select
    to authenticated, anon
    using (true);

create policy "Post categories can be managed by post author"
    on public.post_categories
    for all
    to authenticated
    using (
        exists (
            select 1 from public.posts
            where posts.id = post_categories.post_id
            and posts.author_id = auth.uid()
        )
    );

-- Post tags policies
create policy "Post tags are viewable by everyone"
    on public.post_tags
    for select
    to authenticated, anon
    using (true);

create policy "Post tags can be managed by post author"
    on public.post_tags
    for all
    to authenticated
    using (
        exists (
            select 1 from public.posts
            where posts.id = post_tags.post_id
            and posts.author_id = auth.uid()
        )
    );

-- Media policies
create policy "Media is viewable by everyone"
    on public.media
    for select
    to authenticated, anon
    using (true);

create policy "Media can be managed by uploader"
    on public.media
    for all
    to authenticated
    using (uploaded_by = auth.uid())
    with check (uploaded_by = auth.uid());

-- Media versions policies
create policy "Media versions are viewable by everyone"
    on public.media_versions
    for select
    to authenticated, anon
    using (true);
