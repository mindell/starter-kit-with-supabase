"use client"

import { useState } from "react"
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

// Form validation schema
const tagFormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(30, "Name must be less than 30 characters"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(30, "Slug must be less than 30 characters")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format"),
  description: z
    .string()
    .max(100, "Description must be less than 100 characters")
    .optional(),
})

type TagFormValues = z.infer<typeof tagFormSchema>

interface TagFormProps {
  id?: string
  defaultValues?: Partial<TagFormValues>
  onSubmit: (data: TagFormValues) => Promise<void>
}

export function TagForm({
  id,
  defaultValues,
  onSubmit,
}: TagFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<TagFormValues>({
    resolver: zodResolver(tagFormSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      slug: defaultValues?.slug || "",
      description: defaultValues?.description || "",
    },
  })

  const handleSubmit = async (data: TagFormValues) => {
    try {
      setIsLoading(true)
      await onSubmit(data)
      router.push("/cms/tags")
      router.refresh()
    } catch (error) {
      console.error("Error submitting tag:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input 
                  placeholder="e.g. JavaScript" 
                  {...field} 
                  aria-label="Tag name"
                />
              </FormControl>
              <FormDescription>
                The display name of the tag.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slug</FormLabel>
              <FormControl>
                <Input 
                  placeholder="e.g. javascript" 
                  {...field} 
                  aria-label="Tag slug"
                />
              </FormControl>
              <FormDescription>
                The URL-friendly version of the name. Use only lowercase letters, numbers, and hyphens.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Brief description of the tag" 
                  {...field} 
                  aria-label="Tag description"
                />
              </FormControl>
              <FormDescription>
                Optional. A short description of what this tag represents.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={isLoading}
            aria-label={id ? "Update tag" : "Create tag"}
          >
            {isLoading ? (
              "Saving..."
            ) : id ? (
              "Update Tag"
            ) : (
              "Create Tag"
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
