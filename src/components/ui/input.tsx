import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Industrial Input — recessed data slot. JetBrains Mono. LED-glow on focus.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-lg bg-background px-4 py-2 text-base font-mono text-foreground",
          "border-0 shadow-[var(--shadow-recessed)]",
          "transition-shadow duration-200",
          "placeholder:text-muted-foreground/60",
          "focus-visible:outline-none focus-visible:shadow-[var(--shadow-recessed),0_0_0_2px_hsl(var(--primary)),var(--shadow-glow)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
