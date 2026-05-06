// Simple in-memory rate limiter for Supabase Edge Functions
// Note: This is per-instance and resets on function cold starts.
// For production, use a distributed rate limiter (Redis/KV).

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number = 60000
): { allowed: boolean; retryAfter: number; remaining: number } {
  const now = Date.now();
  const key = `${identifier}`;
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // First request or window expired
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { allowed: true, retryAfter: 0, remaining: maxRequests - 1 };
  }

  if (entry.count >= maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return { allowed: false, retryAfter, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, retryAfter: 0, remaining: maxRequests - entry.count };
}

export function getClientIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "unknown";
}

export function rateLimitResponse(retryAfter: number): Response {
  return new Response(
    JSON.stringify({
      ok: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: `Too many requests. Please try again in ${retryAfter} seconds.`,
      },
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    }
  );
}
