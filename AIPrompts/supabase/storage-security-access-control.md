Storage Access Control
Supabase Storage is designed to work perfectly with Postgres Row Level Security (RLS).

You can use RLS to create Security Access Policies that are incredibly powerful and flexible, allowing you to restrict access based on your business needs.

Access policies#
By default Storage does not allow any uploads to buckets without RLS policies. You selectively allow certain operations by creating RLS policies on the storage.objects table.

You can find the documentation for the storage schema here , and to simplify the process of crafting your policies, you can utilize these helper functions .

The RLS policies required for different operations are documented here

For example, the only RLS policy required for uploading objects is to grant the INSERT permission to the storage.objects table.

To allow overwriting files using the upsert functionality you will need to additionally grant SELECT and UPDATE permissions.

Policy examples#
An easy way to get started would be to create RLS policies for SELECT, INSERT, UPDATE, DELETE operations and restrict the policies to meet your security requirements. For example, one can start with the following INSERT policy:

create policy "policy_name"
ON storage.objects
for insert with check (
  true
);

and modify it to only allow authenticated users to upload assets to a specific bucket by changing it to:

create policy "policy_name"
on storage.objects for insert to authenticated with check (
    -- restrict bucket
    bucket_id = 'my_bucket_id'
);

This example demonstrates how you would allow authenticated users to upload files to a folder called private inside my_bucket_id:

create policy "Allow authenticated uploads"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'my_bucket_id' and
  (storage.foldername(name))[1] = 'private'
);

This example demonstrates how you would allow authenticated users to upload files to a folder called with their users.id inside my_bucket_id:

create policy "Allow authenticated uploads"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'my_bucket_id' and
  (storage.foldername(name))[1] = (select auth.uid()::text)
);

Allow a user to access a file that was previously uploaded by the same user:

create policy "Individual user Access"
on storage.objects for select
to authenticated
using ( (select auth.uid()) = owner_id::uuid );


