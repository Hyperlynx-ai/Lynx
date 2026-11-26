/** Applicant tracking systems with a company-board source (chunk 3.5). */
export const ATS_LABELS: Record<string, string> = {
  greenhouse: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
  smartrecruiters: "SmartRecruiters",
  recruitee: "Recruitee",
}

/** The company's public careers page on its ATS. */
export function careersUrl(ats: string, slug: string): string {
  const s = encodeURIComponent(slug)
  switch (ats) {
    case "greenhouse":
      return `https://job-boards.greenhouse.io/${s}`
    case "lever":
      return `https://jobs.lever.co/${s}`
    case "ashby":
      return `https://jobs.ashbyhq.com/${s}`
    case "smartrecruiters":
      return `https://careers.smartrecruiters.com/${s}`
    case "recruitee":
      return `https://${s}.recruitee.com`
    default:
      return "#"
  }
}
