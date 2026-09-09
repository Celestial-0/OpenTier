import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import { Loading03Icon } from "@hugeicons/core-free-icons"

function Spinner({ className, strokeWidth, ...props }: React.ComponentProps<"svg">) {
  const numericStrokeWidth = typeof strokeWidth === "number" ? strokeWidth : (strokeWidth ? Number(strokeWidth) : 2);
  return (
    <HugeiconsIcon icon={Loading03Icon} strokeWidth={numericStrokeWidth} data-slot="spinner" role="status" aria-label="Loading" className={cn("size-4 animate-spin", className)} {...props} />
  )
}

export { Spinner }
