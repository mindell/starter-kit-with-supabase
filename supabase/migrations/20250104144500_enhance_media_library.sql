-- Migration file: Enhance Media Library
-- Description: Adds helper functions and policies for media management
-- Author: Cascade AI
-- Date: 2025-01-04

-- Enable RLS
alter table public.media enable row level security;
alter table public.media_versions enable row level security;

-- Drop existing policies if any
drop policy if exists "Media is viewable by everyone" on public.media;
drop policy if exists "Media is insertable by authenticated users" on public.media;
drop policy if exists "Media is updatable by owner" on public.media;
drop policy if exists "Media is deletable by owner" on public.media;
drop policy if exists "Media is manageable by privileged users" on public.media;

drop policy if exists "Media versions are viewable by everyone" on public.media_versions;
drop policy if exists "Media versions are insertable by media owner" on public.media_versions;
drop policy if exists "Media versions are deletable by media owner" on public.media_versions;
drop policy if exists "Media versions are manageable by privileged users" on public.media_versions;

-- Helper function to check if user has privileged role (super_admin, admin)
create or replace function public.fn_user_has_privileged_role(check_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
    return exists (
        select 1
        from roles_assignment ra
        join user_roles ur on ra.role_id = ur.role_id
        where ra.user_id = check_user_id
        and ur.role_name in ('super_admin', 'admin')
    );
end;
$$;

-- Helper function to check if user has content creator role (editor, author)
create or replace function public.fn_user_is_content_creator(check_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
    return exists (
        select 1
        from roles_assignment ra
        join user_roles ur on ra.role_id = ur.role_id
        where ra.user_id = check_user_id
        and ur.role_name in ('editor', 'author')
    );
end;
$$;

-- Media policies
create policy "Media is viewable by everyone"
    on public.media
    for select
    to authenticated, anon
    using (true);

create policy "Media is manageable by privileged users"
    on public.media
    to authenticated
    using (
        fn_user_has_privileged_role(auth.uid())
    )
    with check (
        fn_user_has_privileged_role(auth.uid())
    );

create policy "Media is insertable by content creators"
    on public.media
    for insert
    to authenticated
    with check (
        fn_user_is_content_creator(auth.uid())
        and auth.uid() = uploaded_by
    );

create policy "Media is updatable by owner"
    on public.media
    for update
    to authenticated
    using (
        (fn_user_is_content_creator(auth.uid()) and auth.uid() = uploaded_by)
        or fn_user_has_privileged_role(auth.uid())
    )
    with check (
        (fn_user_is_content_creator(auth.uid()) and auth.uid() = uploaded_by)
        or fn_user_has_privileged_role(auth.uid())
    );

create policy "Media is deletable by owner"
    on public.media
    for delete
    to authenticated
    using (
        (fn_user_is_content_creator(auth.uid()) and auth.uid() = uploaded_by)
        or fn_user_has_privileged_role(auth.uid())
    );

-- Media versions policies
create policy "Media versions are viewable by everyone"
    on public.media_versions
    for select
    to authenticated, anon
    using (true);

create policy "Media versions are manageable by privileged users"
    on public.media_versions
    to authenticated
    using (
        fn_user_has_privileged_role(auth.uid())
    )
    with check (
        fn_user_has_privileged_role(auth.uid())
    );

create policy "Media versions are insertable by media owner"
    on public.media_versions
    for insert
    to authenticated
    with check (
        exists (
            select 1
            from public.media
            where id = media_id
            and (
                (uploaded_by = auth.uid() and fn_user_is_content_creator(auth.uid()))
                or fn_user_has_privileged_role(auth.uid())
            )
        )
    );

create policy "Media versions are deletable by media owner"
    on public.media_versions
    for delete
    to authenticated
    using (
        exists (
            select 1
            from public.media
            where id = media_id
            and (
                (uploaded_by = auth.uid() and fn_user_is_content_creator(auth.uid()))
                or fn_user_has_privileged_role(auth.uid())
            )
        )
    );

-- Function to get image dimensions using storage URL
create or replace function public.fn_get_image_dimensions(storage_key text)
returns table (width integer, height integer)
language plpgsql
security definer
set search_path = public
as $$
declare
    dimensions record;
begin
    -- This is a placeholder. In production, you would implement
    -- image dimension detection here or handle it in your application code
    return query
    select 0::integer as width, 0::integer as height;
end;
$$;

-- Function to generate media version storage key
create or replace function public.fn_generate_media_version_key(
    original_key text,
    version_type text,
    extension text default null
)
returns text
language plpgsql
immutable
security definer
set search_path = public
as $$
declare
    base_key text;
    ext text;
begin
    -- Extract base key without extension
    base_key := regexp_replace(original_key, '\.[^.]*$', '');
    
    -- Use provided extension or extract from original key
    if extension is not null then
        ext := extension;
    else
        ext := regexp_replace(original_key, '^.*\.', '');
    end if;
    
    -- Generate version key
    return format('%s_%s.%s', base_key, version_type, ext);
end;
$$;

-- Add media type enum if not exists
do $$ 
begin
    if not exists (select 1 from pg_type where typname = 'media_type') then
        create type public.media_type as enum ('image', 'video', 'document', 'other');
    end if;
end $$;

-- Add media type column
alter table public.media
add column type public.media_type not null default 'other';

-- Function to determine media type from mimetype
create or replace function public.fn_get_media_type(mimetype text)
returns public.media_type
language plpgsql
immutable
security definer
set search_path = public
as $$
begin
    if mimetype like 'image/%' then
        return 'image'::public.media_type;
    elsif mimetype like 'video/%' then
        return 'video'::public.media_type;
    elsif mimetype like 'application/pdf' 
       or mimetype like 'application/msword'
       or mimetype like 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
       or mimetype like 'text/%' then
        return 'document'::public.media_type;
    else
        return 'other'::public.media_type;
    end if;
end;
$$;

-- Trigger to set media type on insert/update
create or replace function public.fn_set_media_type()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    new.type = public.fn_get_media_type(new.mimetype);
    return new;
end;
$$;

create trigger set_media_type
    before insert or update of mimetype on public.media
    for each row
    execute function public.fn_set_media_type();
