import { z } from "zod"

/**
 * Jobs and the opportunities feed (chunks 3.1 and 3.8): fields of work,
 * job types and feed views, with their labels. Values match the check
 * constraints in supabase/migrations/*_jobs.sql.
 */

export const FIELDS_OF_WORK = {
  software: "Software",
  data_ai: "Data and AI",
  cybersecurity: "Cybersecurity",
  cloud_devops: "Cloud and DevOps",
  product_project: "Product and projects",
  design: "Design",
  marketing: "Marketing",
  sales: "Sales",
  finance: "Finance",
  hr: "HR",
  operations: "Operations",
  core_engineering: "Engineering",
  healthcare: "Healthcare",
  customer_support: "Customer support",
  hospitality: "Hospitality",
  education: "Education",
  other: "Other",
} as const

export const JOB_TYPES = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
  scholarship: "Scholarship",
  fellowship: "Fellowship",
  temporary: "Temporary",
} as const

/** Feed tabs: internships, scholarships (and fellowships), and everything else. */
export const FEED_VIEWS = {
  jobs: "Jobs",
  internships: "Internships",
  scholarships: "Scholarships",
} as const

export const MATCH_LABELS = {
  strong: "Strong match",
  good: "Good match",
  partial: "Partial match",
} as const

const keys = <T extends Record<string, string>>(o: T) =>
  Object.keys(o) as [keyof T & string, ...(keyof T & string)[]]

export const FieldOfWork = z.enum(keys(FIELDS_OF_WORK))
export const JobType = z.enum(keys(JOB_TYPES))
export const FeedView = z.enum(keys(FEED_VIEWS))
export const MatchLabel = z.enum(keys(MATCH_LABELS))
export const SaveState = z.enum(["saved", "hidden"])
