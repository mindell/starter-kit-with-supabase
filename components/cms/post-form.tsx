"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MultiSelect } from "@/components/ui/multi-select"
import { ForwardRefEditor } from "@/components/mdx/forward-ref-editor"
import "@mdxeditor/editor/style.css"

// Form validation schema
const postFormSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title must be less than 255 characters"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(255, "Slug must be less than 255 characters")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format"),
  content: z.string().min(1, "Content is required"),
  excerpt: z
    .string()
    .max(500, "Excerpt must be less than 500 characters")
    .optional(),
  status: z.enum(["draft", "scheduled", "published", "archived"]),
  scheduled_at: z.string().optional(),
  categories: z.array(z.string()).min(1, "Select at least one category"),
  tags: z.array(z.string()),
  seo_title: z
    .string()
    .max(60, "SEO title must be less than 60 characters")
    .optional(),
  seo_description: z
    .string()
    .max(160, "SEO description must be less than 160 characters")
    .optional(),
})

type PostFormValues = z.infer<typeof postFormSchema>

interface PostFormProps {
  categories: { id: string; name: string }[]
  tags: { id: string; name: string }[]
  onSubmit: (formData: FormData) => Promise<void>
  defaultValues?: any
}

export function PostForm({
  categories,
  tags,
  onSubmit,
  defaultValues,
}: PostFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showScheduling, setShowScheduling] = useState(
    defaultValues?.status === "scheduled"
  )

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postFormSchema),
    defaultValues: {
      title: defaultValues?.title || "",
      slug: defaultValues?.slug || "",
      content: defaultValues?.content || "",
      excerpt: defaultValues?.excerpt || "",
      status: defaultValues?.status || "draft",
      scheduled_at: defaultValues?.scheduled_at || "",
      seo_title: defaultValues?.seo_title || "",
      seo_description: defaultValues?.seo_description || "",
      categories: defaultValues?.categories || [],
      tags: defaultValues?.tags || [],
    },
  })

  // Watch status field to show/hide scheduling
  const status = form.watch("status")
  useEffect(() => {
    setShowScheduling(status === "scheduled")
    if (status !== "scheduled") {
      form.setValue("scheduled_at", "")
    }
  }, [status, form])

  // Handle form submission
  const handleSubmit = async (data: PostFormValues) => {
    try {
      setIsSubmitting(true)
      console.log('Form values before FormData:', data);
      
      // Create FormData object
      const formData = new FormData()
      Object.entries(data).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          console.log(`Array field ${key}:`, value);
          value.forEach((item) => {
            console.log(`Adding ${key} item:`, item);
            formData.append(key, item)
          })
        } else {
          console.log(`Adding ${key}:`, value);
          formData.append(key, value || '')
        }
      })
      
      await onSubmit(formData)
      router.push("/cms/posts")
      router.refresh()
    } catch (error) {
      console.error("Error submitting post:", error)
      setIsSubmitting(false)
      // Handle error appropriately
    }
  }

  // Auto-generate slug from title
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        {/* Title */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  onChange={(e) => {
                    field.onChange(e)
                    // Only auto-generate slug if it's empty or matches previous auto-generated value
                    const currentSlug = form.getValues("slug")
                    const previousTitle = field.value
                    if (
                      !currentSlug ||
                      currentSlug === generateSlug(previousTitle)
                    ) {
                      form.setValue("slug", generateSlug(e.target.value))
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Slug */}
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slug</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>
                The URL-friendly version of the title
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Content */}
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content</FormLabel>
              <FormControl>
                <div className="prose-container min-h-[500px] w-full rounded-md border">
                  <ForwardRefEditor
                    markdown={field.value}
                    onChange={field.onChange}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Excerpt */}
        <FormField
          control={form.control}
          name="excerpt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Excerpt</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormDescription>
                A short summary of the post (optional)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Status */}
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Scheduled At - Only show when status is scheduled */}
        {showScheduling && (
          <FormField
            control={form.control}
            name="scheduled_at"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Schedule Publication</FormLabel>
                <FormControl>
                  <Input
                    type="datetime-local"
                    {...field}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </FormControl>
                <FormDescription>
                  Choose when to publish this post
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Categories */}
        <FormField
          control={form.control}
          name="categories"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categories</FormLabel>
              <FormControl>
                <MultiSelect
                  options={categories.map((cat) => ({
                    label: cat.name,
                    value: cat.id,
                  }))}
                  onValueChange={(values) => {
                    console.log('Selected category values:', values);
                    field.onChange(values);
                  }}
                  defaultValue={field.value}
                  variant="inverted"
                  animation={2}
                  maxCount={3}
                  placeholder="Select categories"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Tags */}
        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <FormControl>
                <MultiSelect
                  options={tags.map((tag) => ({
                    label: tag.name,
                    value: tag.id,
                  }))}
                  onValueChange={(values) => {
                    console.log('Selected tag values:', values);
                    field.onChange(values);
                  }}
                  defaultValue={field.value}
                  variant="inverted"
                  animation={2}
                  maxCount={3}
                  placeholder="Select tags"
                />
              </FormControl>
              <FormDescription>Optional</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* SEO Fields */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">SEO Settings</h3>
          <FormField
            control={form.control}
            name="seo_title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SEO Title</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>
                  Defaults to post title if left empty
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="seo_description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SEO Description</FormLabel>
                <FormControl>
                  <Textarea {...field} />
                </FormControl>
                <FormDescription>
                  Defaults to post excerpt if left empty
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/cms/posts")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Post"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
