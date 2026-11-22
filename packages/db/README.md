# @lynx/db

TypeScript access to the Supabase Postgres database for server code
(`apps/api`). **The schema is not defined here**: it lives in SQL migrations in
`supabase/migrations/` (policy DB-01). This package only mirrors it.

After adding a migration and applying it locally:

```
pnpm supabase db reset     # rebuild the local database from all migrations
pnpm db:pull               # regenerate src/generated/ from it
```

Commit the regenerated files in the same PR (policy DB-07). Never edit
`src/generated/` by hand.

```ts
import { createDb, schema } from "@lynx/db"

const db = createDb(process.env.DATABASE_URL!)
const rows = await db.select().from(schema.profiles)
```
