import { createClient } from "@/utils/supabase/server"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Eye } from "lucide-react"


export default async function PostsPage() {
  const supabase = await createClient()

  // Get user session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get user role
  const { data: roleData } = await supabase
    .from("roles_assignment")
    .select(`
      *,
      user_roles (
        role_name
      )
    `)
    .eq("user_id", user?.id)
    .single()

  const userRole = roleData?.user_roles?.role_name
  
  // Get posts with author and category information
  const { data: posts, error } = await supabase
    .from("posts")
    .select(`
      *,
      author:author_profiles!posts_author_profiles_fkey (
        display_name,
        avatar_url,
        email
      ),
      categories:post_categories (
        category:categories(name)
      )
    `)
    .order("created_at", { ascending: false })
   console.log('posts', posts, error);
  // If user is author, only show their posts
  const filteredPosts = userRole === "author"
    ? posts?.filter(post => post.author?.email === user?.email)
    : posts

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-100 text-green-800"
      case "draft":
        return "bg-yellow-100 text-yellow-800"
      case "archived":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Posts</h1>
        <Link href="/cms/posts/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Post
          </Button>
        </Link>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Categories</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPosts?.map((post) => (
              <TableRow key={post.id}>
                <TableCell className="font-medium">{post.title}</TableCell>
                <TableCell>
                  {post.author?.display_name || post.author?.email || 'Anonymous'}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {post.categories?.map((pc:any) => (
                      <Badge
                        key={pc.category?.name}
                        variant="secondary"
                        className="text-xs"
                      >
                        {pc.category?.name}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(post.status)}>
                    {post.status}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(post.created_at)}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Link href={`/cms/posts/${post.id}`}>
                      <Button variant="ghost" size="icon">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Link href={`/cms/posts/${post.id}/edit`}>
                      <Button variant="ghost" size="icon">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
