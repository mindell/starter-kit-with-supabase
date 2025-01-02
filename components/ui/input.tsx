import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, "aria-label": ariaLabel, id, ...props }, ref) => {
    // Ensure we have either an aria-label or associated label via id
    if (!ariaLabel && !id) {
      console.warn("Input component should have either an aria-label or id for accessibility")
    }

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-red-500",
          className
        )}
        aria-invalid={error ? "true" : undefined}
        ref={ref}
        id={id}
        aria-label={ariaLabel}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
