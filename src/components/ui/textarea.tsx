import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

/**
 * Neumorphic Textarea — carved well, deepens on focus.
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[96px] w-full rounded-2xl bg-background px-5 py-3 text-base text-foreground",
        "shadow-[var(--shadow-inset)]",
        "transition-shadow duration-300 ease-out",
        "placeholder:text-muted-foreground/70",
        "focus-visible:outline-none focus-visible:shadow-[var(--shadow-inset-deep)]",
        "focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
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
