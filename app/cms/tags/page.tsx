import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"

export default async function TagsPage() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect("/sign-in")
  }

  // Get tags
  const { data: tags } = await supabase
    .from("tags")
    .select("*")
    .order("name")

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Tags</h1>
        <a
          href="/cms/tags/new"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          Add Tag
        </a>
      </div>

      <div className="rounded-md border">
        <div className="p-4">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left font-medium p-2">Name</th>
                <th className="text-left font-medium p-2">Slug</th>
                <th className="text-left font-medium p-2">Description</th>
                <th className="text-right font-medium p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tags?.map((tag) => (
                <tr key={tag.id} className="border-b last:border-0">
                  <td className="p-2">{tag.name}</td>
                  <td className="p-2">{tag.slug}</td>
                  <td className="p-2">{tag.description}</td>
                  <td className="p-2 text-right">
                    <a
                      href={`/cms/tags/${tag.id}/edit`}
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
                    >
                      Edit
                    </a>
                  </td>
                </tr>
              ))}
              {!tags?.length && (
                <tr>
                  <td colSpan={4} className="text-center py-4 text-muted-foreground">
                    No tags found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
