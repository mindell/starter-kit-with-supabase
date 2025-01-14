-- Migration file: Add Post Drafts for Auto-save Feature
-- Description: Creates tables and functions for post auto-save functionality
-- Author: Cascade AI
-- Date: 2025-01-14

-- Create post drafts table
create table public.post_drafts (
    id uuid primary key default uuid_generate_v4(),
    post_id uuid references public.posts(id) on delete cascade,
    title text,
    slug text,
    content text,
    excerpt text,
    featured_image uuid,
    status public.post_status,
    scheduled_at timestamptz,
    seo_title text,
    seo_description text,
    seo_keywords text[],
    canonical_url text,
    structured_data jsonb,
    is_indexable boolean default true,
    author_id uuid not null references auth.users(id),
    last_saved_at timestamptz default now(),
    created_at timestamptz default now(),
    is_valid boolean default false,
    validation_errors jsonb
);

-- Add RLS policies for post drafts
alter table public.post_drafts enable row level security;

-- Authors can manage their own drafts
create policy "Authors can manage their own drafts"
    on public.post_drafts
    for all
    to authenticated
    using (
        auth.uid() = author_id
        and exists (
            select 1 from public.roles_assignment ra
            join public.user_roles ur on ra.role_id = ur.role_id
            where ra.user_id = auth.uid()
            and ur.role_name in ('author', 'editor', 'admin', 'super_admin')
        )
    )
    with check (
        auth.uid() = author_id
        and exists (
            select 1 from public.roles_assignment ra
            join public.user_roles ur on ra.role_id = ur.role_id
            where ra.user_id = auth.uid()
            and ur.role_name in ('author', 'editor', 'admin', 'super_admin')
        )
    );

-- Editors and admins can manage all drafts
create policy "Editors and admins can manage all drafts"
    on public.post_drafts
    for all
    to authenticated
    using (
        exists (
            select 1 from public.roles_assignment ra
            join public.user_roles ur on ra.role_id = ur.role_id
            where ra.user_id = auth.uid()
            and ur.role_name in ('editor', 'admin', 'super_admin')
        )
    )
    with check (
        exists (
            select 1 from public.roles_assignment ra
            join public.user_roles ur on ra.role_id = ur.role_id
            where ra.user_id = auth.uid()
            and ur.role_name in ('editor', 'admin', 'super_admin')
        )
    );

-- Function to validate draft content
create or replace function public.fn_validate_post_draft(
    p_title text,
    p_excerpt text,
    p_seo_title text,
    p_seo_description text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_errors jsonb = '[]'::jsonb;
begin
    -- Validate title
    if p_title is null or length(p_title) < 1 then
        v_errors = v_errors || jsonb_build_object(
            'field', 'title',
            'error', 'Title is required'
        );
    elsif length(p_title) > 255 then
        v_errors = v_errors || jsonb_build_object(
            'field', 'title',
            'error', 'Title must be 255 characters or less'
        );
    end if;

    -- Validate excerpt
    if p_excerpt is not null and length(p_excerpt) > 500 then
        v_errors = v_errors || jsonb_build_object(
            'field', 'excerpt',
            'error', 'Excerpt must be 500 characters or less'
        );
    end if;

    -- Validate SEO title
    if p_seo_title is not null and length(p_seo_title) > 60 then
        v_errors = v_errors || jsonb_build_object(
            'field', 'seo_title',
            'error', 'SEO title must be 60 characters or less'
        );
    end if;

    -- Validate SEO description
    if p_seo_description is not null and length(p_seo_description) > 160 then
        v_errors = v_errors || jsonb_build_object(
            'field', 'seo_description',
            'error', 'SEO description must be 160 characters or less'
        );
    end if;

    return v_errors;
end;
$$;
