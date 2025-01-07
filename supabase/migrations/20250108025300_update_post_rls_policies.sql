-- Drop existing policies first
drop policy if exists "Public can view published posts" on public.posts;
drop policy if exists "Authenticated users can manage their own posts" on public.posts;
drop policy if exists "Service role bypass" on public.posts;

-- Function to check if user has admin privileges
create or replace function public.has_admin_privileges(user_id uuid)
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
    where ra.user_id = user_id
    and ur.role_name in ('super_admin', 'admin')
  );
$$;

-- Function to check if user can manage posts
create or replace function public.can_manage_posts(user_id uuid, post_author_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select 
    has_admin_privileges(user_id) -- Admin/Super admin can manage all posts
    or user_id = post_author_id;  -- Authors can manage their own posts
$$;

-- Public access policy (can only view published posts)
create policy "Public can view published posts"
on public.posts for select
using (
  status = 'published' 
  and published_at <= now()
);

-- Author access policy (can manage own posts)
create policy "Authors can manage their own posts"
on public.posts for all
using (
  auth.uid() = author_id
);

-- Admin access policy (can manage all posts)
create policy "Admins can manage all posts"
on public.posts for all
using (
  has_admin_privileges(auth.uid())
);

-- Service role bypass policy
create policy "Service role bypass"
on public.posts for all
using (
  auth.jwt()->>'role' = 'service_role'
);
