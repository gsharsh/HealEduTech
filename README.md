# EVG Learning Platform

Bilingual reading, exploration, and peer-learning platform for EVG Vietnam. The product direction and delivery phases are defined in [PLAN.md](./PLAN.md).

## Current scaffold

The repository contains a runnable React and TypeScript foundation with:

- Vite development and production builds
- English-first interface with an in-place Vietnamese switch
- learner routes for My Learning, Explore, and Community
- a bilingual staff workspace route
- Supabase client and local-development configuration
- feature boundaries for accounts, learning, exploration, community, and administration
- Cloudflare Pages single-page-app routing

The visible cards are workflow placeholders. Authentication, database tables, row-level security, and feature persistence are intentionally deferred to their planned implementation phases.

## Local setup

Requirements: a current Node.js LTS release and npm.

```sh
npm install
cp .env.example .env.local
npm run dev
```

The app can run without Supabase credentials while developing the interface. Add a project URL and public anonymous key to `.env.local` when the Phase 2 backend is ready. Never place a Supabase service-role key in a Vite environment variable.

## Commands

```sh
npm run dev       # start the local Vite server
npm run lint      # check TypeScript and React source
npm run build     # type-check and build for production
npm run preview   # preview the production build
```

## Project structure

```text
src/
  app/            application routes
  components/     shared layout and interface components
  features/       feature-owned pages, data access, validation, and tests
  i18n/           Vietnamese and English interface copy
  lib/            environment and Supabase setup
  styles/         shared application styles
  types/          shared domain types and future generated database types
supabase/
  functions/      server-only privileged operations
  migrations/     reviewed database schema and row-level security changes
```

For Cloudflare Pages, use `npm run build` and publish the `dist` directory. The included `_redirects` file preserves client-side routes.
