import { createClient } from "@/utils/supabase/server"
import { MediaSearch } from "@/components/cms/media-search"
import { MediaGrid } from "@/components/cms/media-grid"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { revalidatePath } from "next/cache"

// Media type filter options
const typeFilters = [
  { value: "all", label: "All" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
  { value: "document", label: "Documents" },
  { value: "other", label: "Other" },
]

export default async function MediaLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; search?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams;
  // Build query
  let query = supabase
    .from("media")
    .select("*")
    .order("created_at", { ascending: false })

  // Apply type filter
  if (params.type && params.type !== "all") {
    query = query.eq("type", params.type)
  }

  // Apply search filter
  if (params.search) {
    query = query.ilike("filename", `%${params.search}%`)
  }

  const { data: media, error } = await query

  if (error) {
    console.error("Error fetching media:", error)
    return <div>Error loading media library</div>
  }

  // Server action to update media
  async function updateMedia(formData: FormData) {
    "use server"

    const supabase = await createClient()
    const mediaId = formData.get("id") as string
    const altText = formData.get("alt_text") as string
    const caption = formData.get("caption") as string

    const { error } = await supabase
      .from("media")
      .update({ alt_text: altText, caption })
      .eq("id", mediaId)

    if (error) throw error

    revalidatePath("/cms/media")
  }

  // Server action to delete media
  async function deleteMedia(formData: FormData) {
    "use server"

    const supabase = await createClient()
    const mediaId = formData.get("id") as string
    const storageKey = formData.get("storage_key") as string

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(process.env.BUCKET_NAME!)
      .remove([storageKey])

    if (storageError) throw storageError

    // Delete from database
    const { error: dbError } = await supabase
      .from("media")
      .delete()
      .eq("id", mediaId)

    if (dbError) throw dbError

    revalidatePath("/cms/media")
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Media Library</h1>
      </div>

      <Tabs defaultValue={params.type || "all"}>
        <div className="flex justify-between items-center mb-6">
          <TabsList>
            {typeFilters.map((filter) => (
              <TabsTrigger
                key={filter.value}
                value={filter.value}
                className="capitalize"
              >
                {filter.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex items-center gap-2">
            <MediaSearch />
          </div>
        </div>

        {typeFilters.map((filter) => (
          <TabsContent key={filter.value} value={filter.value}>
            <MediaGrid
              media={media || []}
              updateMedia={updateMedia}
              deleteMedia={deleteMedia}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
