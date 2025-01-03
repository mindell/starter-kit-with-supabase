-- Migration file: Add Posts RLS Policies
-- Description: Adds Row Level Security policies for posts table
-- Author: Cascade AI
-- Date: 2025-01-03

-- Enable RLS on posts table
alter table public.posts enable row level security;

-- Super admin and admin can do everything
create policy "Super admin and admin can do everything"
    on public.posts
    for all
    to authenticated
    using (fn_is_admin_or_super_admin(auth.uid()));

-- Editor can view all posts and edit any post
create policy "Editor can view and edit all posts"
    on public.posts
    for select
    to authenticated
    using (
        exists (
            select 1
            from roles_assignment ra
            join user_roles ur on ra.role_id = ur.role_id
            where ra.user_id = auth.uid()
            and ur.role_name = 'editor'
        )
    );

create policy "Editor can edit all posts"
    on public.posts
    for update
    to authenticated
    using (
        exists (
            select 1
            from roles_assignment ra
            join user_roles ur on ra.role_id = ur.role_id
            where ra.user_id = auth.uid()
            and ur.role_name = 'editor'
        )
    );

-- Author can view all published posts and manage their own posts
create policy "Author can view all published posts"
    on public.posts
    for select
    to authenticated
    using (
        exists (
            select 1
            from roles_assignment ra
            join user_roles ur on ra.role_id = ur.role_id
            where ra.user_id = auth.uid()
            and ur.role_name = 'author'
        )
        and (
            status = 'published'::post_status
            or author_id = auth.uid()
        )
    );

create policy "Author can manage their own posts"
    on public.posts
    for all
    to authenticated
    using (
        exists (
            select 1
            from roles_assignment ra
            join user_roles ur on ra.role_id = ur.role_id
            where ra.user_id = auth.uid()
            and ur.role_name = 'author'
        )
        and author_id = auth.uid()
    );

-- Subscriber can only view published posts
create policy "Subscriber can view published posts"
    on public.posts
    for select
    to authenticated
    using (
        status = 'published'::post_status
    );

-- Anonymous users can view published posts
create policy "Anonymous users can view published posts"
    on public.posts
    for select
    to anon
    using (
        status = 'published'::post_status
    );
