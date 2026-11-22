import type { AuthError } from "@supabase/supabase-js"

/** Plain-language messages for Supabase Auth errors (never show raw errors). */
export function authErrorMessage(error: Pick<AuthError, "code" | "status"> | null): string {
  switch (error?.code) {
    case "invalid_credentials":
      return "That email and password don't match. Check them and try again."
    case "user_already_exists":
    case "email_exists":
      return "An account with this email already exists. Log in instead."
    case "weak_password":
      return "Choose a stronger password: at least 8 characters, with letters and numbers."
    case "email_not_confirmed":
      return "Confirm your email first: open the link we sent you."
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Too many attempts. Wait a few minutes and try again."
    case "same_password":
      return "The new password must be different from the current one."
    case "signup_disabled":
      return "New sign-ups are paused right now."
    case "unexpected_failure":
      return "We couldn't create that account. If you're signing up as a recruiter, use your work email."
    default:
      return "Something went wrong. Try again in a moment."
  }
}

/** Messages for ?error= codes put on login pages by /auth routes. */
export function loginNotice(error: string | undefined, account: string | undefined) {
  switch (error) {
    case "wrong-area":
      return account === "recruiter"
        ? "That's a recruiter account, so we've brought you to the recruiter login."
        : "That's a candidate account, so we've brought you to the candidate login."
    case "callback":
      return "Sign-in didn't complete. Try again."
    case "session":
      return "Please log in to continue."
    case "expired":
      return "That link has expired. Request a new one."
    case "work-email":
      return `${WORK_EMAIL_MESSAGE} No account was created.`
    default:
      return null
  }
}

export const PASSWORD_HINT = "At least 8 characters, with letters and numbers."

export const WORK_EMAIL_MESSAGE =
  "Recruiter accounts need a work email (your company address or Google Workspace), not a personal one like Gmail or Outlook."
