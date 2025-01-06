-- Add columns to posts table
alter table public.posts
    add column if not exists status text default 'draft' check (status in ('draft', 'published', 'archived')),
    add column if not exists published_at timestamptz;

-- Create indexes for better performance
create index if not exists posts_author_id_idx on public.posts(author_id);
create index if not exists posts_status_idx on public.posts(status);
create index if not exists posts_published_at_idx on public.posts(published_at);

-- Create junction tables for many-to-many relationships
create table if not exists public.post_categories (
    post_id uuid references public.posts(id) on delete cascade,
    category_id uuid references public.categories(id) on delete cascade,
    primary key (post_id, category_id)
);

create table if not exists public.post_tags (
    post_id uuid references public.posts(id) on delete cascade,
    tag_id uuid references public.tags(id) on delete cascade,
    primary key (post_id, tag_id)
);

-- Add RLS policies for posts
alter table public.posts enable row level security;

-- Drop existing policies
drop policy if exists "Posts are viewable by everyone" on public.posts;
drop policy if exists "Users can create posts" on public.posts;
drop policy if exists "Users can update own posts" on public.posts;
drop policy if exists "Users can delete own posts" on public.posts;

-- Create new policies
create policy "Published posts are viewable by everyone"
    on public.posts for select
    using (
        status = 'published' 
        or 
        (auth.uid() = author_id)
        or
        exists (
            select 1 from public.roles_assignment ra
            where ra.user_id = auth.uid()
            and ra.role_id in (
                select role_id from public.user_roles 
                where role_name in ('super_admin', 'admin', 'editor')
            )
        )
    );

create policy "Authors can create posts"
    on public.posts for insert
    with check (
        auth.uid() = author_id
        and
        exists (
            select 1 from public.roles_assignment ra
            where ra.user_id = auth.uid()
            and ra.role_id in (
                select role_id from public.user_roles 
                where role_name in ('super_admin', 'admin', 'editor', 'author')
            )
        )
    );

create policy "Authors can update own posts"
    on public.posts for update
    using (
        auth.uid() = author_id
        or
        exists (
            select 1 from public.roles_assignment ra
            where ra.user_id = auth.uid()
            and ra.role_id in (
                select role_id from public.user_roles 
                where role_name in ('super_admin', 'admin', 'editor')
            )
        )
    );

create policy "Authors can delete own posts"
    on public.posts for delete
    using (
        auth.uid() = author_id
        or
        exists (
            select 1 from public.roles_assignment ra
            where ra.user_id = auth.uid()
            and ra.role_id in (
                select role_id from public.user_roles 
                where role_name in ('super_admin', 'admin')
            )
        )
    );

-- Add RLS policies for post relationships
alter table public.post_categories enable row level security;
alter table public.post_tags enable row level security;

-- Create policies for post_categories
create policy "Post categories inherit post permissions"
    on public.post_categories for select
    using (
        exists (
            select 1 from public.posts p
            where p.id = post_id
            and (
                p.status = 'published'
                or p.author_id = auth.uid()
                or exists (
                    select 1 from public.roles_assignment ra
                    where ra.user_id = auth.uid()
                    and ra.role_id in (
                        select role_id from public.user_roles 
                        where role_name in ('super_admin', 'admin', 'editor')
                    )
                )
            )
        )
    );

-- Create policies for post_tags
create policy "Post tags inherit post permissions"
    on public.post_tags for select
    using (
        exists (
            select 1 from public.posts p
            where p.id = post_id
            and (
                p.status = 'published'
                or p.author_id = auth.uid()
                or exists (
                    select 1 from public.roles_assignment ra
                    where ra.user_id = auth.uid()
                    and ra.role_id in (
                        select role_id from public.user_roles 
                        where role_name in ('super_admin', 'admin', 'editor')
                    )
                )
            )
        )
    );
