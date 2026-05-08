import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

/**
 * Neo-brutalist Textarea — bordered paper buffer with yellow focus state.
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[112px] w-full rounded-none bg-card px-4 py-3 text-base font-bold text-foreground",
        "border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))]",
        "transition-all duration-100 ease-linear",
        "placeholder:text-foreground/40 placeholder:font-bold",
        "focus-visible:outline-none focus-visible:ring-0 focus-visible:bg-[hsl(var(--secondary))] focus-visible:shadow-[6px_6px_0_0_hsl(var(--foreground))]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
