# Database migrations

Add reviewed Supabase migrations here. Keep schema changes paired with row-level security policies and tests, and apply them in the reviewed delivery order.

The four previously pending migrations were applied to the hosted project on 1 November 2026. Their files now use the exact versions recorded by Supabase; the SQL content is preserved. The live migration history was left intact. Older release notes use the original labels below.

| Original label | Recorded version | Migration |
| --- | --- | --- |
| 20260927090000 | 20261101084931 | set_book_copy_count |
| 20261002130000 | 20261101085035 | serialize_interest_and_loan_corrections |
| 20261021090000 | 20261101085040 | secure_book_availability |
| 20261026090000 | 20261101085047 | staff_oversight |

The additional foreign-key indexing migration is recorded as `20261101085553_index_operational_foreign_keys.sql`. These updates changed definitions/indexes and did not enable lending. Always compare the actual migration history with the current source filenames before a future release.

Generate TypeScript database types after applying a schema:

```sh
npx supabase gen types typescript --local > src/types/database.generated.ts
```
