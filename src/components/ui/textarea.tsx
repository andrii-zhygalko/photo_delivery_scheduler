import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-muted-foreground bg-muted/30 dark:bg-input/40 flex field-sizing-content min-h-16 w-full rounded-md border px-3 py-2 text-base shadow-sm transition-all outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-purple-400 dark:focus-visible:border-purple-500 focus-visible:ring-purple-400/20 dark:focus-visible:ring-purple-500/20 focus-visible:ring-[3px] focus-visible:bg-white dark:focus-visible:bg-input/60 focus-visible:shadow-md",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
