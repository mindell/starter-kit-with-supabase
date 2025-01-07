'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Filter } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useDebounce } from '@/hooks/use-debounce'

interface SearchFormProps {
  categories: { name: string; slug: string }[]|null;
  tags: { name: string; slug: string }[]|null;
}

export function SearchForm({ categories = [], tags = [] }: SearchFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [category, setCategory] = useState(searchParams.get('category') || 'all')
  const [tag, setTag] = useState(searchParams.get('tag') || 'all')
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<{ query: string; count: number }[]>([])
  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setSuggestions([])
      return
    }

    fetch(`/api/search/suggestions?q=${encodeURIComponent(debouncedQuery)}`)
      .then(res => res.json())
      .then(data => {
        setSuggestions(data.suggestions || [])
        setOpen(true)
      })
      .catch(console.error)
  }, [debouncedQuery])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() && category === 'all' && tag === 'all') return

    startTransition(() => {
      const params = new URLSearchParams()
      if (query.trim()) params.set('q', query)
      if (category && category !== 'all') params.set('category', category)
      if (tag && tag !== 'all') params.set('tag', tag)
      router.push(`/blog/search?${params.toString()}`)
    })
    setOpen(false)
  }

  const handleReset = () => {
    setQuery('')
    setCategory('all')
    setTag('all')
    router.push('/blog/search')
  }

  const handleSuggestionSelect = (selectedQuery: string) => {
    setQuery(selectedQuery)
    setOpen(false)
    startTransition(() => {
      const params = new URLSearchParams()
      params.set('q', selectedQuery)
      if (category && category !== 'all') params.set('category', category)
      if (tag && tag !== 'all') params.set('tag', tag)
      router.push(`/blog/search?${params.toString()}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-lg">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Popover open={open && suggestions.length > 0} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <div>
                <Input
                  type="search"
                  placeholder="Search posts..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pr-12"
                />
              </div>
            </PopoverTrigger>
            <PopoverContent className="p-0" align="start">
              <Command>
                <CommandList>
                  <CommandGroup heading="Suggestions">
                    {suggestions.map(({ query: suggestion, count }) => (
                      <CommandItem
                        key={suggestion}
                        onSelect={() => handleSuggestionSelect(suggestion)}
                      >
                        <Search className="mr-2 h-4 w-4" />
                        <span>{suggestion}</span>
                        <span className="ml-auto text-muted-foreground text-sm">
                          {count} searches
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
                <CommandEmpty>No suggestions found.</CommandEmpty>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Search Filters</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.slug} value={cat.slug}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tag</label>
                <Select value={tag} onValueChange={setTag}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tags</SelectItem>
                    {tags?.map((t) => (
                      <SelectItem key={t.slug} value={t.slug}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={handleReset}>
                  Reset
                </Button>
                <Button type="submit">Apply Filters</Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <Button type="submit" variant="default">
          <Search className="h-4 w-4" />
          <span className="sr-only">Search</span>
        </Button>
      </div>
    </form>
  )
}
