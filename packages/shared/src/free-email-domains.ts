/**
 * Free/personal email providers. Recruiters must sign up with a work email,
 * so these domains are refused for recruiter accounts.
 *
 * KEEP IN SYNC with the `free_email_domains` seed in supabase/migrations
 * (a test fails if they differ). The database is what enforces the rule;
 * this list gives the sign-up form a friendly message first.
 */
export const FREE_EMAIL_DOMAINS = [
  "aol.com",
  "gmail.com",
  "gmx.com",
  "gmx.de",
  "gmx.net",
  "googlemail.com",
  "hey.com",
  "hotmail.co.uk",
  "hotmail.com",
  "hotmail.fr",
  "icloud.com",
  "live.com",
  "mac.com",
  "mail.com",
  "mail.ru",
  "me.com",
  "msn.com",
  "outlook.com",
  "outlook.in",
  "pm.me",
  "proton.me",
  "protonmail.com",
  "qq.com",
  "rediffmail.com",
  "tutanota.com",
  "web.de",
  "yahoo.co.in",
  "yahoo.co.uk",
  "yahoo.com",
  "yahoo.in",
  "yandex.com",
  "yandex.ru",
  "zohomail.com",
] as const

/** The part after "@", lower-cased, or "" when there is none. */
export function emailDomain(email: string): string {
  const at = email.lastIndexOf("@")
  return at === -1
    ? ""
    : email
        .slice(at + 1)
        .trim()
        .toLowerCase()
}

export function isFreeEmailDomain(email: string): boolean {
  return (FREE_EMAIL_DOMAINS as readonly string[]).includes(emailDomain(email))
}
