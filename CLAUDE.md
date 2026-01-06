# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm install              # Install dependencies
npm run dev              # Vite dev server (frontend only, no API functions)
npm run dev:vercel       # Full dev with Vercel serverless functions (recommended)
npm run build            # Production build
npm run deploy           # Deploy to Vercel production
```

Local development runs at http://localhost:3000

## Environment Variables

Create `.env.local` for local development:
```bash
GEMINI_API_KEY=your_key           # Required for AI features
VITE_SUPABASE_URL=...             # Required for multiplayer
VITE_SUPABASE_ANON_KEY=...        # Required for multiplayer
UPSTASH_REDIS_REST_URL=...        # Optional (prod rate limiting)
UPSTASH_REDIS_REST_TOKEN=...      # Optional
```

## Architecture

**Infinite canvas whiteboard** with ephemeral sticky notes that expire after π×10,000 seconds (~8.7 hours).

### Key Architectural Decisions

- **BigInt coordinates**: World positions use BigInt (stored as strings) for truly infinite canvas. Screen positions use regular numbers. See `utils/bigCoords.ts` for conversion utilities.
- **Dual sync modes**: Works offline with BroadcastChannel (same-browser tabs), or with Supabase Realtime for cross-device multiplayer.
- **Server-side AI**: Gemini API calls go through Vercel serverless functions (`/api/`) to protect API keys and enable rate limiting.

### Data Flow

1. `App.tsx` - Main state container (~1400 lines), manages notes, clusters, viewport, and multiplayer sync
2. `services/supabaseService.ts` - Database CRUD and realtime subscriptions
3. `services/geminiService.ts` - Frontend client for AI endpoints
4. `api/*.ts` - Vercel serverless functions (brainstorm, cluster-title, health)

### Component Structure

- `StickyNote.tsx` - Individual note with editing, dragging, expiration timer
- `ClusterGroup.tsx` - Visual grouping container for selected notes
- `Toolbar.tsx` - Tool selection (hand/select/note), AI brainstorm trigger
- `Minimap.tsx` - Navigation overview
- `components/Onboarding/` - First-time user flow

## Code Conventions

- TypeScript only, avoid `any`
- Functional React components with hooks
- Tailwind CSS exclusively (no CSS files), inline styles only for dynamic transforms
- Props interfaces named `ComponentNameProps`
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`

## Key Constants

```typescript
NOTE_LIFESPAN_MS = 31415000  // π × 10,000 seconds
// Tutorial area: coordinates (10000, 10000)
// AI limit: 5 requests per user (localStorage)
```

## Agents

Two specialized agents are available in `.claude/agents/`:

### Business Developer Agent
**File:** `.claude/agents/business-developer.md`
**Memory:** `.claude/agents/business-memory.md`

**Invoke with:**
- "Analyze this project commercially"
- "Run business developer analysis"
- "What are the monetization opportunities?"

**Focus:** SaaS monetization, EMEA expansion, GDPR compliance, competitive positioning.

---

### Product Manager Agent
**File:** `.claude/agents/product-manager.md`
**Memory:** `.claude/agents/pm-memory.md`

**Invoke with:**
- "Run PM analysis"
- "Analyze user journey"
- "Create a PRD for [feature]"
- "Prioritize the backlog"

**Focus:** User-centric growth, RICE prioritization, activation/retention metrics, PRD creation.

**Principles:**
1. Business Metrics First (ARR, LTV, CAC, Churn)
2. UX is Non-Negotiable
3. Outcome > Artifact
4. Ethics as a Requirement

---

### Memory Protocol
**Important:** When compacting conversations, always append session insights to the respective agent's memory file.
