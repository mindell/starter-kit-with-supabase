-- Function to handle new user registration
create or replace function public.handle_new_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    subscriber_role_id uuid;
begin
    -- Get the subscriber role ID
    select role_id into subscriber_role_id
    from public.user_roles
    where role_name = 'subscriber';

    -- If subscriber role exists, assign it to the new user
    if subscriber_role_id is not null then
        insert into public.roles_assignment (user_id, role_id)
        values (new.id, subscriber_role_id);
    end if;

    return new;
end;
$$;

-- Drop the trigger if it exists
drop trigger if exists on_auth_user_created on auth.users;

-- Create the trigger
create trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute function public.handle_new_user_role();

-- Backfill existing users who don't have roles
do $$
declare
    subscriber_role_id uuid;
begin
    -- Get the subscriber role ID
    select role_id into subscriber_role_id
    from public.user_roles
    where role_name = 'subscriber';

    -- Insert roles for existing users who don't have any role
    insert into public.roles_assignment (user_id, role_id)
    select au.id, subscriber_role_id
    from auth.users au
    left join public.roles_assignment ra on au.id = ra.user_id
    where ra.user_id is null
    and subscriber_role_id is not null;
end;
$$;
