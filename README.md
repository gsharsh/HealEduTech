# EVG Learn & Grow

Bilingual library and reading website for EVG Vietnam. Learners can browse books, track their own reading, and explore activities. Staff can manage the catalogue, circulation, and student accounts.

## Current experience

- **Home:** library picks first, followed by reading topics.
- **Library:** searchable catalogue, book details, availability, and personal loans.
- **My reading:** private reading status, notes, and interests.
- **Explore:** current activities, learning resources, and book suggestions. More features are in development.
- **Library desk:** catalogue management, loans and returns, overdue follow-up, student records, and staff access.
- **Accounts:** every new EVG account is added as an eligible learner and borrower. An administrator can remove or restore borrowing eligibility from the Students page; account and loan history remain intact.

Together and community training are paused and are not linked from the site. Their routes redirect to the active library experience.

## Run locally

Requirements: Node.js LTS and npm.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

The interface can run in demo mode without backend credentials. For the live backend, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local`. Never put a Supabase service-role or secret key in a `VITE_` variable.

## Checks

```sh
npm run lint
npm test
npm run build
npm run test:browser
npm run test:db
```

The database suite creates a temporary local PostgreSQL cluster and uses synthetic data. It never writes to the hosted project.

## Production deployment

The site is built with `npm run build` and publishes the `dist` directory. Vercel project configuration is in `vercel.json`. Configure the production build with the intended live Supabase project and `VITE_SITE_URL`; the production release checks are in [`docs/PRODUCTION_RELEASE_2026-11-01.md`](docs/PRODUCTION_RELEASE_2026-11-01.md).

Database changes live in [`supabase/migrations`](supabase/migrations). Review and apply each migration through the release process before deploying code that depends on it. Export the hosted migration list and use `npm run check:release -- --url https://your-site.example --hosted-migrations /path/to/hosted-migrations.txt` to check a deployment.

## Project references

- [`PLAN.md`](PLAN.md): requirements and roadmap.
- [`docs/SUPABASE_PILOT.md`](docs/SUPABASE_PILOT.md): backend setup and access boundaries.
- [`docs/EVG_HANDOVER.md`](docs/EVG_HANDOVER.md): operating ownership and handover.
- [`docs/FREE_ENCRYPTED_BACKUPS.md`](docs/FREE_ENCRYPTED_BACKUPS.md): backup and recovery procedure.
- [`docs/uml`](docs/uml): domain and workflow diagrams.
