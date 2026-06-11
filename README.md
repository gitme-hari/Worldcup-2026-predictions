# World Cup 2026 Predictions

Internal tool for comparing three football forecasting models during the FIFA World Cup 2026. Track predictions, enter results, compare model performance, and drill into group standings and the knockout bracket.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) + TypeScript | File-based routing, RSC, excellent Vercel/Netlify deploy |
| Styling | Tailwind CSS | Fast, data-dense UIs without bespoke CSS |
| Auth + DB | Supabase (optional for V1) | Postgres + Auth in one hosted service, easy RLS |
| State (V1) | localStorage | No backend needed to start — swap for Supabase queries later |

## Features

- **Home dashboard** — active model, upcoming matches, predicted champion + semis + group winners, model performance summary
- **Match predictions** — all 48 group stage fixtures with per-model expected goals, win/draw/loss probabilities, score overrides
- **Group standings** — auto-computed from active model predictions or entered results, toggle between sources
- **Knockout bracket** — R32 through Final, auto-populated from group winners, click to override any slot
- **Bonus predictions** — champion, semi-finalists, group winners, top scorer team — auto-fill from model or edit manually
- **Results entry** — enter actual scores; updates model metrics instantly
- **Model metrics** — outcome accuracy, Brier score, log loss, home/away MAE per model
- **Settings** — switch active model (A / B / C / Hybrid), set hybrid blend weights

## Models

| Model | Approach |
|---|---|
| **A — Poisson** | Elo/SPI-style team ratings + bivariate Poisson. Outputs λ_home, λ_away, win/draw/loss probs. Transparent, established baseline. |
| **B — ML** | Gradient boosting / random forest ensemble on team rating features. Captures non-linear patterns. |
| **C — Market** | Bookmaker odds → implied probabilities, vig-normalized. Reflects sharp-money consensus. |
| **Hybrid** | Weighted blend of A, B, C. Weights editable in Settings. |

## Quick Start (V1 — no backend needed)

```bash
cd worldcup-app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). All data persists in `localStorage` — no database needed for V1.

## Production Deploy (Vercel)

1. Push repo to GitHub
2. Import to [Vercel](https://vercel.com) → set **Root Directory** to `worldcup-app`
3. Add env vars from `.env.example` (optional for localStorage-only mode)
4. Deploy

## Supabase Setup (for multi-user / persistent backend)

1. Create a project at [supabase.com](https://supabase.com)
2. Run `worldcup-app/supabase/migrations/001_initial_schema.sql` in the SQL editor
3. Copy your project URL and anon key into `worldcup-app/.env.local`

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL      — Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY — Public anon key (safe for browser)
SUPABASE_SERVICE_ROLE_KEY     — Service role key (server-side seed/admin only)
```

## Project Structure

```
worldcup-app/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── page.tsx         # Home dashboard
│   │   ├── matches/         # Match list + [id] detail
│   │   ├── groups/          # Group standings
│   │   ├── bracket/         # Knockout bracket
│   │   ├── bonus/           # Bonus predictions
│   │   ├── results/         # Results entry (admin)
│   │   ├── metrics/         # Model A/B testing
│   │   └── settings/        # Model control
│   ├── components/
│   │   ├── ui/              # Badge, Button, Card, Input, Modal, Select
│   │   ├── layout/          # Header, Nav
│   │   ├── dashboard/       # HomeDashboard, ActiveModelBadge
│   │   ├── matches/         # MatchList, MatchDetail
│   │   ├── groups/          # GroupStandings
│   │   ├── bracket/         # KnockoutBracket
│   │   ├── bonus/           # BonusPredictions
│   │   ├── results/         # ResultsEntry
│   │   ├── metrics/         # MetricsPanel
│   │   └── settings/        # ModelSettings
│   └── lib/
│       ├── types.ts          # TypeScript interfaces
│       ├── seed-data.ts      # 48 teams + 72 group fixtures + Poisson predictions
│       ├── models.ts         # Poisson, hybrid blending, Brier/log-loss/MAE
│       ├── store.ts          # localStorage data layer (drop-in Supabase upgrade path)
│       └── utils.ts          # Utilities: cn(), formatDate, pct, MODEL_LABELS
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql
```

## Upgrading to Supabase (V2)

The data layer is isolated in `src/lib/store.ts`. To move from localStorage to Supabase:

1. Replace `load()`/`save()` calls in `store.ts` with `createClient()` queries
2. Add auth middleware via `src/middleware.ts` using `@supabase/ssr`
3. Seed teams + fixtures via a server action or migration script
4. Adjust RLS policies in the SQL migration for viewer vs admin roles
