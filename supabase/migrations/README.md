# Database migrations

Add reviewed Supabase migrations here. The initial schema should be introduced with row-level security policies and tests as part of Phase 2; an empty migration is intentionally not included in the scaffold.

Generate TypeScript database types after applying a schema:

```sh
npx supabase gen types typescript --local > src/types/database.generated.ts
```
