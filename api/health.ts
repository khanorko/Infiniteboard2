import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasUpstash = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      gemini: hasGemini ? 'configured' : 'not configured',
      upstash: hasUpstash ? 'configured' : 'using memory (dev mode)',
    },
    rateLimits: {
      brainstorm: '10 per hour',
      clusterTitle: '30 per hour',
    },
  });
}

