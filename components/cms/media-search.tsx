"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { useCallback } from "react"
import debounce from "lodash/debounce"

export function MediaSearch() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(name, value)
      } else {
        params.delete(name)
      }

      return params.toString()
    },
    [searchParams]
  )

  const debouncedSearch = debounce((value: string) => {
    const queryString = createQueryString("search", value)
    router.push(`/cms/media${queryString ? `?${queryString}` : ""}`)
  }, 300)

  return (
    <Input
      placeholder="Search media..."
      defaultValue={searchParams.get("search") ?? ""}
      onChange={(e) => debouncedSearch(e.target.value)}
      className="max-w-xs"
    />
  )
}
