# Feature boundaries

Each feature owns its pages, components, validation, data access, and tests. Shared visual elements live in `src/components`; Supabase setup and other cross-cutting utilities live in `src/lib`.

- `auth`: invited account access and recovery
- `library`: public catalogue, availability and reading actions
- `circulation`: policy-gated staff lending, resolution audit, and own-loan views
- `learning`: private persisted reading records and interests; goals, feedback and rewards remain deferred
- `explore`: approved resources and future recommendation surfaces
- `community`: showcases, comments, reports, and withdrawal
- `admin`: catalogue, learner support, permissions, moderation, and exports

Keep privileged account and administrative operations in Supabase Edge Functions or another server-side boundary. Never place service-role credentials in Vite environment variables.

Without Supabase configuration, fictional catalogue data and in-memory state in `src/demo` provide a prototype only. Configured routes use Supabase Auth, real catalogue data, and private reading/interests. Circulation requires its migration and an explicitly enabled policy. Community publication remains a placeholder. See docs/SUPABASE_PILOT.md for hosted setup and release gates.
