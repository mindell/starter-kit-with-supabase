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

export async function validateRoleAccess(
  supabase: any,
  userId: string,
  requiredRoles: string[]
): Promise<boolean> {
  if (!requiredRoles.length) return true;
  
  const { data: userRoles } = await supabase
    .from('roles_assignment')
    .select('user_roles(role_name)')
    .eq('user_id', userId);

  if (!userRoles?.length) return false;

  const userRoleNames = userRoles.map((r: any) => r.user_roles.role_name);
  return requiredRoles.some(role => userRoleNames.includes(role));
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
  return {
    success: true,
    limit: limits.requestsPerMinute,
    remaining: limits.requestsPerMinute - cached.data.count,
    reset: cached.data.start + windowMs,
  };
}

export async function cacheData(
  key: string,
  data: any,
  config: CacheConfig
): Promise<void> {
  if (config.strategy === 'redis' && redis) {
    await redis.set(key, JSON.stringify(data), { ex: config.ttl });
  } else if (config.strategy === 'in_memory') {
    memoryCache.set(key, {
      data,
      timestamp: Date.now() + config.ttl * 1000,
    });
  }
}

export async function getCachedData(
  key: string,
  config: CacheConfig
): Promise<any | null> {
  if (config.strategy === 'redis' && redis) {
    const data = await redis.get(key);
    return data ? JSON.parse(data as string) : null;
  } else if (config.strategy === 'in_memory') {
    const cached = memoryCache.get(key);
    if (cached && Date.now() < cached.timestamp) {
      return cached.data;
    }
    memoryCache.delete(key);
  }
  return null;
}

export async function getUserRoles(supabase: any, userId: string) {
  const { data: userRoles } = await supabase
    .from('roles_assignment')
    .select('user_roles(role_name)')
    .eq('user_id', userId);

  if (!userRoles?.length) return [];

  return userRoles.map((r: any) => r.user_roles.role_name);
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

  // Get endpoint configuration
  const path = request.nextUrl.pathname;
  // Normalize the path for database lookup
  const segments = path.split('/');
  const normalizedPath = segments
    .map(segment => {
      // Check if segment is a UUID or numeric ID
      return /^[0-9a-fA-F-]+$/.test(segment) ? '{id}' : segment;
    })
    .join('/');
  
  const { data: endpoint } = await supabase
    .from('api_endpoints')
    .select('*')
    .eq('path', normalizedPath)
    .eq('method', request.method)
    .single();

  if (!endpoint || !endpoint.is_active) {
    return NextResponse.json(
      { error: 'Endpoint not found or inactive' },
      { status: 404 }
    );
  }

  // Get user context (even for public endpoints)
  let user;
  const authHeader = request.headers.get('authorization');
  
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(token);
    if (!tokenError) {
      user = tokenUser;
    }
  } else {
    const { data: { user: sessionUser }, error: sessionError } = await supabase.auth.getUser();
    if (!sessionError) {
      user = sessionUser;
    }
  }

  // For non-public endpoints, require authentication
  if (!endpoint.is_public) {
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
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
    const rateLimitConfig = endpoint.rate_limit_override || {
      requestsPerMinute: 60 // Default rate limit
    };

    const rateLimit = await validateRateLimit(
      `${user.id}:${path}`,
      rateLimitConfig
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

  // Add user context to request for handlers
  (request as any).user = user;
  (request as any).userRoles = user ? await getUserRoles(supabase, user.id) : [];

  // Handle caching
  const cacheKey = endpoint.is_public ? 
    `${path}:${request.method}:public` :
    `${path}:${request.method}:${user?.id}`;

  const cacheConfig = {
    strategy: endpoint.cache_strategy,
    ttl: endpoint.cache_ttl_seconds,
  };

  if (request.method === 'GET' && endpoint.cache_ttl_seconds > 0) {
    const cachedData = await getCachedData(cacheKey, cacheConfig);
    if (cachedData) {
      return NextResponse.json(cachedData);
    }
  }

  // Execute the handler
  const response = await handler();
  
  // Cache the response if it's a GET request and successful
  if (request.method === 'GET' && endpoint.cache_ttl_seconds > 0 && response.status === 200) {
    try {
      // Check if response has JSON content
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const clonedResponse = response.clone();
        const responseData = await clonedResponse.json();
        await cacheData(cacheKey, responseData, cacheConfig);
      }
    } catch (error) {
      // Log error but don't fail the request
      console.error('Error caching response:', error);
    }
  }

  return response;
}
