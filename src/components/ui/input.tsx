import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Cyberpunk Input — terminal slot with ">" prefix, chamfered, neon focus.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <span
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-primary text-glow text-sm select-none"
        >
          {">"}
        </span>
        <input
          type={type}
          className={cn(
            "flex h-12 w-full bg-input pl-8 pr-4 py-2 text-base font-mono text-primary",
            "border border-border cyber-chamfer-sm",
            "transition-all duration-200",
            "placeholder:text-muted-foreground placeholder:italic",
            "focus-visible:outline-none focus-visible:border-primary focus-visible:shadow-[var(--glow-primary)]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
