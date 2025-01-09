import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { SearchBar } from '@/components/search/search-bar'

async function BlogNavigation() {
  const supabase = await createClient()

  // Get categories and tags for navigation
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
    <nav className="space-x-4">
      <Link
        href="/blog"
        className="text-foreground/60 hover:text-foreground transition-colors"
      >
        All Posts
      </Link>
      {categories?.map((category) => (
        <Link
          key={category.slug}
          href={`/blog/category/${category.slug}`}
          className="text-foreground/60 hover:text-foreground transition-colors"
        >
          {category.name}
        </Link>
      ))}
    </nav>
  )
}

export async function BlogHeader() {
  const supabase = await createClient()

  // Get categories and tags for search filters
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
    <header className="border-b">
      <div className="container mx-auto py-4 space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/blog" className="text-2xl font-bold">
            Blog
          </Link>
          <SearchBar categories={categories} tags={tags} />
        </div>
        <BlogNavigation />
      </div>
    </header>
  )
}
