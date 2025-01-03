-- Migration file: Improve User Role Management
-- Description: Enhances the role management system to handle first user and subsequent users
-- Author: Cascade AI
-- Date: 2025-01-03

-- Drop existing triggers first to reorder them
drop trigger if exists on_auth_user_created on auth.users;

-- Function to handle first user signup (becomes super_admin)
create or replace function public.handle_first_user_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    super_admin_role_id uuid;
    super_admin_count integer;
begin
    -- Check if there's already a super_admin
    select count(*) into super_admin_count
    from public.roles_assignment ra
    join public.user_roles ur on ra.role_id = ur.role_id
    where ur.role_name = 'super_admin';

    -- If no super_admin exists, make this user super_admin
    if super_admin_count = 0 then
        -- Get super_admin role ID
        select role_id into super_admin_role_id
        from public.user_roles
        where role_name = 'super_admin';

        -- Assign super_admin role
        if super_admin_role_id is not null then
            insert into public.roles_assignment (user_id, role_id)
            values (new.id, super_admin_role_id);

            -- Log in roles_history
            insert into public.roles_history (
                user_id,
                new_role_id,
                reason
            ) values (
                new.id,
                super_admin_role_id,
                'First user automatically assigned as super_admin'
            );

            return new;
        end if;
    end if;

    -- If we already have a super_admin, let the regular handler take care of it
    return new;
end;
$$;

-- Modify the function to handle new user registration (becomes subscriber if not first user)
create or replace function public.handle_new_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    subscriber_role_id uuid;
    has_role boolean;
begin
    -- Check if user already has a role (from first user handler)
    select exists (
        select 1
        from public.roles_assignment
        where user_id = new.id
    ) into has_role;

    -- If user doesn't have a role yet, assign subscriber
    if not has_role then
        -- Get the subscriber role ID
        select role_id into subscriber_role_id
        from public.user_roles
        where role_name = 'subscriber';

        -- If subscriber role exists, assign it to the new user
        if subscriber_role_id is not null then
            insert into public.roles_assignment (user_id, role_id)
            values (new.id, subscriber_role_id);

            -- Log in roles_history
            insert into public.roles_history (
                user_id,
                new_role_id,
                reason
            ) values (
                new.id,
                subscriber_role_id,
                'New user automatically assigned as subscriber'
            );
        end if;
    end if;

    return new;
end;
$$;

-- Create triggers in proper order
-- 1. First, check if this should be a super_admin
create trigger handle_first_user
    after insert on auth.users
    for each row
    execute function public.handle_first_user_signup();

-- 2. Then, handle regular user role assignment
create trigger handle_new_user
    after insert on auth.users
    for each row
    execute function public.handle_new_user_role();

-- Function to check current user count and super admin existence
create or replace function public.check_user_roles()
returns table (
    total_users bigint,
    super_admin_count bigint,
    subscriber_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
    return query
    select
        (select count(*) from auth.users) as total_users,
        (
            select count(*)
            from public.roles_assignment ra
            join public.user_roles ur on ra.role_id = ur.role_id
            where ur.role_name = 'super_admin'
        ) as super_admin_count,
        (
            select count(*)
            from public.roles_assignment ra
            join public.user_roles ur on ra.role_id = ur.role_id
            where ur.role_name = 'subscriber'
        ) as subscriber_count;
end;
$$;
