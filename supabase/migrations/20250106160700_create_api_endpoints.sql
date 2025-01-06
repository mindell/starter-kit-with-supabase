-- Migration file: API Endpoints Management
-- Description: Creates tables and functions for API endpoint management with proper RLS policies
-- Author: Cascade AI
-- Date: 2025-01-06

-- Drop existing table if exists
drop table if exists public.api_endpoints;

-- Create API endpoints table
create table public.api_endpoints (
    id uuid primary key default uuid_generate_v4(),
    path text not null,
    method text not null,
    description text,
    required_roles text[] default array[]::text[],
    is_public boolean default false,
    is_active boolean default true,
    cache_strategy text default 'in_memory',
    cache_ttl_seconds integer default 60,
    rate_limit_override jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    constraint valid_method check (method in ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
    constraint valid_cache_strategy check (cache_strategy in ('in_memory', 'redis', 'cdn')),
    unique(path, method)
);

-- Create function to validate roles against user_roles
create or replace function public.fn_validate_api_endpoint_roles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    invalid_role text;
begin
    -- Check if all required_roles exist in user_roles
    select role_name into invalid_role
    from unnest(new.required_roles) as role_name
    where role_name not in (
        select role_name from public.user_roles
    )
    limit 1;

    if invalid_role is not null then
        raise exception 'Invalid role: %', invalid_role;
    end if;

    return new;
end;
$$;

-- Create trigger for role validation
create trigger before_api_endpoint_change
    before insert or update on public.api_endpoints
    for each row
    execute function public.fn_validate_api_endpoint_roles();

-- Create update trigger for updated_at
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger handle_api_endpoints_updated_at
    before update on public.api_endpoints
    for each row
    execute function public.handle_updated_at();

-- Enable RLS
alter table public.api_endpoints enable row level security;

-- Create RLS policies
create policy "API endpoints are viewable by authenticated users"
    on public.api_endpoints
    for select
    to authenticated
    using (true);

create policy "Only admins can modify API endpoints"
    on public.api_endpoints
    for all
    to authenticated
    using (
        exists (
            select 1 from public.roles_assignment ra
            join public.user_roles ur on ra.role_id = ur.role_id
            where ra.user_id = auth.uid()
            and ur.role_name in ('super_admin', 'admin')
        )
    );

-- Insert default endpoints
insert into public.api_endpoints 
    (path, method, description, required_roles, is_public, cache_strategy, cache_ttl_seconds) 
values
    -- Posts endpoints
    ('/api/posts', 'GET', 'List published posts', array[]::text[], true, 'redis', 300),
    ('/api/posts/my', 'GET', 'List user''s own posts', array['author', 'editor', 'admin']::text[], false, 'in_memory', 0),
    ('/api/posts', 'POST', 'Create a new post', array['admin', 'editor', 'author']::text[], false, 'in_memory', 0),
    ('/api/posts/{id}', 'GET', 'Get a specific published post', array[]::text[], true, 'redis', 300),
    ('/api/posts/{id}/preview', 'GET', 'Preview a specific post (draft/private)', array['author', 'editor', 'admin']::text[], false, 'in_memory', 0),
    ('/api/posts/{id}', 'PUT', 'Update a post', array['admin', 'editor', 'author']::text[], false, 'in_memory', 0),
    ('/api/posts/{id}', 'DELETE', 'Delete a post', array['admin', 'editor']::text[], false, 'in_memory', 0),
    
    -- Categories endpoints
    ('/api/categories', 'GET', 'List public categories', array[]::text[], true, 'redis', 600),
    ('/api/categories/my', 'GET', 'List user''s own categories', array['editor', 'admin']::text[], false, 'in_memory', 0),
    ('/api/categories', 'POST', 'Create a new category', array['admin', 'editor']::text[], false, 'in_memory', 0),
    ('/api/categories/{id}', 'GET', 'Get a specific public category', array[]::text[], true, 'redis', 600),
    ('/api/categories/{id}', 'PUT', 'Update a category', array['admin', 'editor']::text[], false, 'in_memory', 0),
    ('/api/categories/{id}', 'DELETE', 'Delete a category', array['admin']::text[], false, 'in_memory', 0),
    
    -- Tags endpoints
    ('/api/tags', 'GET', 'List public tags', array[]::text[], true, 'redis', 600),
    ('/api/tags/my', 'GET', 'List user''s own tags', array['editor', 'admin']::text[], false, 'in_memory', 0),
    ('/api/tags', 'POST', 'Create a new tag', array['admin', 'editor']::text[], false, 'in_memory', 0),
    ('/api/tags/{id}', 'GET', 'Get a specific public tag', array[]::text[], true, 'redis', 600),
    ('/api/tags/{id}', 'PUT', 'Update a tag', array['admin', 'editor']::text[], false, 'in_memory', 0),
    ('/api/tags/{id}', 'DELETE', 'Delete a tag', array['admin']::text[], false, 'in_memory', 0);
