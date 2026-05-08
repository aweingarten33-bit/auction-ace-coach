import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[96px] w-full rounded-lg bg-background px-4 py-3 text-base font-mono text-foreground",
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
});
Textarea.displayName = "Textarea";

export { Textarea };
