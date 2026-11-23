/**
 * Data-handling switches that depend on our current limitations
 * (docs/known-limitations.md).
 */

/**
 * KL-05 / policy AI-02: while the AI runs on a free key, people must only
 * send test data (the sample CV), never their real CV. Set to false when a
 * paid AI provider key is in place; the demo notices disappear everywhere.
 */
export const AI_TEST_DATA_ONLY = true

/** The fictional sample CV people can download and upload instead of their own. */
export const SAMPLE_CV_PATH = "/samples/hyperlynx-sample-cv.pdf"
