import { Metadata } from 'next'
import { BlogHeader } from '@/components/blog/header'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: {
    default: 'Blog',
    template: '%s | Blog',
  },
  description: 'Read our latest blog posts and articles',
  openGraph: {
    type: 'website',
    title: 'Blog',
    description: 'Read our latest blog posts and articles',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog',
    description: 'Read our latest blog posts and articles',
  },
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<div className="h-16 border-b" />}>
        <BlogHeader />
      </Suspense>
      <Suspense fallback={<div className="animate-pulse" />}>
        {children}
      </Suspense>
    </div>
  )
}
