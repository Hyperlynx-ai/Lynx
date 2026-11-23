import { cn } from "@lynx/ui/lib/utils"

const STEPS = ["Your CV", "What you're looking for", "Privacy and emails"]

/** Ruled, numbered step rail for onboarding (mono numbers, mint for the current step). */
export function OnboardingSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="grid grid-cols-3" aria-label="Onboarding steps">
      {STEPS.map((label, i) => {
        const step = i + 1
        const state = step === current ? "current" : step < current ? "done" : "todo"
        return (
          <li
            key={label}
            aria-current={state === "current" ? "step" : undefined}
            className={cn(
              "flex flex-col gap-1 pt-3 pr-3",
              state === "current" ? "border-t-2 border-accent" : "border-t border-border"
            )}
          >
            <span
              className={cn(
                "font-mono text-mono",
                state === "todo" ? "text-text-secondary" : "text-text-primary"
              )}
            >
              {String(step).padStart(2, "0")} / 03{state === "done" ? " ✓" : ""}
            </span>
            <span
              className={cn(
                "hidden text-label sm:block",
                state === "current" ? "text-text-primary" : "text-text-secondary"
              )}
            >
              {label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
