import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Neumorphism Card — soft pillow molded from the page surface.
 * Hyper-rounded. Dual shadows. Lifts on hover.
 */
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))]",
        "rounded-[1.75rem] border-0",
        // gold hairline edge + ink shadow + faint blood undercurrent
        "shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.25),inset_0_1px_0_hsl(var(--primary)/0.35),0_18px_40px_-12px_hsl(354_80%_8%/0.85),0_1px_0_hsl(354_72%_36%/0.25)]",
        "transition-[transform,box-shadow] duration-300 ease-out",
        "hover:-translate-y-[2px] hover:shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.45),inset_0_1px_0_hsl(var(--primary)/0.55),0_24px_48px_-12px_hsl(354_80%_6%/0.9),0_2px_0_hsl(354_72%_36%/0.4)]",
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
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "font-display text-2xl lg:text-3xl tracking-tight text-[hsl(var(--foreground))] leading-tight font-bold",
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
      className={cn("text-sm text-[hsl(var(--muted-foreground))] leading-relaxed", className)}
      {...props}
    />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
