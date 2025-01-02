-- First, drop all policies that might depend on the functions
drop policy if exists "Super admin can manage all roles" on public.roles_assignment;
drop policy if exists "Admin can manage editor and author roles" on public.roles_assignment;
drop policy if exists "System can assign subscriber role" on public.roles_assignment;
drop policy if exists "Users can view their own role" on public.roles_assignment;

-- Then drop and recreate the functions with cascade to force removal of dependencies
drop function if exists public.fn_is_super_admin(uuid) cascade;
drop function if exists public.fn_is_admin_or_super_admin(uuid) cascade;

-- Create base functions
create function public.fn_is_super_admin(check_user_id uuid)
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
        where ra.user_id = check_user_id
        and ur.role_name = 'super_admin'
    );
$$;

create function public.fn_is_admin_or_super_admin(check_user_id uuid)
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
        where ra.user_id = check_user_id
        and ur.role_name in ('super_admin', 'admin')
    );
$$;

-- Now create the policies using the new functions
create policy "Users can view their own role"
    on public.roles_assignment
    for select
    to authenticated
    using (auth.uid() = user_id);

create policy "Super admin can manage all roles"
    on public.roles_assignment
    for all
    to authenticated
    using (fn_is_super_admin(auth.uid()));

create policy "Admin can manage editor and author roles"
    on public.roles_assignment
    for all
    to authenticated
    using (
        fn_is_admin_or_super_admin(auth.uid()) and
        exists (
            select 1 from public.user_roles
            where role_id = public.roles_assignment.role_id
            and role_name in ('editor', 'author')
        )
    );

create policy "System can assign subscriber role"
    on public.roles_assignment
    for insert
    to authenticated
    with check (
        exists (
            select 1 from public.user_roles
            where role_id = public.roles_assignment.role_id
            and role_name = 'subscriber'
        )
        and assigned_by is null
    );
