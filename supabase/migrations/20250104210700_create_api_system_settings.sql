-- Migration file: API and System Settings
-- Description: Creates tables for API configurations, rate limits, and system settings
-- Author: Cascade AI
-- Date: 2025-01-04

-- Create enum for cache strategy
create type public.cache_strategy as enum ('in_memory', 'redis', 'cdn');

-- Create enum for api_type
create type public.api_type as enum ('rest', 'graphql');

-- System settings table
create table public.system_settings (
    id uuid primary key default uuid_generate_v4(),
    key text not null unique,
    value jsonb not null,
    description text,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    updated_by uuid references auth.users(id),
    is_encrypted boolean default false,
    constraint valid_key check (char_length(key) >= 1 and char_length(key) <= 255)
);

-- API rate limits configuration
create table public.api_rate_limits (
    id uuid primary key default uuid_generate_v4(),
    role_id uuid references public.user_roles(role_id),
    requests_per_minute integer not null default 60,
    requests_per_hour integer not null default 1000,
    requests_per_day integer not null default 10000,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    updated_by uuid references auth.users(id),
    constraint valid_limits check (
        requests_per_minute >= 1 and
        requests_per_hour >= requests_per_minute and
        requests_per_day >= requests_per_hour
    )
);

-- Third-party integration configurations
create table public.integration_configs (
    id uuid primary key default uuid_generate_v4(),
    name text not null unique,
    provider text not null,
    config jsonb not null default '{}'::jsonb,
    is_active boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    updated_by uuid references auth.users(id)
);

-- API endpoints configuration
create table public.api_endpoints (
    id uuid primary key default uuid_generate_v4(),
    path text not null,
    method text not null,
    api_type public.api_type default 'rest',
    cache_strategy public.cache_strategy default 'in_memory',
    cache_ttl_seconds integer default 300,
    rate_limit_override jsonb,
    required_roles uuid[] default array[]::uuid[],
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    updated_by uuid references auth.users(id),
    constraint valid_path check (char_length(path) >= 1),
    constraint valid_method check (method in ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
    constraint valid_cache_ttl check (cache_ttl_seconds >= 0)
);

-- Insert default rate limits
insert into public.api_rate_limits (role_id, requests_per_minute, requests_per_hour, requests_per_day)
select 
    ur.role_id,
    case ur.role_name
        when 'super_admin' then 1000
        when 'admin' then 500
        when 'editor' then 300
        when 'author' then 200
        when 'subscriber' then 60
        else 30
    end as requests_per_minute,
    case ur.role_name
        when 'super_admin' then 50000
        when 'admin' then 25000
        when 'editor' then 15000
        when 'author' then 10000
        when 'subscriber' then 3000
        else 1500
    end as requests_per_hour,
    case ur.role_name
        when 'super_admin' then 1000000
        when 'admin' then 500000
        when 'editor' then 300000
        when 'author' then 200000
        when 'subscriber' then 50000
        else 25000
    end as requests_per_day
from public.user_roles ur;

-- RLS Policies

-- System settings policies
create policy "Only super_admin can modify system settings"
    on public.system_settings
    for all
    to authenticated
    using (
        exists (
            select 1 from public.roles_assignment ra
            join public.user_roles ur on ra.role_id = ur.role_id
            where ra.user_id = auth.uid()
            and ur.role_name = 'super_admin'
        )
    );

create policy "Admin and above can view system settings"
    on public.system_settings
    for select
    to authenticated
    using (
        exists (
            select 1 from public.roles_assignment ra
            join public.user_roles ur on ra.role_id = ur.role_id
            where ra.user_id = auth.uid()
            and ur.role_name in ('super_admin', 'admin')
        )
    );

-- Rate limits policies
create policy "Only super_admin can modify rate limits"
    on public.api_rate_limits
    for all
    to authenticated
    using (
        exists (
            select 1 from public.roles_assignment ra
            join public.user_roles ur on ra.role_id = ur.role_id
            where ra.user_id = auth.uid()
            and ur.role_name = 'super_admin'
        )
    );

create policy "Admin and above can view rate limits"
    on public.api_rate_limits
    for select
    to authenticated
    using (
        exists (
            select 1 from public.roles_assignment ra
            join public.user_roles ur on ra.role_id = ur.role_id
            where ra.user_id = auth.uid()
            and ur.role_name in ('super_admin', 'admin')
        )
    );

-- Integration configs policies
create policy "Only super_admin can modify integration configs"
    on public.integration_configs
    for all
    to authenticated
    using (
        exists (
            select 1 from public.roles_assignment ra
            join public.user_roles ur on ra.role_id = ur.role_id
            where ra.user_id = auth.uid()
            and ur.role_name = 'super_admin'
        )
    );

create policy "Admin and above can view integration configs"
    on public.integration_configs
    for select
    to authenticated
    using (
        exists (
            select 1 from public.roles_assignment ra
            join public.user_roles ur on ra.role_id = ur.role_id
            where ra.user_id = auth.uid()
            and ur.role_name in ('super_admin', 'admin')
        )
    );

-- API endpoints policies
create policy "Only super_admin can modify API endpoints"
    on public.api_endpoints
    for all
    to authenticated
    using (
        exists (
            select 1 from public.roles_assignment ra
            join public.user_roles ur on ra.role_id = ur.role_id
            where ra.user_id = auth.uid()
            and ur.role_name = 'super_admin'
        )
    );

create policy "Admin and above can view API endpoints"
    on public.api_endpoints
    for select
    to authenticated
    using (
        exists (
            select 1 from public.roles_assignment ra
            join public.user_roles ur on ra.role_id = ur.role_id
            where ra.user_id = auth.uid()
            and ur.role_name in ('super_admin', 'admin')
        )
    );

-- Insert default system settings
insert into public.system_settings (key, value, description) 
values 
    ('default_cache_strategy', '"in_memory"', 'Default caching strategy for the API'),
    ('default_cache_ttl', '300', 'Default cache TTL in seconds'),
    ('enable_graphql', 'false', 'Enable GraphQL API support'),
    ('api_version', '"1.0.0"', 'Current API version');
