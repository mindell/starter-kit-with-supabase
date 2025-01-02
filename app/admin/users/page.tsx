import { createClient } from "@/utils/supabase/server"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default async function UsersPage() {
  const supabase = await createClient()

  // Get all users with their roles using the view
  const { data: users } = await supabase
    .from("users_with_roles")
    .select("*")
    .order("created_at", { ascending: false })

  // Get available roles
  const { data: roles } = await supabase
    .from("user_roles")
    .select("*")
    .not("role_name", "eq", "system")
    .order("role_name")

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Users Management</h1>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <form action="/api/users/update-role" method="POST">
                    <input type="hidden" name="userId" value={user.id} />
                    <Select
                      name="roleId"
                      defaultValue={user.role_id || ""}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles?.map((role) => (
                          <SelectItem key={role.role_id} value={role.role_id}>
                            {role.role_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </form>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={user.confirmed_at ? "success" : "destructive"}
                  >
                    {user.confirmed_at ? "Verified" : "Unverified"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {user.created_at
                    ? new Date(user.created_at).toLocaleDateString()
                    : "N/A"}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mr-2"
                    formAction="/api/users/update-role"
                  >
                    Save Role
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    formAction="/api/users/delete"
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
