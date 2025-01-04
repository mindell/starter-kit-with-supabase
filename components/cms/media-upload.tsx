"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { createClient } from "@/utils/supabase/client"
import { v4 as uuidv4 } from "uuid"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Image as ImageIcon, X, Upload } from "lucide-react"
import Image from "next/image"
import * as tus from "tus-js-client"

interface UploadStatus {
  id: string
  file: File
  progress: number
  error?: string
  uploading: boolean
  completed: boolean
  preview?: string
}

interface MediaUploadProps {
  onUploadComplete?: (mediaIds: string[]) => void
  maxFiles?: number
  acceptedFileTypes?: string[]
  maxFileSize?: number // in bytes
}

export function MediaUpload({
  onUploadComplete,
  maxFiles = 10,
  acceptedFileTypes = ["image/*"],
  maxFileSize = 5 * 1024 * 1024, // 5MB
}: MediaUploadProps) {
  const [uploadQueue, setUploadQueue] = useState<UploadStatus[]>([])
  const supabase = createClient()

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const newFiles = acceptedFiles.map((file) => ({
        id: uuidv4(),
        file,
        progress: 0,
        uploading: false,
        completed: false,
        preview: URL.createObjectURL(file),
      }))

      setUploadQueue((prev) => [...prev, ...newFiles])

      // Process each file
      const uploadPromises = newFiles.map((fileStatus) =>
        processUpload(fileStatus)
      )

      const results = await Promise.all(uploadPromises)
      const successfulUploads = results.filter((r) => r !== null) as string[]

      if (successfulUploads.length > 0 && onUploadComplete) {
        onUploadComplete(successfulUploads)
      }
    },
    [onUploadComplete]
  )

  const processUpload = async (
    fileStatus: UploadStatus
  ): Promise<string | null> => {
    const { file, id } = fileStatus
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      throw new Error("No session found")
    }

    // Update status to uploading
    setUploadQueue((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, uploading: true } : item
      )
    )

    try {
      // Generate unique storage key
      const ext = file.name.split(".").pop()
      const storageKey = `${uuidv4()}.${ext}`

      return new Promise((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable`,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: {
            authorization: `Bearer ${session.access_token}`,
            'x-upsert': 'true',
          },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          metadata: {
            bucketName: process.env.NEXT_PUBLIC_BUCKET_NAME!,
            objectName: storageKey,
            contentType: file.type,
          },
          onError: (error) => {
            console.error("Upload error:", error)
            setUploadQueue((prev) =>
              prev.map((item) =>
                item.id === id
                  ? { ...item, error: error.message, uploading: false }
                  : item
              )
            )
            reject(error)
          },
          onProgress: (bytesUploaded, bytesTotal) => {
            const percent = (bytesUploaded / bytesTotal) * 100
            setUploadQueue((prev) =>
              prev.map((item) =>
                item.id === id ? { ...item, progress: percent } : item
              )
            )
          },
          onSuccess: async () => {
            try {
              // Get image dimensions if it's an image
              let width = undefined, height = undefined
              if (file.type.startsWith("image/")) {
                const imgUrl = URL.createObjectURL(file)
                const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
                  const img = document.createElement("img")
                  img.onload = () => {
                    resolve({
                      width: img.width,
                      height: img.height,
                    })
                  }
                  img.onerror = reject
                  img.src = imgUrl
                })
                width = dimensions.width
                height = dimensions.height
                URL.revokeObjectURL(imgUrl)
              }

              // Create media record in database
              const { error: dbError, data: media } = await supabase
                .from("media")
                .insert({
                  filename: file.name,
                  filepath: storageKey,
                  filesize: file.size,
                  mimetype: file.type,
                  width,
                  height,
                  storage_bucket: process.env.NEXT_PUBLIC_BUCKET_NAME,
                  storage_key: storageKey,
                  uploaded_by: session.user.id,
                })
                .select()
                .single()

              if (dbError) throw dbError

              // Update status to completed
              setUploadQueue((prev) =>
                prev.map((item) =>
                  item.id === id ? { ...item, completed: true, uploading: false } : item
                )
              )

              resolve(media.id)
            } catch (error: any) {
              reject(error)
            }
          },
        })

        upload.start()
      })
    } catch (error: any) {
      console.error("Upload error:", error)
      setUploadQueue((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, error: error.message, uploading: false }
            : item
        )
      )
      return null
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes.reduce(
      (acc, curr) => ({ ...acc, [curr]: [] }),
      {}
    ),
    maxSize: maxFileSize,
    maxFiles,
  })

  const removeFromQueue = (id: string) => {
    setUploadQueue((prev) => prev.filter((item) => item.id !== id))
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-primary bg-primary/10"
            : "border-gray-300 hover:border-primary"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          <Upload className="w-12 h-12 text-gray-400" />
          {isDragActive ? (
            <p className="text-lg">Drop the files here...</p>
          ) : (
            <>
              <p className="text-lg">
                Drag & drop files here, or click to select files
              </p>
              <p className="text-sm text-gray-500">
                Maximum file size: {maxFileSize / 1024 / 1024}MB
              </p>
            </>
          )}
        </div>
      </div>

      {/* Upload Queue */}
      {uploadQueue.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium">Upload Queue</h3>
          <div className="space-y-2">
            {uploadQueue.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
              >
                {/* Preview */}
                <div className="relative w-16 h-16 bg-gray-100 rounded overflow-hidden">
                  {item.preview ? (
                    <Image
                      src={item.preview}
                      alt={item.file.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <ImageIcon className="w-8 h-8 m-4 text-gray-400" />
                  )}
                </div>

                {/* File Info & Progress */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium truncate">
                      {item.file.name}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFromQueue(item.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  {item.error ? (
                    <Alert variant="destructive">
                      <AlertDescription>{item.error}</AlertDescription>
                    </Alert>
                  ) : (
                    <Progress value={item.progress} className="h-2" />
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {item.completed
                      ? "Upload complete"
                      : item.uploading
                      ? `${Math.round(item.progress)}%`
                      : "Waiting..."}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
