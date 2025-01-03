-- Migration file: Fix Post Author Relationship
-- Description: Creates an author_profiles table with triggers
-- Author: Cascade AI
-- Date: 2025-01-03

-- Drop existing objects
drop view if exists public.posts_with_authors;
drop materialized view if exists public.author_profiles;
drop function if exists public.get_author_display_name(uuid);
drop function if exists public.get_author_avatar_url(uuid);

-- Create author_profiles table
create table public.author_profiles (
    author_id uuid primary key references auth.users(id) on delete cascade,
    display_name text not null,
    avatar_url text,
    email text,
    refreshed_at timestamptz default now()
);

-- Enable RLS on author_profiles
alter table public.author_profiles enable row level security;

-- Only show email if it's the user themselves
create policy "Users can only see their own email"
    on public.author_profiles
    for select
    using (
        case 
            when auth.uid() = author_id then true
            else email is null
        end
    );

-- Grant access to the table
grant select on public.author_profiles to authenticated;

-- Function to sync author profiles
create or replace function public.sync_author_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    -- Insert or update author profile
    insert into public.author_profiles (author_id, display_name, avatar_url, email)
    select 
        u.id,
        coalesce(p.full_name, u.email),
        p.avatar_url,
        u.email
    from auth.users u
    left join public.profiles p on u.id = p.id
    where u.id = coalesce(NEW.id, OLD.id)
    on conflict (author_id) do update
    set 
        display_name = EXCLUDED.display_name,
        avatar_url = EXCLUDED.avatar_url,
        email = EXCLUDED.email,
        refreshed_at = now();
    
    return coalesce(NEW, OLD);
end;
$$;

-- Create triggers to sync profiles
create trigger sync_profile_on_change
    after insert or update or delete on public.profiles
    for each row
    execute function public.sync_author_profile();

-- Initial data sync
insert into public.author_profiles (author_id, display_name, avatar_url, email)
select 
    u.id,
    coalesce(p.full_name, u.email),
    p.avatar_url,
    u.email
from auth.users u
left join public.profiles p on u.id = p.id
on conflict (author_id) do update
set 
    display_name = EXCLUDED.display_name,
    avatar_url = EXCLUDED.avatar_url,
    email = EXCLUDED.email,
    refreshed_at = now();
