-- Migration file: Role Management System
-- Description: Creates tables and functions for role management with proper RLS policies
-- Author: Cascade AI
-- Date: 2025-01-02

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- Create user_roles table
create table public.user_roles (
    role_id uuid primary key default uuid_generate_v4(),
    role_name text not null unique,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    constraint valid_role_name check (role_name in ('super_admin', 'admin', 'editor', 'author', 'subscriber', 'system'))
);

-- Create roles_assignment table
create table public.roles_assignment (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id),
    role_id uuid not null references public.user_roles(role_id),
    assigned_by uuid references auth.users(id),
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(user_id, role_id)
);

-- Create roles_history table
create table public.roles_history (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id),
    previous_role_id uuid references public.user_roles(role_id),
    new_role_id uuid not null references public.user_roles(role_id),
    changed_by uuid references auth.users(id),
    reason text,
    created_at timestamptz default now()
);

-- Insert default roles
insert into public.user_roles (role_name) values
    ('super_admin'),
    ('admin'),
    ('editor'),
    ('author'),
    ('subscriber'),
    ('system');

-- Function to validate role assignments
create or replace function public.fn_validate_role_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    role_name text;
    super_admin_count integer;
begin
    -- Get the role name being assigned
    select ur.role_name into role_name
    from public.user_roles ur
    where ur.role_id = new.role_id;

    -- Check super_admin constraint
    if role_name = 'super_admin' then
        select count(*) into super_admin_count
        from public.roles_assignment ra
        join public.user_roles ur on ra.role_id = ur.role_id
        where ur.role_name = 'super_admin'
        and ra.id != coalesce(new.id, '00000000-0000-0000-0000-000000000000');

        if super_admin_count > 0 then
            raise exception 'Only one super_admin is allowed';
        end if;
    end if;

    -- Check system role constraint
    if role_name = 'system' then
        raise exception 'System role cannot be assigned manually';
    end if;

    -- Check if system is assigning subscriber role
    if role_name = 'subscriber' and new.assigned_by is not null then
        raise exception 'Subscriber role can only be assigned by the system';
    end if;

    return new;
end;
$$;

-- Trigger for role assignment validation
create trigger before_role_assignment
    before insert or update on public.roles_assignment
    for each row
    execute function public.fn_validate_role_assignment();

-- Function to handle first user signup (becomes super_admin)
create or replace function public.handle_first_user_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    super_admin_role_id uuid;
    existing_super_admin uuid;
begin
    -- Get super_admin role_id
    select role_id into super_admin_role_id
    from public.user_roles
    where role_name = 'super_admin';

    -- Check if super_admin already exists
    select user_id into existing_super_admin
    from public.roles_assignment ra
    join public.user_roles ur on ra.role_id = ur.role_id
    where ur.role_name = 'super_admin';

    -- If no super_admin exists, assign the role to this user
    if existing_super_admin is null then
        insert into public.roles_assignment (user_id, role_id)
        values (new.id, super_admin_role_id);
    end if;

    return new;
end;
$$;

-- Trigger for first user signup
create trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute function public.handle_first_user_signup();

-- Function to log role changes
create or replace function public.fn_log_role_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    previous_role_id uuid;
begin
    -- Get previous role if exists
    select role_id into previous_role_id
    from public.roles_assignment
    where user_id = new.user_id
    and role_id = new.role_id;

    -- Log the change
    insert into public.roles_history (
        user_id,
        previous_role_id,
        new_role_id,
        changed_by,
        reason
    )
    values (
        new.user_id,
        previous_role_id,
        new.role_id,
        new.assigned_by,
        'Role assignment'
    );

    return new;
end;
$$;

-- Trigger for role changes logging
create trigger on_role_assignment_change
    after insert or update on public.roles_assignment
    for each row
    execute function public.fn_log_role_changes();

-- Enable RLS on all tables
alter table public.user_roles enable row level security;
alter table public.roles_assignment enable row level security;
alter table public.roles_history enable row level security;

-- RLS Policies for user_roles
create policy "Roles are viewable by authenticated users"
    on public.user_roles
    for select
    to authenticated
    using (role_name != 'system');

-- RLS Policies for roles_assignment
create policy "Super admin can manage all roles"
    on public.roles_assignment
    for all
    to authenticated
    using (
        exists (
            select 1 from public.roles_assignment ra
            join public.user_roles ur on ra.role_id = ur.role_id
            where ra.user_id = auth.uid()
            and ur.role_name = 'super_admin'
        )
    );

create policy "Admin can manage editor and author roles"
    on public.roles_assignment
    for all
    to authenticated
    using (
        exists (
            select 1 from public.roles_assignment ra
            join public.user_roles ur on ra.role_id = ur.role_id
            where ra.user_id = auth.uid()
            and ur.role_name = 'admin'
        )
        and
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

-- RLS Policies for roles_history
create policy "Role history viewable by super_admin and admin"
    on public.roles_history
    for select
    to authenticated
    using (
        exists (
            select 1 from public.roles_assignment ra
            join public.user_roles ur on ra.role_id = ur.role_id
            where ra.user_id = auth.uid()
            and ur.role_name in ('super_admin', 'admin')
        )
    );

-- Create secure function to check if user is admin or super_admin
create or replace function public.fn_is_admin_or_super_admin(user_id uuid)
returns boolean
language sql
security invoker
stable
as $$
    select exists (
        select 1 from public.roles_assignment ra
        join public.user_roles ur on ra.role_id = ur.role_id
        where ra.user_id = user_id
        and ur.role_name in ('super_admin', 'admin')
    );
$$;

-- Create view for user roles with email (using auth schema and security invoker)
create or replace view auth.user_role_details
with (security_barrier)
as
select 
    ra.id as assignment_id,
    au.id as user_id,
    au.email,
    ur.role_name,
    ra.assigned_by,
    ra.created_at as assigned_at
from public.roles_assignment ra
join auth.users au on ra.user_id = au.id
join public.user_roles ur on ra.role_id = ur.role_id
where public.fn_is_admin_or_super_admin(auth.uid());

-- Grant access to the view for authenticated users
grant select on auth.user_role_details to authenticated;

-- Revoke public schema usage from public
revoke usage on schema public from public;
revoke all on all tables in schema public from public;

-- Grant usage to authenticated users
grant usage on schema public to authenticated;
grant all on all tables in schema public to authenticated;
