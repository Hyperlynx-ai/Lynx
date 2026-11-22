import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose"

/** Who is calling, taken from a verified Supabase login token. */
export type TokenUser = { id: string; email: string | null }

export type VerifyToken = (token: string) => Promise<TokenUser>

/**
 * Verifies Supabase access tokens locally against the project's public keys
 * (ES256, fetched once from the JWKS endpoint and cached), so no network call
 * to Supabase is needed per request.
 */
export function createTokenVerifier(supabaseUrl: string, keys?: JWTVerifyGetKey): VerifyToken {
  const base = supabaseUrl.replace(/\/+$/, "")
  const getKey = keys ?? createRemoteJWKSet(new URL(`${base}/auth/v1/.well-known/jwks.json`))
  return async (token) => {
    const { payload } = await jwtVerify(token, getKey, {
      issuer: `${base}/auth/v1`,
      audience: "authenticated",
    })
    if (typeof payload.sub !== "string") throw new Error("token has no subject")
    return { id: payload.sub, email: typeof payload.email === "string" ? payload.email : null }
  }
}
