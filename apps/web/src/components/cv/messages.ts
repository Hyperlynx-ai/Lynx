/** What candidates see for each CV error code from the API. */
export const CV_ERRORS: Record<string, string> = {
  invalid_file: "That file can't be used. Upload a PDF or Word (.docx) file.",
  file_not_found: "The upload didn't finish. Please try again.",
  not_a_cv: "This doesn't look like a CV. Upload your CV or résumé.",
  daily_limit:
    "You've reached today's limit for CV reading. Your file is saved: try again tomorrow.",
  parse_failed: "Lynx couldn't read this file just now. Try again in a minute.",
  already_registered: "This file is already uploaded.",
  already_parsed: "Lynx has already read this CV.",
  already_parsing: "Lynx is still reading this CV.",
  not_found: "This CV no longer exists.",
  too_large: "This file is over 10 MB. Upload a smaller file.",
  wrong_type: "Upload a PDF or Word (.docx) file. Older .doc files aren't supported.",
  upload_failed: "The upload failed. Check your connection and try again.",
}

export function cvErrorMessage(code: string | undefined): string {
  return (code && CV_ERRORS[code]) || "Something went wrong. Please try again."
}
