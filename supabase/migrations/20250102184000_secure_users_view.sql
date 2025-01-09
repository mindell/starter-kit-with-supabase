-- Drop existing views
drop view if exists public.users_with_roles;
drop view if exists public.public_profiles;
drop view if exists public.user_profiles;

-- Create base view for user roles (only for authenticated users)
create or replace view public.user_role_assignments as
select 
    u.id as user_id,
    array_agg(ur.role_name) as roles,
    jsonb_object_agg(
        ur.role_name,
        jsonb_build_object(
            'role_id', ur.role_id,
            'created_at', ur.created_at
        )
    ) as roles_meta
from auth.users u
left join public.roles_assignment ra on u.id = ra.user_id
left join public.user_roles ur on ra.role_id = ur.role_id
group by u.id;

alter view public.user_role_assignments set (security_invoker = on);
revoke all on public.user_role_assignments from anon, authenticated;
grant select on public.user_role_assignments to authenticated;

-- Create secure view for users with roles (only for authenticated users)
create or replace view public.users_with_roles as
select 
    u.id,
    u.email,
    u.created_at,
    u.updated_at,
    u.raw_user_meta_data->>'full_name' as full_name,
    ura.roles,
    ura.roles_meta
from auth.users u
left join public.user_role_assignments ura on u.id = ura.user_id;

alter view public.users_with_roles set (security_invoker = on);
revoke all on public.users_with_roles from anon, authenticated;
grant select on public.users_with_roles to authenticated;

-- Create secure public profiles view (safe for public access)
create or replace view public.public_profiles as
select 
    p.author_id as id,
    p.display_name as full_name,
    p.avatar_url,
    p.bio,
    p.website,
    p.social_links,
    p.created_at,
    ura.roles
from public.author_profiles p
left join public.user_role_assignments ura on p.author_id = ura.user_id;

alter view public.public_profiles set (security_invoker = on);
revoke all on public.public_profiles from anon, authenticated;
grant select on public.public_profiles to anon, authenticated;

-- Create secure user profiles view (for authenticated users)
create or replace view public.user_profiles as
select 
    p.author_id as id,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.website,
    p.social_links,
    p.created_at,
    p.updated_at,
    u.email,
    u.created_at as user_created_at,
    u.updated_at as user_updated_at,
    ura.roles
from public.author_profiles p
inner join auth.users u on p.author_id = u.id
left join public.user_role_assignments ura on u.id = ura.user_id;

alter view public.user_profiles set (security_invoker = on);
revoke all on public.user_profiles from anon, authenticated;
grant select on public.user_profiles to authenticated;

-- Add RLS policies to underlying tables if not exists
do $$
begin
    if not exists (
        select 1 from pg_policies 
        where schemaname = 'public' 
        and tablename = 'author_profiles' 
        and policyname = 'Users can only view their own profile'
    ) then
        create policy "Users can only view their own profile"
            on public.author_profiles
            for select
            to authenticated
            using (
                auth.uid() = author_id
                or exists (
                    select 1 from public.roles_assignment ra
                    inner join public.user_roles ur on ra.role_id = ur.role_id
                    where ra.user_id = auth.uid()
                    and ur.role_name in ('admin', 'super_admin')
                )
            );
    end if;

    if not exists (
        select 1 from pg_policies 
        where schemaname = 'public' 
        and tablename = 'author_profiles' 
        and policyname = 'Profiles are insertable by owner'
    ) then
        create policy "Profiles are insertable by owner"
            on public.author_profiles
            for insert
            to authenticated
            with check (
                auth.uid() = author_id
            );
    end if;

    if not exists (
        select 1 from pg_policies 
        where schemaname = 'public' 
        and tablename = 'author_profiles' 
        and policyname = 'Profiles are updatable by owner'
    ) then
        create policy "Profiles are updatable by owner"
            on public.author_profiles
            for update
            to authenticated
            using (
                auth.uid() = author_id
                or exists (
                    select 1 from public.roles_assignment ra
                    inner join public.user_roles ur on ra.role_id = ur.role_id
                    where ra.user_id = auth.uid()
                    and ur.role_name in ('admin', 'super_admin')
                )
            );
    end if;
end
$$;
