# Database migrations

Add reviewed Supabase migrations here. Keep schema changes paired with row-level security policies and tests, and apply them in the reviewed delivery order.

Generate TypeScript database types after applying a schema:

```sh
npx supabase gen types typescript --local > src/types/database.generated.ts
```
