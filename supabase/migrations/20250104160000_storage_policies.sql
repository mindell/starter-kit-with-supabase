-- Migration file: Storage Policies
-- Description: Sets up RLS policies for storage access based on user roles
-- Author: Cascade AI
-- Date: 2025-01-04

-- Create storage bucket if it doesn't exist
insert into storage.buckets (id, name)
values ('starter-kit', 'starter-kit')
on conflict (id) do nothing;

-- Enable RLS on storage.objects
alter table storage.objects enable row level security;

-- Drop existing policies if any
drop policy if exists "Media is accessible by everyone" on storage.objects;
drop policy if exists "Media management for privileged users" on storage.objects;
drop policy if exists "Authors can manage own media" on storage.objects;
drop policy if exists "Authenticated users can view" on storage.objects;
drop policy if exists "Public can view media" on storage.objects;

-- Drop existing functions if any
drop function if exists storage.fn_user_has_privileged_role(uuid);
drop function if exists storage.fn_user_is_content_creator(uuid);

-- Helper function to check if user has privileged role (super_admin, admin)
create function storage.fn_user_has_privileged_role(check_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
    return exists (
        select 1
        from public.roles_assignment ra
        join public.user_roles ur on ra.role_id = ur.role_id
        where ra.user_id = check_user_id
        and ur.role_name in ('super_admin', 'admin')
    );
end;
$$;

-- Helper function to check if user has content creator role (editor, author)
create function storage.fn_user_is_content_creator(check_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
    return exists (
        select 1
        from public.roles_assignment ra
        join public.user_roles ur on ra.role_id = ur.role_id
        where ra.user_id = check_user_id
        and ur.role_name in ('editor', 'author')
    );
end;
$$;

-- Policy for privileged users (super_admin, admin): Full access to all objects
create policy "Media management for privileged users"
on storage.objects
to authenticated
using (
    storage.fn_user_has_privileged_role(auth.uid())
)
with check (
    storage.fn_user_has_privileged_role(auth.uid())
);

-- Policy for content creators (editor, author): Can manage their own media
create policy "Authors can manage own media"
on storage.objects
to authenticated
using (
    storage.fn_user_is_content_creator(auth.uid())
    and owner_id = auth.uid()::text
)
with check (
    storage.fn_user_is_content_creator(auth.uid())
    and owner_id = auth.uid()::text
);

-- Policy for authenticated users: Can view all media
create policy "Authenticated users can view"
on storage.objects
for select
to authenticated
using (true);

-- Policy for public: Can view media in the starter-kit bucket
create policy "Public can view media"
on storage.objects
for select
to anon
using (
    bucket_id = 'starter-kit'
);
