import { createClient } from "@/utils/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, FolderOpen, Hash, Image } from "lucide-react"

export default async function CMSDashboard() {
  const supabase = await createClient()

  // Get counts
  const [
    { count: postsCount },
    { count: categoriesCount },
    { count: tagsCount },
    { count: mediaCount },
  ] = await Promise.all([
    supabase.from("posts").select("*", { count: "exact" }),
    supabase.from("categories").select("*", { count: "exact" }),
    supabase.from("tags").select("*", { count: "exact" }),
    supabase.from("media").select("*", { count: "exact" }),
  ])

  // Get recent posts
  const { data: recentPosts } = await supabase
    .from("posts")
    .select("title, status, created_at")
    .order("created_at", { ascending: false })
    .limit(5)

  const stats = [
    {
      title: "Total Posts",
      value: postsCount || 0,
      icon: FileText,
    },
    {
      title: "Categories",
      value: categoriesCount || 0,
      icon: FolderOpen,
    },
    {
      title: "Tags",
      value: tagsCount || 0,
      icon: Hash,
    },
    {
      title: "Media Items",
      value: mediaCount || 0,
      icon: Image,
    },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">CMS Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Posts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Posts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentPosts?.map((post) => (
              <div
                key={post.title}
                className="flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{post.title}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(post.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    post.status === "published"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {post.status}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
