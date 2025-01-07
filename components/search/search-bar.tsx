import { createClient } from '@/utils/supabase/server'

import { SearchForm } from './search-form'

export async function SearchBar() {
  const supabase = await createClient()

  // Get categories and tags for filters
  const [{ data: categories }, { data: tags }] = await Promise.all([
    supabase
      .from('categories')
      .select('name, slug')
      .order('name'),
    supabase
      .from('tags')
      .select('name, slug')
      .order('name')
  ])

  return (
    <div className="w-full max-w-lg mx-auto">
      <SearchForm categories={categories} tags={tags} />
    </div>
  )
}
