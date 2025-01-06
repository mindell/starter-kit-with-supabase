-- Drop the existing view
drop view if exists public.users_with_roles;
drop view if exists public.public_profiles;

-- Create a secure function to check if user can access user details
create or replace function public.can_view_user_details(viewer_id uuid, target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from roles_assignment ra
    join user_roles ur on ra.role_id = ur.role_id
    where ra.user_id = viewer_id
    and ur.role_name in ('super_admin', 'admin')
  )
  or viewer_id = target_user_id;
$$;

-- Create secure view for users with roles
create or replace view public.users_with_roles as
select 
    ap.author_id as id,
    u.email::varchar(255),
    u.created_at,
    u.confirmed_at,
    ap.display_name as full_name,
    ap.avatar_url,
    ra.role_id,
    ur.role_name
from public.author_profiles ap
join auth.users u on ap.author_id = u.id
left join public.roles_assignment ra on ap.author_id = ra.user_id
left join public.user_roles ur on ra.role_id = ur.role_id;

-- Create secure view for public user profiles
create or replace view public.public_profiles as
select
    author_id as id,
    display_name,
    avatar_url,
    website,
    bio
from public.author_profiles;

-- Set up Row Level Security (RLS)
alter table public.author_profiles enable row level security;

-- Create policies for the view
create policy "Users can view their own profile and admins can view all"
  on public.author_profiles for select
  using (
    can_view_user_details(auth.uid(), author_id)
  );

-- Revoke direct access to the view for public roles
revoke all on public.users_with_roles from anon, authenticated;
revoke all on public.public_profiles from anon;

-- Grant access to views
grant select on public.users_with_roles to authenticated;
grant select on public.public_profiles to authenticated;
grant select on public.public_profiles to anon;
