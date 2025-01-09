'use client'

import { SearchForm } from './search-form'

interface SearchBarProps {
  categories: { name: string; slug: string }[]|null;
  tags: { name: string; slug: string }[]|null;
}

export function SearchBar({ categories, tags }: SearchBarProps) {
  return (
    <div className="w-full max-w-lg mx-auto">
      <SearchForm categories={categories} tags={tags} />
    </div>
  )
}
