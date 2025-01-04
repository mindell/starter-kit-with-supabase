"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface MediaEditDialogProps {
  isOpen: boolean
  onClose: () => void
  media: {
    id: string
    filename: string
    alt_text?: string
    caption?: string
  } | null
  updateMedia: (formData: FormData) => Promise<void>
}

export function MediaEditDialog({
  isOpen,
  onClose,
  media,
  updateMedia,
}: MediaEditDialogProps) {
  if (!media) return null

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    await updateMedia(formData)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Media Details</DialogTitle>
          <DialogDescription>
            Update the details for {media.filename}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="id" value={media.id} />
          <div className="space-y-2">
            <Label htmlFor="alt_text">Alt Text</Label>
            <Input
              id="alt_text"
              name="alt_text"
              defaultValue={media.alt_text || ""}
              placeholder="Describe this image"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="caption">Caption</Label>
            <Input
              id="caption"
              name="caption"
              defaultValue={media.caption || ""}
              placeholder="Add a caption"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
