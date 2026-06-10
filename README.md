# SynektaKZ

Intelligent collaboration platform for IT startups in Kazakhstan. Matches founders, investors, and talent using semantic ML-based search.

## Features

- **Smart matching** — vector embeddings (multilingual MiniLM, 384-dim) + Jaccard index composite score, HNSW index via pgvector
- **AI synergy insights** — LLM-generated explanations of why two profiles complement each other (Groq / LLaMA-3.1)
- **Role-based routing** — separate flows for founders, investors, and talent
- **Real-time notifications** — Supabase Realtime across collaboration request lifecycle
- **Privacy-preserving handshake** — contacts revealed only on mutual acceptance via SECURITY DEFINER SQL functions

## Tech Stack

| Layer | Stack |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions on Deno) |
| Vector search | pgvector, HNSW index |
| ML | HuggingFace `paraphrase-multilingual-MiniLM-L12-v2` |
| LLM | Groq API (LLaMA-3.1-8b-instant) |
| Deployment | Vercel |

## Getting Started

```bash
git clone https://github.com/AruzhanYermekbayeva/diploma_synekta.git
cd diploma_synekta
npm install
```

Create a `.env` file:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

```bash
npm run dev
```

## How Matching Works

Each startup profile is embedded into a 384-dimensional vector using a multilingual sentence transformer. Match score is computed as:

```
score = 0.7 × cosine_similarity + 0.3 × Jaccard_index
```

Profiles with `score ≥ 0.6` are considered strong matches. Validated on seed data: compatible pairs scored 0.646–0.813, incompatible pairs scored 0.119–0.142 (5.4× separation ratio).

## Project Structure

```
src/
  components/     # UI components
  pages/          # Route-level pages (Dashboard, Discover, Profile...)
  lib/            # Supabase client, utilities
supabase/
  functions/      # Edge Functions (match-startups, embed-profile, ai-synergy)
  migrations/     # SQL migrations and RLS policies
```

## Bachelor's Diploma Project

Astana IT University — Software Engineering (6B06102), 2026
