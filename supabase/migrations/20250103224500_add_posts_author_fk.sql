-- Migration file: Add Posts Author Foreign Key
-- Description: Updates foreign key constraint from posts to author_profiles
-- Author: Cascade AI
-- Date: 2025-01-03

-- Drop old constraint if exists
alter table public.posts
drop constraint if exists posts_author_fkey;

-- Add foreign key to author_profiles
alter table public.posts
add constraint posts_author_profiles_fkey 
foreign key (author_id) 
references public.author_profiles(author_id)
on delete cascade;
