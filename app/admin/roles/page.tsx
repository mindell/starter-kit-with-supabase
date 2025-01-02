import { createClient } from "@/utils/supabase/server"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

export default async function RolesPage() {
  const supabase = await createClient()

  // Get all roles with user counts
  const { data: rolesWithCounts } = await supabase
    .from("user_roles")
    .select(`
      *,
      roles_count:roles_assignment(count)
    `)
    .not("role_name", "eq", "system")
    .order("role_name")

  // Transform the data to include actual count
  const roles = rolesWithCounts?.map((role) => ({
    ...role,
    user_count: role.roles_count?.[0]?.count || 0,
  }))

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Roles Management</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Add New Role</Button>
          </DialogTrigger>
          <DialogContent>
            <form action="/api/roles/create" method="POST">
              <DialogHeader>
                <DialogTitle>Create New Role</DialogTitle>
                <DialogDescription>
                  Add a new role to the system. Role names should be lowercase and
                  use underscores for spaces.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role_name" className="text-right">
                    Role Name
                  </Label>
                  <Input
                    id="role_name"
                    name="role_name"
                    placeholder="e.g., content_editor"
                    className="col-span-3"
                    pattern="^[a-z_]+$"
                    title="Lowercase letters and underscores only"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Description
                  </Label>
                  <Input
                    id="description"
                    name="description"
                    placeholder="Role description"
                    className="col-span-3"
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Create Role</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Users Count</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles?.map((role) => (
              <TableRow key={role.role_id}>
                <TableCell className="font-medium">
                  {role.role_name}
                  {["super_admin", "admin", "subscriber"].includes(
                    role.role_name
                  ) && (
                    <Badge variant="secondary" className="ml-2">
                      System
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" className="h-auto p-0">
                        {role.description || "Add description"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <form
                        action="/api/roles/update"
                        method="POST"
                        className="space-y-4"
                      >
                        <input
                          type="hidden"
                          name="role_id"
                          value={role.role_id}
                        />
                        <DialogHeader>
                          <DialogTitle>Edit Role Description</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-2">
                          <Label htmlFor="description">Description</Label>
                          <Input
                            id="description"
                            name="description"
                            defaultValue={role.description || ""}
                            required
                          />
                        </div>
                        <DialogFooter>
                          <Button type="submit">Save Changes</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </TableCell>
                <TableCell>
                  {role.user_count}
                </TableCell>
                <TableCell>
                  {!["super_admin", "admin", "subscriber"].includes(
                    role.role_name
                  ) && (
                    <form
                      action="/api/roles/delete"
                      method="POST"
                      className="inline-block"
                    >
                      <input
                        type="hidden"
                        name="role_id"
                        value={role.role_id}
                      />
                      <Button
                        type="submit"
                        variant="destructive"
                        size="sm"
                        className="h-8"
                      >
                        Delete
                      </Button>
                    </form>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
