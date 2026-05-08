import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Maximalism Card — semi-transparent muted bg, clashing accent border,
 * stacked colored shadows. Slight tilt + lift on hover.
 */
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative bg-[hsl(var(--muted-bg)/0.6)] text-foreground rounded-3xl backdrop-blur-sm",
        "border-4 border-[hsl(var(--max-1))]",
        "shadow-[8px_8px_0_hsl(var(--max-3)),16px_16px_0_hsl(var(--max-2))]",
        "transition-all duration-300 ease-out",
        "hover:-rotate-1 hover:scale-[1.02]",
        "hover:shadow-[10px_10px_0_hsl(var(--max-3)),20px_20px_0_hsl(var(--max-2)),30px_30px_0_hsl(var(--max-5))]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col space-y-1.5 p-6 pb-4 border-b-4 border-dashed border-[hsl(var(--max-3))]",
        className,
      )}
      {...props}
    />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "font-heading text-2xl lg:text-3xl uppercase tracking-tight text-foreground leading-none",
        "[text-shadow:2px_2px_0_hsl(var(--max-5)),4px_4px_0_hsl(var(--max-1))]",
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
      className={cn("text-base font-body text-white/80 leading-relaxed", className)}
      {...props}
    />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
