-- Add slug column to posts table
alter table public.posts 
add column if not exists slug text;

-- Make slug unique and not null
alter table public.posts 
alter column slug set not null,
add constraint posts_slug_unique unique (slug);

-- Create function to generate slug
create or replace function public.generate_post_slug()
returns trigger
language plpgsql
as $$
declare
  base_slug text;
  new_slug text;
  counter integer := 1;
begin
  -- Convert title to lowercase and replace spaces/special chars with hyphens
  base_slug := lower(regexp_replace(NEW.title, '[^a-zA-Z0-9\s]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  
  -- Try the base slug first
  new_slug := base_slug;
  
  -- If slug exists, append a number and increment until we find a unique one
  while exists(select 1 from public.posts where slug = new_slug and id != NEW.id) loop
    counter := counter + 1;
    new_slug := base_slug || '-' || counter::text;
  end loop;
  
  NEW.slug := new_slug;
  return NEW;
end;
$$;

-- Create trigger for slug generation
create trigger before_post_insert_update
before insert or update of title on public.posts
for each row
when (NEW.slug is null)
execute function public.generate_post_slug();
