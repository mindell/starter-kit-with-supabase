-- Drop the existing view
drop view if exists public.users_with_roles;

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

-- Create the secure view
create or replace view public.users_with_roles
with (security_invoker = true)
as
  select 
    p.id,
    case
      when can_view_user_details(auth.uid(), p.id) then u.email
      else 'hidden'
    end as email,
    case
      when can_view_user_details(auth.uid(), p.id) then u.created_at
      else null
    end as created_at,
    case
      when can_view_user_details(auth.uid(), p.id) then u.confirmed_at
      else null
    end as confirmed_at,
    p.full_name,
    p.avatar_url,
    case
      when can_view_user_details(auth.uid(), p.id) then ra.role_id
      else null
    end as role_id,
    case
      when can_view_user_details(auth.uid(), p.id) then ur.role_name
      else 'hidden'
    end as role_name
  from public.profiles p
  left join auth.users u on p.id = u.id
  left join public.roles_assignment ra on p.id = ra.user_id
  left join public.user_roles ur on ra.role_id = ur.role_id;

-- Set up Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Create policies for the view
create policy "Users can view their own profile and admins can view all"
  on public.profiles for select
  using (
    can_view_user_details(auth.uid(), id)
  );

-- Revoke direct access to the view for public roles
revoke all on public.users_with_roles from anon, authenticated;

-- Grant select to authenticated users (they'll still be restricted by RLS)
grant select on public.users_with_roles to authenticated;
