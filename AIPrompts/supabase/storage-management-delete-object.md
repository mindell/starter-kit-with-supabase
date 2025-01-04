Delete Objects
==============

Learn about deleting objects
----------------------------

* * * * *

When you delete one or more objects from a bucket, the files are permanently removed and not recoverable. You can delete a single object or multiple objects at once.

Deleting objects should always be done via the Storage API and NOT via a SQL query. Deleting objects via a SQL query will not remove the object from the bucket and will result in the object being orphaned.

Delete objects[#]
----------------------------------------------------------------------------------------------------

To delete one or more objects, use the `remove` method.

`

1

await supabase.storage.from('bucket').remove(['object-path-2', 'folder/avatar2.png'])

`

RLS[#]
------------------------------------------------------------------------------

To delete an object, the user must have the `delete` permission on the object. For example:

`

1

create policy "User can delete their own objects"

2

on storage.objects

3

for delete

4

TO authenticated

5

USING (

6

owner = (select auth.uid())

7

);

`
