# Project Standards

## Architecture
- Supabase access goes through one shared client/query layer — no ad-hoc calls in components.
- Default to Server Components; 'use client' only when interactivity requires it.
- Never expose the service-role key client-side. The public anon key is fine client-side.

## Code
- Components < 150 lines; extract only at 3+ reuse.
- No dead code, no unused deps, no narration comments.
- Every data view: loading / empty / error.

## Design
- One spacing scale, one type scale, tokens only — no inline hex.
- WCAG AA. Mobile-first. Refine the existing aesthetic, don't reinvent per feature.

## Database & Migration Safety
- This is a personal pet project. Optimize for iteration speed, not enterprise hardening.
- All schema/DB changes go through version-controlled migration files (SQL in the repo),
  committed to git. Do NOT make schema changes directly in the Supabase dashboard —
  dashboard changes are not revertible via git.
- One migration = one logical change, with a clear filename and comment.
-
