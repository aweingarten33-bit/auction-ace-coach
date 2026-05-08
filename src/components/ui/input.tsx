import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Newsprint Input — bottom-bordered form slot. Monospace text. Sharp corners.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-none bg-transparent px-3 py-2 text-sm font-mono text-foreground",
          "border-0 border-b-2 border-foreground",
          "transition-colors duration-150 ease-out",
          "placeholder:text-foreground/45 placeholder:italic placeholder:font-body",
          "focus-visible:outline-none focus-visible:ring-0 focus-visible:bg-[hsl(50_8%_94%)]",
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
