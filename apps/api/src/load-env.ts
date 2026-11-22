/**
 * Loads apps/api/.env.local for local development. Deployed environments get
 * their variables from Vercel, so a missing file is fine.
 * Must be the first import of the entry file.
 */
try {
  process.loadEnvFile(".env.local")
} catch {
  // no .env.local: use the real environment
}
