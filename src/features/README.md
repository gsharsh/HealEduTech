# Feature boundaries

Each feature owns its pages, components, validation, data access, and tests. Shared visual elements live in `src/components`; Supabase setup and other cross-cutting utilities live in `src/lib`.

- `auth`: invited account access and recovery
- `learning`: reading records, interests, goals, feedback, and rewards
- `explore`: approved resources and future recommendation surfaces
- `community`: showcases, comments, reports, and withdrawal
- `admin`: catalogue, learner support, permissions, moderation, and exports

Keep privileged account and administrative operations in Supabase Edge Functions or another server-side boundary. Never place service-role credentials in Vite environment variables.
