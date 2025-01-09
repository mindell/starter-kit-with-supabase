'use client'

import MarkdownIt from 'markdown-it'
import Image from 'next/image'

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
})

interface MDXContentProps {
  content: string
}

export function MDXContent({ content }: MDXContentProps) {
  const html = md.render(content || '')
  
  return (
    <div 
      className="mdx-content prose prose-lg max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}