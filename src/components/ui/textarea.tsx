import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

/**
 * Newsprint Textarea — bordered editorial form field with monospace text.
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[112px] w-full rounded-none bg-transparent px-3 py-3 text-sm font-mono text-foreground",
        "border border-foreground",
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
});
Textarea.displayName = "Textarea";

export { Textarea };
