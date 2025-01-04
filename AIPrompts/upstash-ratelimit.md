[!NOTE] > This project is in GA Stage. The Upstash Professional Support fully covers this project. It receives regular updates, and bug fixes. The Upstash team is committed to maintaining and improving its functionality.

It is the only connectionless (HTTP based) rate limiting library and designed for:

Serverless functions (AWS Lambda, Vercel ....)
Cloudflare Workers & Pages
Vercel Edge
Fastly Compute@Edge
Next.js, Jamstack ...
Client side web/mobile applications
WebAssembly
and other environments where HTTP is preferred over TCP.
Quick Start
Install
npm
npm install @upstash/ratelimit
Deno
import { Ratelimit } from "https://cdn.skypack.dev/@upstash/ratelimit@latest";
Create database
Create a new redis database on upstash

Basic Usage
See here for documentation on how to create a redis instance.

import { Ratelimit } from "@upstash/ratelimit"; // for deno: see above
import { Redis } from "@upstash/redis"; // see below for cloudflare and fastly adapters

// Create a new ratelimiter, that allows 10 requests per 10 seconds
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  analytics: true,
  /**
   * Optional prefix for the keys used in redis. This is useful if you want to share a redis
   * instance with other applications and want to avoid key collisions. The default prefix is
   * "@upstash/ratelimit"
   */
  prefix: "@upstash/ratelimit",
});

// Use a constant string to limit all requests with a single ratelimit
// Or use a userID, apiKey or ip address for individual limits.
const identifier = "api";
const { success } = await ratelimit.limit(identifier);

if (!success) {
  return "Unable to process at this time";
}
doExpensiveCalculation();
return "Here you go!";
For Cloudflare Workers and Fastly Compute@Edge, you can use the following imports:

import { Redis } from "@upstash/redis/cloudflare"; // for cloudflare workers and pages
import { Redis } from "@upstash/redis/fastly"; // for fastly compute@edge
Here's a complete nextjs example

The limit method returns some more metadata that might be useful to you:

export type RatelimitResponse = {
  /**
   * Whether the request may pass(true) or exceeded the limit(false)
   */
  success: boolean;
  /**
   * Maximum number of requests allowed within a window.
   */
  limit: number;
  /**
   * How many requests the user has left within the current window.
   */
  remaining: number;
  /**
   * Unix timestamp in milliseconds when the limits are reset.
   */
  reset: number;

  /**
   * For the MultiRegion setup we do some synchronizing in the background, after returning the current limit.
   * Or when analytics is enabled, we send the analytics asynchronously after returning the limit.
   * In most case you can simply ignore this.
   *
   * On Vercel Edge or Cloudflare workers, you need to explicitly handle the pending Promise like this:
   *
   * ```ts
   * const { pending } = await ratelimit.limit("id")
   * context.waitUntil(pending)
   * ```
   *
   * See `waitUntil` documentation in
   * [Cloudflare]
   * and [Vercel]
   * for more details.
   * ```
   */
  pending: Promise<unknown>;
};
Using with CloudFlare Workers and Vercel Edge
When we use CloudFlare Workers and Vercel Edge, we need to be careful about making sure that the rate limiting operations complete correctly before the runtime ends after returning the response.

This is important in two cases where we do some operations in the backgroung asynchronously after limit is called:

Using MultiRegion: synchronize Redis instances in different regions
Enabling analytics: send analytics to Redis
In these cases, we need to wait for these operations to finish before sending the response to the user. Otherwise, the runtime will end and we won't be able to complete our chores.

In order to wait for these operations to finish, use the pending promise:

const { pending } = await ratelimit.limit("id");
context.waitUntil(pending);
