-- Enable RLS for tables that need it
alter table public.api_rate_limits enable row level security;
alter table public.integration_configs enable row level security;
alter table public.system_settings enable row level security;


-- Create or update RLS policies for api_rate_limits
drop policy if exists "Admin and above can view rate limits" on public.api_rate_limits;
drop policy if exists "Only super_admin can modify rate limits" on public.api_rate_limits;

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

-- Create or update RLS policies for integration_configs
drop policy if exists "Admin and above can view integration configs" on public.integration_configs;
drop policy if exists "Only super_admin can modify integration configs" on public.integration_configs;

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

-- Create or update RLS policies for system_settings
drop policy if exists "Admin and above can view system settings" on public.system_settings;
drop policy if exists "Only super_admin can modify system settings" on public.system_settings;

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
