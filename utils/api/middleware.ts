import {createClient} from "@/utils/supabase/server";
import { type NextRequest, NextResponse } from "next/server";
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { PROTECTED_API_PATHS, 
  PUBLIC_PATHS,
 } from "@/utils/constants";

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
      reset: cached.timestamp,
    };
  }

  cached.data.count++;
  return {
    success: true,
    limit: limits.requestsPerMinute,
    remaining: limits.requestsPerMinute - cached.data.count,
    reset: cached.timestamp,
  };
}

export async function apiMiddleware(
  request: NextRequest,
  handler: () => Promise<NextResponse>
) {
  try {
    const path = request.nextUrl.pathname;

    // Check if path is public
    const isPublicPath = PUBLIC_PATHS.some(pp => 
      path === pp || path.startsWith(`${pp}/`)
    );
    if (isPublicPath) {
      return handler();
    }

    // Apply rate limiting
    const rateLimit = await validateRateLimit(request.ip || 'anonymous', {
      requestsPerMinute: 60,
    });

    if (!rateLimit.success) {
      return new NextResponse(
        JSON.stringify({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded',
          ...rateLimit,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.reset.toString(),
          },
        }
      );
    }

    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      return new NextResponse(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Authentication required',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check API path against protected paths
    for (const [key, config] of Object.entries(PROTECTED_API_PATHS)) {
      if (path.startsWith(config.path)) {
        // Validate role access
        const hasAccess = await validateRoleAccess(supabase, user?.id as string, [...config.roles]);
        if (!hasAccess) {
          return new NextResponse(
            JSON.stringify({
              error: 'Forbidden',
              message: 'Insufficient permissions',
            }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
        break;
      }
    }

    // If we get here, request is authorized
    return handler();
  } catch (error) {
    console.error('API Middleware Error:', error);
    return new NextResponse(
      JSON.stringify({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
