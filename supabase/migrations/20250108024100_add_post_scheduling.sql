-- Add scheduled_at column to posts table
alter table public.posts
    add column if not exists scheduled_at timestamptz;

-- Add status enum type if not exists
do $$ begin
    create type post_status as enum ('draft', 'scheduled', 'published');
exception
    when duplicate_object then null;
end $$;

-- Update posts table to use new status type
alter table public.posts
    alter column status type post_status using status::post_status;

-- Function to auto-publish scheduled posts
create or replace function handle_scheduled_posts()
returns trigger as $$
begin
    -- If post is scheduled and scheduled_at is in the past
    if NEW.status = 'scheduled' and NEW.scheduled_at <= now() then
        NEW.status := 'published';
        NEW.published_at := NEW.scheduled_at;
        NEW.scheduled_at := null;
    end if;
    return NEW;
end;
$$ language plpgsql;

-- Drop existing trigger if exists
drop trigger if exists handle_scheduled_posts_trigger on public.posts;

-- Create trigger for auto-publishing scheduled posts
create trigger handle_scheduled_posts_trigger
    before insert or update on public.posts
    for each row
    execute function handle_scheduled_posts();

-- Add RLS policies
alter table public.posts enable row level security;

create policy "Public can view published posts"
    on public.posts for select
    using (status = 'published' and published_at <= now());

create policy "Authenticated users can manage their own posts"
    on public.posts for all
    using (auth.uid() = author_id);

create policy "Service role bypass"
    on public.posts for all
    using (auth.jwt()->>'role' = 'service_role');
