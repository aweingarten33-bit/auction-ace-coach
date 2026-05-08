import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Banksy Input — flat dark slate, courier type, red spray on focus.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-none border-2 border-foreground/60 bg-[hsl(var(--surface-2))] px-3 py-2",
          "font-mono-rough text-base text-foreground",
          "shadow-[3px_3px_0_rgba(0,0,0,0.9)]",
          "placeholder:text-muted-foreground",
          "transition-[border-color,box-shadow] duration-100",
          "focus-visible:outline-none focus-visible:border-primary",
          "focus-visible:shadow-[3px_3px_0_rgba(0,0,0,0.9),0_0_0_2px_hsl(var(--primary)),0_0_14px_rgba(227,6,19,0.55)]",
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
