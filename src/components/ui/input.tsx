import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * FRANK MILLER NEWSPRINT BRUTALISM — Input.
 * Terminal field. Mono type, sharp corners, hairline border, gold focus rule.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-none bg-[hsl(var(--input))]",
          "px-4 py-2 text-sm font-mono tracking-wide text-[hsl(var(--bone))]",
          "border border-[hsl(var(--border))] border-b-2 border-b-[hsl(var(--bone)/0.45)]",
          "transition-[border-color,box-shadow] duration-150 ease-[cubic-bezier(0.2,0,0.1,1)]",
          "placeholder:text-[hsl(var(--muted-foreground))] placeholder:uppercase placeholder:tracking-widest placeholder:text-xs",
          "focus-visible:outline-none focus-visible:border-[hsl(var(--bone))] focus-visible:border-b-[hsl(var(--dirty-gold))]",
          "focus-visible:shadow-[inset_0_-3px_0_hsl(var(--dirty-gold)/0.55)]",
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
