-- Drop existing views and functions
drop view if exists public.users_with_roles;
drop view if exists public.public_profiles;
drop view if exists public.user_profiles;
drop view if exists public.user_role_assignments;
drop function if exists public.admin_users();
drop function if exists public.get_public_profiles();

-- Create function to check if user is admin
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.roles_assignment ra
    join public.user_roles ur on ra.role_id = ur.role_id
    where ra.user_id = auth.uid()
    and ur.role_name in ('super_admin', 'admin')
  );
end;
$$ language plpgsql security definer;

-- Create secure function for admin user view
create or replace function public.admin_users()
returns table (
    id uuid,
    email text,
    created_at timestamptz,
    updated_at timestamptz,
    full_name text,
    avatar_url text,
    bio text,
    website text,
    social_links jsonb,
    roles text[],
    roles_meta jsonb
) as $$
begin
    -- Check if user is admin
    if not public.is_admin() then
        raise exception 'Access denied. User is not an admin.';
    end if;

    return query
    select 
        u.id,
        u.email::text,
        u.created_at,
        u.updated_at,
        coalesce(p.display_name, u.raw_user_meta_data->>'full_name')::text as full_name,
        coalesce(p.avatar_url, u.raw_user_meta_data->>'avatar_url')::text as avatar_url,
        p.bio,
        p.website::text,
        p.social_links,
        array_remove(array_agg(ur.role_name::text), null) as roles,
        jsonb_object_agg(
            coalesce(ur.role_name, 'none'),
            jsonb_build_object(
                'role_id', ur.role_id,
                'created_at', ra.created_at
            )
        ) filter (where ur.role_name is not null) as roles_meta
    from auth.users u
    left join public.author_profiles p on u.id = p.author_id
    left join public.roles_assignment ra on u.id = ra.user_id
    left join public.user_roles ur on ra.role_id = ur.role_id
    group by 
        u.id,
        u.email,
        u.created_at,
        u.updated_at,
        p.display_name,
        p.avatar_url,
        p.bio,
        p.website,
        p.social_links;
end;
$$ language plpgsql security definer;

-- Create secure function for public profiles
create or replace function public.get_public_profiles()
returns table (
    id uuid,
    full_name text,
    avatar_url text,
    bio text,
    website text,
    social_links jsonb,
    created_at timestamptz,
    roles text[]
) as $$
begin
    return query
    select 
        p.author_id,
        p.display_name::text,
        p.avatar_url::text,
        p.bio,
        p.website::text,
        p.social_links,
        p.created_at,
        array_remove(array_agg(ur.role_name::text), null) as roles
    from public.author_profiles p
    left join public.roles_assignment ra on p.author_id = ra.user_id
    left join public.user_roles ur on ra.role_id = ur.role_id
    where ur.role_name != 'system'
    group by 
        p.author_id,
        p.display_name,
        p.avatar_url,
        p.bio,
        p.website,
        p.social_links,
        p.created_at;
end;
$$ language plpgsql;

-- Grant execute permissions
revoke all on function public.admin_users() from anon, authenticated;
grant execute on function public.admin_users() to authenticated;

revoke all on function public.get_public_profiles() from anon, authenticated;
grant execute on function public.get_public_profiles() to anon, authenticated;
