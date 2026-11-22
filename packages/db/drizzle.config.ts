import { defineConfig } from "drizzle-kit"

/**
 * Drizzle only READS the schema here (`pnpm db:pull`). Migrations are SQL files
 * in supabase/migrations, managed by the Supabase CLI (policy DB-01).
 * Defaults to the local Supabase database started by `pnpm supabase start`.
 */
export default defineConfig({
  dialect: "postgresql",
  schemaFilter: ["public"],
  out: "./src/generated",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  },
})
