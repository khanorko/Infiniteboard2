import type { VercelRequest } from '@vercel/node';

// In-memory store for development (resets on each deploy in production)
const memoryStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
}

// Get client IP from request
export function getClientIP(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim()
    : req.socket?.remoteAddress || 'unknown';
  
  // Hash the IP for privacy (simple hash)
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Check if Upstash is configured
function hasUpstash(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

// Upstash Redis rate limiting
async function upstashRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;

  try {
    // Use Upstash REST API for atomic increment with TTL
    const response = await fetch(`${url}/multi-exec`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', key],
        ['TTL', key],
      ]),
    });

    const result = await response.json();
    const count = result[0]?.result || 1;
    const ttl = result[1]?.result || -1;

    // Set expiry on first request
    if (ttl === -1) {
      await fetch(`${url}/expire/${key}/${Math.ceil(config.windowMs / 1000)}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
    }

    const allowed = count <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - count);
    const resetIn = ttl > 0 ? ttl * 1000 : config.windowMs;

    return { allowed, remaining, resetIn };

  } catch (error) {
    console.error('Upstash rate limit error:', error);
    // Fallback to allowing the request on error (fail open)
    return { allowed: true, remaining: config.maxRequests, resetIn: config.windowMs };
  }
}

// In-memory rate limiting (for development)
function memoryRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const record = memoryStore.get(key);

  if (!record || now > record.resetTime) {
    memoryStore.set(key, { count: 1, resetTime: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetIn: config.windowMs };
  }

  if (record.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetIn: record.resetTime - now };
  }

  record.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetIn: record.resetTime - now,
  };
}

// Main rate limit function
export async function rateLimit(
  req: VercelRequest,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const clientId = getClientIP(req);
  const key = `${config.keyPrefix || 'rl'}:${clientId}`;

  if (hasUpstash()) {
    return upstashRateLimit(key, config);
  }

  return memoryRateLimit(key, config);
}

// Preset configurations
export const RATE_LIMITS = {
  brainstorm: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 10 per hour
    keyPrefix: 'brainstorm',
  },
  clusterTitle: {
    maxRequests: 30,
    windowMs: 60 * 60 * 1000, // 30 per hour
    keyPrefix: 'cluster',
  },
};

