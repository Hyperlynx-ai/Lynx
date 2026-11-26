import { cn } from "@lynx/ui/lib/utils"

/** The admin console's on/off switch (mint when on). */
export function Switch(props: {
  checked: boolean
  label: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.checked}
      aria-label={props.label}
      disabled={props.disabled}
      onClick={props.onClick}
      className={cn(
        "flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-pill border px-0.5 transition-colors duration-200 ease-standard disabled:opacity-50",
        props.checked ? "justify-end border-accent" : "justify-start border-border"
      )}
    >
      <span
        aria-hidden="true"
        className={cn("size-4 rounded-pill", props.checked ? "bg-accent" : "bg-text-secondary")}
      />
    </button>
  )
}
