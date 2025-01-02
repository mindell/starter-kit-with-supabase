Blog/CMS System PRD
===================

1\. System Overview
-------------------

A modern, SEO-optimized Blog/CMS system built with Next.js and Supabase, replacing Strapi while maintaining full control over content and SEO capabilities. The blog/CMS should imitate the best blogs/CMS in the work as the likes of Wordpress, Wix and Squarespace. With extremly great SEO capabilities.

2\. Core Features
-----------------

### 2.1 Content Management

-   Post Management

    -   Create, edit, delete, and draft posts
    -   Rich text editor with MDX support
    -   Media management (images, videos)
    -   Categories and tags (also a categories manager)
    -   Custom fields for SEO metadata
    -   Version history and drafts
    -   Schema Markup templates and management

-   Media Library

    -   Image optimization and responsive sizes
    -   Automatic WebP conversion
    -   Alt text management
    -   Image metadata storage
    -   CDN integration with Next.js Image optimization

### 2.2 SEO Features

-   On-page SEO

    -   Custom meta titles and descriptions
    -   Open Graph and Twitter card support
    -   Schema.org markup
    -   XML sitemaps
    -   Robots.txt configuration
    -   Canonical URLs

-   Technical SEO

    -   Server-side rendering (SSR)
    -   Static site generation (SSG)
    -   Incremental Static Regeneration (ISR)
    -   Automatic meta tags
    -   Structured data
    -   Loading speed optimization

### 2.3 Admin Dashboard

-   Content Management Interface
    -   Post editor
    -   Media manager
    -   SEO tools
    -   Google Analytics and Google Search Console integration
    -   User management

### 2.4 API and Integration

-   RESTful API
    -   Content delivery API
    -   Admin API
    -   Webhooks support
    -   Custom endpoints

3\. Technical Architecture
--------------------------

### 3.1 Frontend (existing stack)

-   Next.js 15.1.2
-   React 18.3.1
-   Tailwind CSS
-   Shadcn UI components
-   MDX for content

### 3.2 Backend (existing stack)

-   Supabase for database and storage (bucket)
-   Next.js API routes
-   Clerk for user authentication

### 3.3 Database Schema (Supabase)

Code:
´´´´

`posts
- id: uuid
- title: text
- slug: text
- content: text
- excerpt: text
- featured_image: text
- author_id: uuid
- status: enum (draft, published)
- published_at: timestamp
- created_at: timestamp
- updated_at: timestamp
- seo_title: text
- seo_description: text
- seo_keywords: text[]

categories
- id: uuid
- name: text
- slug: text
- description: text

post_categories
- post_id: uuid
- category_id: uuid

tags
- id: uuid
- name: text
- slug: text

post_tags
- post_id: uuid
- tag_id: uuid

media
- id: uuid
- url: text
- alt_text: text
- caption: text
- metadata: jsonb`

´´´

4\. Implementation Phases
-------------------------

### Phase 1: Core Infrastructure

-   Database schema setup
-   Basic API endpoints
-   Authentication integration
-   Basic post CRUD operations

### Phase 2: Content Management

-   Rich text editor implementation
-   Media management system
-   Categories and tags (also the category manager)
-   Draft system

### Phase 3: SEO Implementation

-   Meta tags system
-   Schema markup
-   Sitemap generation
-   RSS feeds

### Phase 4: Admin Dashboard

-   Dashboard UI
-   Content management interface
-   SEO tools integration
-   Analytics dashboard

### Phase 5: Advanced Features

-   Search functionality
-   Content scheduling
-   API documentation
-   Performance optimization

5\. SEO Strategy
----------------

-   Implement dynamic meta tags
-   Generate static pages for better performance
-   Create XML sitemaps
-   Add structured data
-   Optimize images and assets
-   Implement canonical URLs
-   Create SEO-friendly URLs
-   Add breadcrumbs navigation

6\. Performance Metrics
-----------------------

-   Lighthouse score > 90
-   First Contentful Paint < 1.5s
-   Time to Interactive < 3.5s
-   Core Web Vitals compliance
-   Mobile responsiveness score > 90 
