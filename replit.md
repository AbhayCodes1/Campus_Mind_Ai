# CampusMind AI

CampusMind AI is a free, full-stack college operations dashboard that queries 500+ synthetic SQLite student records and turns them into searchable reports.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server with local SQLite seeding
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Optional env: `CAMPUSMIND_SQLITE_PATH` and `SESSION_SECRET`; the app runs without paid services or AI keys

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/campusmind-ai/src` — responsive dashboard, student search, reports, exports, role/demo access, and assistant UI
- `artifacts/api-server/src/lib/sqlite.ts` — SQLite schema, indexes, and deterministic 500-student synthetic seed
- `artifacts/api-server/src/lib/reports.ts` — parameterized report and dashboard queries plus CSV export
- `artifacts/api-server/src/routes` — health, campus, assistant, and demo-role endpoints
- `lib/api-spec/openapi.yaml` — source-of-truth API contract and generated client hooks

## Architecture decisions

- The runtime database is a local SQLite file so the free demo does not require a managed database or billing.
- The assistant is rule-based demo mode by design; it always queries SQLite and asks for a student ID when names are ambiguous.
- All student data is deterministic, fictional, and labeled as synthetic demo data.
- Demo roles are enforced on the backend with a signed HttpOnly cookie; student access is limited to the seeded demo student.

## Product

Search students, open complete academic and finance reports, inspect attendance and results, export PDF/CSV, and ask the rule-based assistant for a report in natural language.

## User preferences

- Keep the app free to run: no paid AI service, subscription, or billing requirement.

## Gotchas

- The SQLite file is created on API startup and ignored by Git.
- When API contracts change, run `pnpm --filter @workspace/api-spec run codegen`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
