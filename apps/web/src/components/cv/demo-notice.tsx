import { SAMPLE_CV_PATH } from "@lynx/shared/policy"
import { Notice } from "@lynx/ui/components/notice"

/** KL-05: asks people to upload the fictional sample CV instead of their own. */
export function DemoNotice() {
  return (
    <Notice title="Demo: please use the sample CV, not your own.">
      Hyperlynx is in its demo phase and its AI provider may keep what it&apos;s sent, so don&apos;t
      upload your real CV yet.{" "}
      <a
        href={SAMPLE_CV_PATH}
        download
        className="text-text-primary underline underline-offset-4 transition-colors duration-200 ease-standard hover:text-text-secondary"
      >
        Download the sample CV
      </a>{" "}
      (a fictional candidate) and upload that instead.
    </Notice>
  )
}
