-- Create API tokens table
create table if not exists public.api_tokens (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    description text,
    token text not null unique,
    status text not null check (status in ('active', 'revoked')) default 'active',
    created_at timestamptz default now(),
    expires_at timestamptz,
    last_used_at timestamptz,
    created_by_ip text,
    last_used_ip text
);

-- Enable RLS
alter table public.api_tokens enable row level security;

-- Create policies
create policy "Users can view their own tokens"
    on public.api_tokens for select
    using (auth.uid() = user_id);

create policy "Users can create their own tokens"
    on public.api_tokens for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own tokens"
    on public.api_tokens for update
    using (auth.uid() = user_id);

-- Create function to generate secure token
create or replace function public.generate_api_token()
returns trigger
language plpgsql
security definer
as $$
declare
    token_bytes bytea;
    token_string text;
begin
    -- Generate 32 random bytes
    token_bytes := gen_random_bytes(32);
    -- Convert to base64
    token_string := encode(token_bytes, 'base64');
    -- Replace special characters
    token_string := replace(replace(replace(token_string, '/', '_'), '+', '-'), '=', '');
    -- Add prefix
    new.token := 'sk_' || token_string;
    return new;
end;
$$;

-- Create trigger to generate token on insert
create trigger generate_api_token_trigger
    before insert on public.api_tokens
    for each row
    execute function public.generate_api_token();

-- Create function to validate token
create or replace function public.validate_api_token(token_str text)
returns uuid
language plpgsql
security definer
as $$
declare
    token_record record;
    check_time timestamptz;
begin
    check_time := now();
    
    -- Find and validate token
    select * into token_record
    from public.api_tokens
    where token = token_str
    and status = 'active'
    and (expires_at is null or expires_at > check_time);
    
    if token_record.id is null then
        return null;
    end if;
    
    -- Update last used timestamp
    update public.api_tokens
    set 
        last_used_at = check_time,
        last_used_ip = current_setting('request.headers')::json->>'x-forwarded-for'
    where id = token_record.id;
    
    return token_record.user_id;
end;
$$;
