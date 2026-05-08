import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Cyberpunk Button — chamfered neon panel. Hover fills with neon + glow.
 */
const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-mono uppercase tracking-[0.18em] font-semibold",
    "cyber-chamfer-sm",
    "transition-all duration-150 ease-mech",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:stroke-[1.5]",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-transparent text-primary border-2 border-primary hover:bg-primary hover:text-primary-foreground hover:shadow-[var(--glow-primary)] active:shadow-[var(--shadow-pressed)]",
        secondary:
          "bg-transparent text-accent border-2 border-accent hover:bg-accent hover:text-accent-foreground hover:shadow-[var(--glow-accent)]",
        outline:
          "bg-transparent text-foreground border border-border hover:border-primary hover:text-primary hover:shadow-[var(--glow-primary-sm)]",
        destructive:
          "bg-destructive text-destructive-foreground border-2 border-destructive hover:brightness-110 hover:shadow-[0_0_18px_hsl(var(--destructive)/0.6)]",
        ghost:
          "bg-transparent text-muted-foreground hover:text-primary hover:bg-primary/10",
        link:
          "bg-transparent text-primary underline-offset-4 hover:underline hover:text-glow",
      },
      size: {
        default: "h-12 px-6 text-xs",
        sm:      "h-10 px-4 text-[11px]",
        lg:      "h-14 px-8 text-sm",
        icon:    "h-12 w-12",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
