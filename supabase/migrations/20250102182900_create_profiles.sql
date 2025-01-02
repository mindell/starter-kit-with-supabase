-- Create profiles table if not exists
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text,
  website text,
  constraint username_length check (char_length(username) >= 3)
);

-- Set up Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Create policies
create policy "Public profiles are viewable by everyone"
  on profiles for select
  using ( true );

create policy "Users can insert their own profile"
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile"
  on profiles for update
  using ( auth.uid() = id );

-- Function to handle new user profiles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, updated_at)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    now()
  );
  return new;
end;
$$;

-- Trigger for new user profiles
drop trigger if exists on_auth_user_created_profiles on auth.users;
create trigger on_auth_user_created_profiles
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill existing users
insert into public.profiles (id, updated_at)
select id, now()
from auth.users
where id not in (select id from public.profiles);

-- Update the users query view
create or replace view public.users_with_roles as
select 
    p.id,
    u.email,
    u.created_at,
    u.confirmed_at,
    p.full_name,
    p.avatar_url,
    ra.role_id,
    ur.role_name
from public.profiles p
join auth.users u on p.id = u.id
left join public.roles_assignment ra on p.id = ra.user_id
left join public.user_roles ur on ra.role_id = ur.role_id;
