@AGENTS.md

## Commands

```bash
npm run dev      # start dev server
npm run build    # production build
npm run lint     # eslint
```

## Architecture

- `app/`. Next.js App Router pages and API routes (`app/api/**`).
- `actions/`. Server actions (`"use server"`) — the main way client code mutates data (tickets, staff, auth).
- `models/`. Mongoose schemas (no migration system; schemas are the source of truth).
- `lib/`. Shared server utilities: `auth.ts`/`auth.config.ts` (NextAuth v5), `departmentAuth.ts`, `mongodb.ts`, `email.ts`, `ratelimits.ts`, `idempotency.ts`.
