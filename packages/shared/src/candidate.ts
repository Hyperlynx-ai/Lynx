import { z } from "zod"

/**
 * The candidate profile from onboarding (chunk 2.3): the choices, their
 * labels, and the schema apps/api validates. Values match the check
 * constraints in supabase/migrations/*_candidates.sql.
 */

export const EXPERIENCE_LEVELS = {
  student: "Student",
  fresher: "Fresher (under 1 year)",
  junior: "1-3 years",
  mid: "3-6 years",
  senior: "6-10 years",
  lead: "10+ years",
} as const

export const EDUCATION_LEVELS = {
  high_school: "High school (Class XII)",
  diploma: "Diploma",
  bachelors: "Bachelor's degree",
  masters: "Master's degree",
  doctorate: "Doctorate (PhD)",
  other: "Other",
} as const

export const PATHWAYS = {
  internship: "An internship",
  first_job: "My first job",
  job_switch: "A new job (I'm working now)",
  higher_education: "Higher education or a scholarship",
} as const

export const VISA_STATUSES = {
  needs_sponsorship: "I'll need a work visa or sponsorship",
  has_permit: "I already have a work permit or visa there",
  citizen: "I'm a citizen or resident there",
  not_sure: "Not sure yet",
} as const

/** Countries candidates can target (ISO 3166-1 alpha-2), grouped by region. */
export const COUNTRIES = {
  AE: "United Arab Emirates",
  SA: "Saudi Arabia",
  QA: "Qatar",
  OM: "Oman",
  KW: "Kuwait",
  BH: "Bahrain",
  DE: "Germany",
  NL: "Netherlands",
  IE: "Ireland",
  GB: "United Kingdom",
  FR: "France",
  BE: "Belgium",
  LU: "Luxembourg",
  AT: "Austria",
  CH: "Switzerland",
  PL: "Poland",
  CZ: "Czechia",
  SE: "Sweden",
  FI: "Finland",
  DK: "Denmark",
  NO: "Norway",
  IT: "Italy",
  ES: "Spain",
  PT: "Portugal",
  EE: "Estonia",
  MT: "Malta",
  CY: "Cyprus",
  SG: "Singapore",
  MY: "Malaysia",
  JP: "Japan",
  AU: "Australia",
  NZ: "New Zealand",
  CA: "Canada",
  US: "United States",
  IN: "India",
} as const

type Keys<T> = [keyof T & string, ...(keyof T & string)[]]
const keys = <T extends object>(o: T) => Object.keys(o) as Keys<T>

export const ExperienceLevel = z.enum(keys(EXPERIENCE_LEVELS))
export const EducationLevel = z.enum(keys(EDUCATION_LEVELS))
export const Pathway = z.enum(keys(PATHWAYS))
export const VisaStatus = z.enum(keys(VISA_STATUSES))
export const CountryCode = z.enum(keys(COUNTRIES))

/** What the candidate fills in (step 2 of onboarding, and the profile page). */
export const CandidateProfileInput = z.object({
  targetRoles: z.array(z.string().trim().min(1).max(80)).min(1).max(5),
  countries: z.array(CountryCode).min(1).max(10),
  experienceLevel: ExperienceLevel,
  educationLevel: EducationLevel,
  pathways: z.array(Pathway).min(1).max(4),
  visaStatus: VisaStatus,
  currentLocation: z.string().trim().max(120).nullable(),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{7,20}$/, "Use digits, spaces and an optional + country code")
    .nullable(),
  phoneIsWhatsapp: z.boolean(),
})
export type CandidateProfileInput = z.infer<typeof CandidateProfileInput>

/** What the candidate agrees to (step 3). Every choice is opt-in. */
export const CandidateConsentsInput = z.object({
  /** Approved recruiters can find and view the profile. */
  visibleToRecruiters: z.boolean(),
  /** ...including email and phone (only meaningful when visible). */
  showContactToRecruiters: z.boolean(),
  /** Matching jobs by email every 2 days. */
  jobAlerts: z.boolean(),
  /** The weekly newsletter. */
  newsletter: z.boolean(),
})
export type CandidateConsentsInput = z.infer<typeof CandidateConsentsInput>

/** Wording version recorded with each consent (bump when the texts change). */
export const CONSENT_TEXT_VERSION = "2026-11-23"

/** The education level a CV's degrees suggest, or null. */
export function educationLevelFromDegrees(degrees: (string | null)[]): EducationLevelKey | null {
  const text = degrees.filter(Boolean).join(" | ").toLowerCase()
  if (!text) return null
  if (/\b(ph\.?\s?d|doctorate|doctor of)\b/.test(text)) return "doctorate"
  if (/\b(m\.?\s?(tech|sc|e|s|a|com|ba|pharm)|mba|master|msc|meng|ma)\b/.test(text)) {
    return "masters"
  }
  if (
    /\b(b\.?\s?(tech|sc|e|s|a|com|ba|ca|pharm|arch)|bachelor|bsc|beng|ba|mbbs|llb)\b/.test(text)
  ) {
    return "bachelors"
  }
  if (/\bdiploma\b/.test(text)) return "diploma"
  if (/\b(hsc|class xii|12th|higher secondary|a.levels?)\b/.test(text)) return "high_school"
  return null
}

export type EducationLevelKey = keyof typeof EDUCATION_LEVELS
