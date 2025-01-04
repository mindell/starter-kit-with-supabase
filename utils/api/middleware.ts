import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// Initialize Redis client if configured
let redis: Redis | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = Redis.fromEnv();
}

// Types for memory cache
interface MemoryCacheEntry<T> {
  data: T;
  timestamp: number;
}

interface RateLimitData {
  count: number;
  start: number;
}

// In-memory cache
const memoryCache = new Map<string, MemoryCacheEntry<any>>();

interface CacheConfig {
  strategy: 'in_memory' | 'redis' | 'cdn';
  ttl: number;
}

export async function getRateLimits(supabase: any, userId: string): Promise<{
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
} | null> {
  const { data: userRole } = await supabase
    .from('roles_assignment')
    .select('role_id')
    .eq('user_id', userId)
    .single();

  if (!userRole) return null;

  const { data: rateLimits } = await supabase
    .from('api_rate_limits')
    .select('*')
    .eq('role_id', userRole.role_id)
    .single();

  return rateLimits;
}

export async function validateRoleAccess(
  supabase: any,
  userId: string,
  requiredRoles: string[]
): Promise<boolean> {
  const { data: userRoles } = await supabase
    .from('roles_assignment')
    .select('user_roles(role_name)')
    .eq('user_id', userId);

  if (!userRoles?.length) return false;

  const userRoleNames = userRoles.map((r: any) => r.user_roles.role_name);
  return requiredRoles.some(role => userRoleNames.includes(role));
}

export async function cacheData(
  key: string,
  data: any,
  config: CacheConfig
): Promise<void> {
  if (config.strategy === 'in_memory') {
    memoryCache.set(key, {
      data,
      timestamp: Date.now() + config.ttl * 1000,
    });
  } else if (config.strategy === 'redis' && redis) {
    await redis.set(key, JSON.stringify(data), {
      ex: config.ttl,
    });
  }
}

export async function getCachedData(
  key: string,
  config: CacheConfig
): Promise<any | null> {
  if (config.strategy === 'in_memory') {
    const cached = memoryCache.get(key);
    if (cached && cached.timestamp > Date.now()) {
      return cached.data;
    }
    memoryCache.delete(key);
    return null;
  } else if (config.strategy === 'redis' && redis) {
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached as string) : null;
  }
  return null;
}

export async function validateRateLimit(
  identifier: string,
  limits: { requestsPerMinute: number }
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  if (redis) {
    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limits.requestsPerMinute, "1m"),
      analytics: true,
      prefix: "@upstash/ratelimit",
    });

    const result = await ratelimit.limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  }

  // Fallback to simple in-memory rate limiting
  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  
  const cached = memoryCache.get(key) as MemoryCacheEntry<RateLimitData> | undefined;

  if (!cached || now - cached.data.start >= windowMs) {
    memoryCache.set(key, {
      data: { count: 1, start: now },
      timestamp: now + windowMs,
    });
    return {
      success: true,
      limit: limits.requestsPerMinute,
      remaining: limits.requestsPerMinute - 1,
      reset: now + windowMs,
    };
  }

  if (cached.data.count >= limits.requestsPerMinute) {
    return {
      success: false,
      limit: limits.requestsPerMinute,
      remaining: 0,
      reset: cached.data.start + windowMs,
    };
  }

  cached.data.count++;
  memoryCache.set(key, {
    data: cached.data,
    timestamp: cached.timestamp,
  });
  
  return {
    success: true,
    limit: limits.requestsPerMinute,
    remaining: limits.requestsPerMinute - cached.data.count,
    reset: cached.data.start + windowMs,
  };
}

export async function apiMiddleware(
  request: NextRequest,
  handler: () => Promise<NextResponse>
) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );

  // Get user from session
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Get endpoint configuration
  const path = request.nextUrl.pathname;
  const { data: endpoint } = await supabase
    .from('api_endpoints')
    .select('*')
    .eq('path', path)
    .eq('method', request.method)
    .single();

  if (!endpoint || !endpoint.is_active) {
    return NextResponse.json(
      { error: 'Endpoint not found or inactive' },
      { status: 404 }
    );
  }

  // Validate role access
  if (endpoint.required_roles.length > 0) {
    const hasAccess = await validateRoleAccess(
      supabase,
      user.id,
      endpoint.required_roles
    );
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
  }

  // Apply rate limiting
  const limits = endpoint.rate_limit_override || 
    await getRateLimits(supabase, user.id);

  if (limits) {
    const rateLimit = await validateRateLimit(
      `${user.id}:${path}`,
      limits
    );

    if (!rateLimit.success) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          ...rateLimit
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.reset.toString(),
          }
        }
      );
    }
  }

  // Handle caching
  const cacheKey = `${path}:${request.method}:${user.id}`;
  const cacheConfig = {
    strategy: endpoint.cache_strategy,
    ttl: endpoint.cache_ttl_seconds,
  };

  if (request.method === 'GET') {
    const cachedData = await getCachedData(cacheKey, cacheConfig);
    if (cachedData) {
      return NextResponse.json(cachedData);
    }
  }

  // Execute the handler
  const response = await handler();
  
  // Cache the response if it's a GET request
  if (request.method === 'GET' && response.status === 200) {
    const responseData = await response.json();
    await cacheData(cacheKey, responseData, cacheConfig);
    return NextResponse.json(responseData);
  }

  return response;
}
