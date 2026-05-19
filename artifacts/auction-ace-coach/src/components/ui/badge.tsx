import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Neumorphic Badge — small inset pill, "carved" into the surface.
 * Variants tint the inset shadow + text color, never use hard borders.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-display font-semibold tracking-tight transition-shadow duration-300",
  {
    variants: {
      variant: {
        default:     "bg-background text-foreground shadow-[var(--neu-inset-sm)]",
        secondary:   "bg-background text-muted-foreground shadow-[var(--neu-inset-sm)]",
        outline:     "bg-background text-foreground shadow-[var(--neu-extruded-sm)]",
        destructive: "bg-background text-destructive shadow-[var(--neu-inset-sm)]",
        success:     "bg-background text-accent shadow-[var(--neu-inset-sm)]",
        primary:     "bg-background text-primary shadow-[var(--neu-inset-sm)]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
