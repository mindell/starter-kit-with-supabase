Ownership
=========

* * * * *

When creating new buckets or objects in Supabase Storage, an owner is automatically assigned to the bucket or object. The owner is the user who created the resource and the value is derived from the `sub` claim in the JWT. We store the `owner` in the `owner_id` column.

When using the `service_key` to create a resource, the owner will not be set and the resource will be owned by anyone. This is also the case when you are creating Storage resources via the Dashboard.

The Storage schema has 2 fields to represent ownership: `owner` and `owner_id`. `owner` is deprecated and will be removed. Use `owner_id` instead.

Access control[#](https://supabase.com/docs/guides/storage/security/ownership#access-control)
---------------------------------------------------------------------------------------------

By itself, the ownership of a resource does not provide any access control. However, you can enforce the ownership by implementing access control against storage resources scoped to their owner.

For example, you can implement a policy where only the owner of an object can delete it. To do this, check the `owner_id` field of the object and compare it with the `sub` claim of the JWT:

`

1

create policy "User can delete their own objects"

2

on storage.objects

3

for delete

4

to authenticated

5

using (

6

owner_id = (select auth.uid())

7

);

`

The use of RLS policies is just one way to enforce access control. You can also implement access control in your server code by following the same pattern.
