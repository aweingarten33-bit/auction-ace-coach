import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Maximalism Input — pill-shaped, neon border, glow on focus.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-14 w-full rounded-full bg-[hsl(var(--muted-bg)/0.55)] backdrop-blur-sm",
          "px-6 py-3 text-base font-body font-bold text-white",
          "border-4 border-[hsl(var(--max-1))]",
          "transition-all duration-300 ease-out",
          "placeholder:text-white/45 placeholder:font-medium",
          "focus-visible:outline-none focus-visible:ring-0",
          "focus-visible:border-[hsl(var(--max-3))] focus-visible:bg-[hsl(var(--muted-bg)/0.85)]",
          "focus-visible:shadow-[0_0_24px_hsl(var(--max-3)/0.6),0_0_0_4px_hsl(var(--max-1)/0.4)]",
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
