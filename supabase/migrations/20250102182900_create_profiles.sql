-- Create author_profiles table if not exists
create table if not exists public.author_profiles (
    author_id uuid primary key references auth.users(id) on delete cascade,
    display_name text,
    avatar_url text,
    email text,
    bio text,
    website text,
    social_links jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Enable RLS on author_profiles
alter table public.author_profiles enable row level security;

-- Create policies
create policy "Public author_profiles are viewable by everyone"
  on author_profiles for select
  using (true);

create policy "Users can insert their own author_profile"
  on author_profiles for insert
  with check (auth.uid() = author_id);

create policy "Users can update their own author_profile"
  on author_profiles for update
  using (auth.uid() = author_id);

-- Function to handle new user profiles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.author_profiles (author_id, display_name, avatar_url, email, updated_at)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.email,
    now()
  );
  return new;
end;
$$;

-- Trigger for new user profiles
drop trigger if exists on_auth_user_created_profiles on auth.users;
create trigger on_auth_user_created_profiles
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill existing users
insert into public.author_profiles (author_id, email, updated_at)
select id, email, now()
from auth.users
where id not in (select author_id from public.author_profiles);

-- Create secure view for user profiles
create or replace view public.user_profiles as
select
  p.author_id as id,
  p.display_name,
  p.avatar_url,
  p.website,
  p.updated_at,
  r.role_name,
  r.role_id
from public.author_profiles p
left join public.roles_assignment ra on p.author_id = ra.user_id
left join public.user_roles r on ra.role_id = r.role_id;
