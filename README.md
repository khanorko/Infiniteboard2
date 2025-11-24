# Ephemeral Infinity Board 🎨

A boundless, social whiteboard where ideas flourish and fade. Features an infinite canvas, sticky notes with a cosmic lifespan (π × 10,000 seconds), and Gemini-powered AI brainstorming.

![Ephemeral Infinity Board](https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6)

## ✨ Features

- **Infinite Canvas** - Pan and zoom endlessly
- **Ephemeral Notes** - Sticky notes that disappear after 31,415 seconds (≈8.7 hours) - the perfect π cycle! 🥧
- **AI Brainstorming** - Gemini-powered idea generation
- **Real Multiplayer** - Supabase Realtime for true cross-browser/cross-device collaboration
- **Rate Limited** - Protected API to prevent cost overruns

## 🚀 Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Create .env.local with your API key
echo "GEMINI_API_KEY=your_key_here" > .env.local

# Run development server (with Vercel Functions)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Deploy to Vercel

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel Dashboard:
# - GEMINI_API_KEY (required)
# - VITE_SUPABASE_URL (for real multiplayer)
# - VITE_SUPABASE_ANON_KEY (for real multiplayer)
# - UPSTASH_REDIS_REST_URL (optional, for production rate limiting)
# - UPSTASH_REDIS_REST_TOKEN (optional)
```

Or click: [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/infiniteboard2)

## 🌐 Real Multiplayer with Supabase

To enable true cross-browser multiplayer (not just same-tab sync):

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free project
2. Copy your project URL and anon key from Settings → API

### 2. Set Up Database

In your Supabase dashboard, go to **SQL Editor** and run the schema from `supabase-schema.sql`:

```sql
-- See supabase-schema.sql for full setup
```

### 3. Enable Realtime

In Supabase dashboard:
1. Go to **Database → Replication**
2. Enable replication for `notes` and `clusters` tables

### 4. Add Environment Variables

```bash
# .env.local (for local dev)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Also add these to Vercel dashboard for production
```

### 5. Redeploy

```bash
vercel --prod
```

Now your board syncs in real-time across all users worldwide! 🎉

## 🔒 API Rate Limits

To protect against API cost overruns:

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/brainstorm` | 10 requests | per hour per IP |
| `/api/cluster-title` | 30 requests | per hour per IP |

### Upgrading Rate Limits

For production, set up [Upstash Redis](https://upstash.com) (free tier available):

1. Create a Redis database at upstash.com
2. Add environment variables:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

Without Upstash, rate limits use in-memory storage (resets on redeploy).

## 📁 Project Structure

```
├── api/                    # Vercel Serverless Functions
│   ├── brainstorm.ts      # AI brainstorming endpoint
│   ├── cluster-title.ts   # AI cluster naming endpoint
│   ├── health.ts          # Health check endpoint
│   └── _rateLimit.ts      # Shared rate limiting logic
├── components/            # React components
│   ├── StickyNote.tsx
│   ├── ClusterGroup.tsx
│   ├── Toolbar.tsx
│   └── Minimap.tsx
├── services/
│   ├── geminiService.ts   # Frontend API client
│   └── supabaseService.ts # Supabase realtime client
├── App.tsx                # Main application
├── types.ts               # TypeScript types
├── supabase-schema.sql    # Database schema for Supabase
└── vercel.json            # Vercel configuration
```

## 🛠 Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS
- **Backend**: Vercel Serverless Functions
- **AI**: Google Gemini 2.0 Flash
- **Realtime**: Supabase (PostgreSQL + Realtime)
- **Rate Limiting**: Upstash Redis (optional)

## 💰 Cost Estimation

| Users/Day | AI Calls/Day | Est. Cost/Month |
|-----------|--------------|-----------------|
| 100 | ~500 | ~$1-2 |
| 1,000 | ~5,000 | ~$10-20 |
| 10,000 | ~50,000 | ~$100-200 |

*Based on Gemini 2.0 Flash pricing (~$0.00001/request)*

## 🔗 API Endpoints

### Health Check
```
GET /api/health
```

### Brainstorm Ideas
```
POST /api/brainstorm
Content-Type: application/json

{
  "context": "startup ideas",
  "count": 3
}
```

### Generate Cluster Title
```
POST /api/cluster-title
Content-Type: application/json

{
  "notes": ["idea 1", "idea 2", "idea 3"]
}
```

## 📄 License

MIT

## 🙏 Credits

Built with [Google AI Studio](https://ai.studio.google.com) and Gemini AI.
