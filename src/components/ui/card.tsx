import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * FRANK MILLER NEWSPRINT BRUTALISM — Card.
 * A dossier. Hard corners, visible borders, ink-slab shadow.
 * Top hairline of bone — turns gold on hover. No floating, no rounding.
 */
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative bg-[hsl(var(--card))] text-foreground rounded-none",
        "border border-[hsl(var(--border))] border-t-[3px] border-t-[hsl(var(--bone))]",
        "shadow-[6px_6px_0_0_hsl(0_0%_0%)]",
        "transition-[transform,box-shadow,border-color] duration-200 ease-[cubic-bezier(0.2,0,0.1,1)]",
        "hover:-translate-x-[2px] hover:-translate-y-[2px]",
        "hover:shadow-[10px_10px_0_0_hsl(0_0%_0%)]",
        "hover:border-t-[hsl(var(--dirty-gold))]",
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
        "flex flex-col space-y-1.5 p-5 pb-4 border-b border-[hsl(var(--border))]",
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
        "font-headline text-2xl lg:text-3xl uppercase tracking-wide text-[hsl(var(--bone))] leading-[0.92]",
        "[text-shadow:2px_2px_0_hsl(0_0%_0%)]",
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
      className={cn("text-sm font-editorial italic text-[hsl(var(--paper))] leading-snug", className)}
      {...props}
    />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-5", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-5 pt-0 border-t border-[hsl(var(--border))]", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
