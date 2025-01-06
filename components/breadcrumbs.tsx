import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export type Breadcrumb = {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: Breadcrumb[]
  className?: string
}

export function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  // Add structured data for breadcrumbs
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@id': item.href,
        name: item.label,
      },
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <nav className={`flex ${className}`} aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2">
          <li>
            <Link
              href="/"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Home
            </Link>
          </li>
          {items.map((item, i) => (
            <li key={i} className="flex items-center space-x-2">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              {item.href ? (
                <Link
                  href={item.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-sm font-medium">{item.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  )
}
