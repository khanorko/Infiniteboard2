import path from 'path';
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Simple API handler plugin for local development
function apiPlugin(): Plugin {
  return {
    name: 'api-handler',
    configureServer(server) {
      // In-memory rate limit store for dev
      const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
      
      const checkRateLimit = (ip: string, limit: number, windowMs: number) => {
        const now = Date.now();
        const key = `rl:${ip}`;
        const record = rateLimitStore.get(key);
        
        if (!record || now > record.resetTime) {
          rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
          return { allowed: true, remaining: limit - 1 };
        }
        if (record.count >= limit) {
          return { allowed: false, remaining: 0, resetIn: record.resetTime - now };
        }
        record.count++;
        return { allowed: true, remaining: limit - record.count };
      };

      // API: Brainstorm
      server.middlewares.use('/api/brainstorm', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.statusCode = 200;
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const { context, count = 3 } = JSON.parse(body);
            const ip = req.socket.remoteAddress || 'unknown';
            
            // Check rate limit (10 per hour)
            const { allowed, remaining, resetIn } = checkRateLimit(ip, 10, 60 * 60 * 1000);
            
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('X-RateLimit-Remaining', String(remaining));
            
            if (!allowed) {
              res.statusCode = 429;
              res.end(JSON.stringify({
                error: 'Rate limit exceeded',
                message: `You've used all 10 AI brainstorms this hour. Try again in ${Math.ceil((resetIn || 0) / 60000)} minutes.`,
              }));
              return;
            }

            if (!context || context.length < 3) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Context must be at least 3 characters' }));
              return;
            }

            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }));
              return;
            }

            const prompt = `You are a creative brainstorming assistant. Context: "${context}". Generate ${count} short sticky note ideas (under 10 words each). Return ONLY a JSON array of strings.`;
            
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }],
                  generationConfig: {
                    responseMimeType: 'application/json',
                    responseSchema: { type: 'ARRAY', items: { type: 'STRING' } },
                  },
                }),
              }
            );

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            const ideas = text ? JSON.parse(text) : [];
            
            res.statusCode = 200;
            res.end(JSON.stringify({ ideas, remaining }));
          } catch (error) {
            console.error('Brainstorm error:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Failed to generate ideas' }));
          }
        });
      });

      // API: Cluster Title
      server.middlewares.use('/api/cluster-title', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.statusCode = 200;
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const { notes } = JSON.parse(body);
            
            res.setHeader('Content-Type', 'application/json');
            
            if (!notes || !Array.isArray(notes) || notes.length === 0) {
              res.statusCode = 200;
              res.end(JSON.stringify({ title: 'Empty Cluster' }));
              return;
            }

            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
              res.statusCode = 200;
              res.end(JSON.stringify({ title: 'New Cluster' }));
              return;
            }

            const context = notes.slice(0, 10).join(', ');
            const prompt = `Analyze these sticky notes and provide a single, short (2-4 words) title. Notes: "${context}". Return ONLY the title string.`;
            
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }],
                }),
              }
            );

            const data = await response.json();
            const title = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().replace(/^["']|["']$/g, '') || 'Group';
            
            res.statusCode = 200;
            res.end(JSON.stringify({ title }));
          } catch (error) {
            console.error('Cluster title error:', error);
            res.statusCode = 200;
            res.end(JSON.stringify({ title: 'Group' }));
          }
        });
      });

      // API: Health
      server.middlewares.use('/api/health', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify({
          status: 'ok',
          mode: 'development',
          gemini: process.env.GEMINI_API_KEY ? 'configured' : 'not configured',
        }));
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load env vars from .env.local
  const env = loadEnv(mode, '.', '');
  
  // Make GEMINI_API_KEY available to the API plugin
  process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
  
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      apiPlugin(), // Handle API routes in dev
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  };
});
