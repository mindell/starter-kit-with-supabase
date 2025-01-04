"use client"

import { MediaUpload } from "@/components/cms/media-upload"
import { MediaEditDialog } from "@/components/cms/media-edit-dialog"
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { MoreVertical, Pencil, Trash2, Image as ImageIcon } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { createClient } from "@/utils/supabase/client"

interface MediaItem {
  id: string
  filename: string
  storage_key: string
  filesize: number
  type: string
  width?: number
  height?: number
  alt_text?: string
  caption?: string
}

interface MediaGridProps {
  media: MediaItem[]
  updateMedia: (formData: FormData) => Promise<void>
  deleteMedia: (formData: FormData) => Promise<void>
}

export function MediaGrid({ media, updateMedia, deleteMedia }: MediaGridProps) {
  const router = useRouter()
  const [imageLoadError, setImageLoadError] = useState<Record<string, boolean>>({})
  const [editingMedia, setEditingMedia] = useState<MediaItem | null>(null)
  const [deletingMedia, setDeletingMedia] = useState<MediaItem | null>(null)
  const supabase = createClient()

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getImageUrl = (storageKey: string) => {
    return `${process.env.NEXT_PUBLIC_BUCKET_URL}/${storageKey}`
  }

  const handleDelete = async () => {
    if (!deletingMedia) return

    try {
      // First, delete from storage bucket
      const { error: storageError } = await supabase.storage
        .from(process.env.NEXT_PUBLIC_BUCKET_NAME!)
        .remove([deletingMedia.storage_key])

      if (storageError) {
        throw storageError
      }

      // Then, delete from database
      const form = new FormData()
      form.append("id", deletingMedia.id)
      form.append("storage_key", deletingMedia.storage_key)
      await deleteMedia(form)

      setDeletingMedia(null)
      router.refresh()
    } catch (error) {
      console.error("Error deleting media:", error)
      // Handle error (show toast notification, etc.)
    }
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <MediaUpload
          onUploadComplete={() => {
            router.refresh()
          }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {media?.map((item) => (
          <Card key={item.id} className="group">
            <CardHeader className="relative p-0">
              <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon" className="h-8 w-8">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditingMedia(item)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit Details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeletingMedia(item)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="aspect-square relative bg-gray-100 rounded-t-lg overflow-hidden">
                {item.type === "image" && !imageLoadError[item.id] ? (
                  <Image
                    src={getImageUrl(item.storage_key)}
                    alt={item.alt_text || item.filename}
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-300"
                    onError={() => setImageLoadError(prev => ({ ...prev, [item.id]: true }))}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    priority={false}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <ImageIcon className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate" title={item.filename}>
                    {item.filename}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(item.filesize)}
                    {item.width && item.height && ` • ${item.width}x${item.height}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <MediaEditDialog
        isOpen={!!editingMedia}
        onClose={() => setEditingMedia(null)}
        media={editingMedia}
        updateMedia={updateMedia}
      />

      <AlertDialog open={!!deletingMedia} onOpenChange={() => setDeletingMedia(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deletingMedia?.filename}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
