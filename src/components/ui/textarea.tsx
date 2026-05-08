import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

/**
 * Cyberpunk Textarea — terminal multiline buffer with neon focus glow.
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[96px] w-full bg-input px-4 py-3 text-base font-mono text-primary",
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
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
