import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Neumorphism Input — pressed well in the page surface.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-2xl bg-[hsl(var(--input))]",
          "px-5 py-2 text-sm text-[hsl(var(--foreground))]",
          "border-0 shadow-[var(--neu-inset)]",
          "transition-[box-shadow] duration-300 ease-out",
          "placeholder:text-[hsl(var(--muted-foreground))]",
          "focus-visible:outline-none focus-visible:shadow-[var(--neu-inset-deep)]",
          "focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]",
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
