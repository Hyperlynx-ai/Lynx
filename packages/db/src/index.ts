import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import * as relations from "./generated/relations"
import * as schema from "./generated/schema"

export { schema }

/**
 * Database client for server code (apps/api). Never import this in the browser.
 * Use Supabase's transaction pooler URL in serverless environments; prepared
 * statements are disabled because the pooler does not support them.
 */
export function createDb(databaseUrl: string) {
  const client = postgres(databaseUrl, { prepare: false, max: 1 })
  return drizzle(client, { schema: { ...schema, ...relations } })
}

export type Db = ReturnType<typeof createDb>
