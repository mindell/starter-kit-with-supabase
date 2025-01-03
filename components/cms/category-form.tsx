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
const categoryFormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(50, "Name must be less than 50 characters"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(50, "Slug must be less than 50 characters")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format"),
  description: z
    .string()
    .max(200, "Description must be less than 200 characters")
    .optional(),
})

type CategoryFormValues = z.infer<typeof categoryFormSchema>

interface CategoryFormProps {
  id?: string
  defaultValues?: Partial<CategoryFormValues>
  onSubmit: (data: CategoryFormValues) => Promise<void>
}

export function CategoryForm({
  id,
  defaultValues,
  onSubmit,
}: CategoryFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      slug: defaultValues?.slug || "",
      description: defaultValues?.description || "",
    },
  })

  const handleSubmit = async (data: CategoryFormValues) => {
    try {
      setIsLoading(true)
      await onSubmit(data)
      router.push("/cms/categories")
      router.refresh()
    } catch (error) {
      console.error("Error submitting category:", error)
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
                  placeholder="e.g. Technology" 
                  {...field} 
                  aria-label="Category name"
                />
              </FormControl>
              <FormDescription>
                The display name of the category.
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
                  placeholder="e.g. technology" 
                  {...field} 
                  aria-label="Category slug"
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
                  placeholder="Brief description of the category" 
                  {...field} 
                  aria-label="Category description"
                />
              </FormControl>
              <FormDescription>
                Optional. A short description of what this category represents.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={isLoading}
            aria-label={id ? "Update category" : "Create category"}
          >
            {isLoading ? (
              "Saving..."
            ) : id ? (
              "Update Category"
            ) : (
              "Create Category"
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
