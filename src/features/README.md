# Feature boundaries

Each feature owns its pages, components, validation, data access, and tests. Shared visual elements live in `src/components`; Supabase setup and other cross-cutting utilities live in `src/lib`.

- `auth`: invited account access and recovery
- `library`: catalogue browsing, book details and own-loan preview
- `learning`: reading records, interests, goals, feedback, and rewards
- `explore`: approved resources and future recommendation surfaces
- `community`: showcases, comments, reports, and withdrawal
- `admin`: catalogue, learner support, permissions, moderation, and exports

Keep privileged account and administrative operations in Supabase Edge Functions or another server-side boundary. Never place service-role credentials in Vite environment variables.

The current frontend uses fictional catalogue data and in-memory state in `src/demo`. This is a prototype boundary, not a persistence or authorisation layer. Community publication and account entry remain placeholders.
