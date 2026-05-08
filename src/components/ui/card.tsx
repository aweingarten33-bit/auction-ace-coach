import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Cyberpunk Card — chamfered tech panel with corner accents + neon hover glow.
 */
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative bg-card text-card-foreground cyber-chamfer",
        "border border-border",
        "transition-all duration-300 ease-mech",
        "hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-[var(--glow-primary-sm)]",
        className,
      )}
      {...props}
    >
      {/* HUD corner accents */}
      <span className="pointer-events-none absolute left-0 top-0 h-3 w-3 border-l border-t border-primary/70" />
      <span className="pointer-events-none absolute right-0 top-0 h-3 w-3 border-r border-t border-primary/70" />
      <span className="pointer-events-none absolute left-0 bottom-0 h-3 w-3 border-l border-b border-primary/70" />
      <span className="pointer-events-none absolute right-0 bottom-0 h-3 w-3 border-r border-b border-primary/70" />
      {children}
    </div>
  ),
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6 pb-3", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "font-display text-xl font-bold tracking-[0.12em] uppercase text-primary text-glow",
        className,
      )}
      {...props}
    />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-muted-foreground leading-relaxed font-mono", className)}
      {...props}
    />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-3", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
