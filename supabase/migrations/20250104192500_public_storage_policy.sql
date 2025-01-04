-- Enable public access to storage bucket
insert into storage.buckets (id, name, public)
values ('starter-kit', 'starter-kit', true)
on conflict (id) do update set public = true;

-- Create policy to allow public read access
create policy "Public Access"
on storage.objects for select
to public
using ( bucket_id = 'starter-kit' );
