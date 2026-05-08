import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-none border-2 px-2 py-0.5 text-xs font-stencil uppercase tracking-widest transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default: "border-black bg-primary text-primary-foreground",
        secondary: "border-black bg-secondary text-secondary-foreground",
        destructive: "border-black bg-destructive text-destructive-foreground",
        outline: "border-foreground text-foreground bg-transparent",
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
