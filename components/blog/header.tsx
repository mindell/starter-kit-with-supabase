import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { SearchBar } from '@/components/search/search-bar'

interface NavigationData {
  categories: { name: string; slug: string }[] | null
  tags: { name: string; slug: string }[] | null
}

function BlogNavigation({ categories, tags }: NavigationData) {
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

  // Get categories and tags for navigation and search
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
          <div className="w-full max-w-lg mx-auto">
            <SearchBar categories={categories} tags={tags} />
          </div>
        </div>
        <BlogNavigation categories={categories} tags={tags} />
      </div>
    </header>
  )
}
