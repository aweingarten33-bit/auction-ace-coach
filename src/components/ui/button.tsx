import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Industrial Button — physical key. Press translates Y + inverts shadow.
 */
const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-display font-bold uppercase tracking-[0.05em]",
    "rounded-lg",
    "transition-all duration-150 ease-mech",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    "active:translate-y-[2px]",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[var(--shadow-primary)] hover:brightness-110 active:shadow-[var(--shadow-pressed)]",
        secondary:
          "bg-background text-foreground shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-floating)] active:shadow-[var(--shadow-pressed)]",
        outline:
          "bg-background text-foreground shadow-[var(--shadow-card)] hover:text-primary hover:shadow-[var(--shadow-floating)] active:shadow-[var(--shadow-pressed)]",
        destructive:
          "bg-primary text-primary-foreground shadow-[var(--shadow-primary)] hover:brightness-110 active:shadow-[var(--shadow-pressed)]",
        ghost:
          "bg-transparent text-muted-foreground hover:bg-background hover:text-foreground hover:shadow-[var(--shadow-recessed)] active:shadow-[var(--shadow-pressed)]",
        link:
          "bg-transparent text-primary underline-offset-4 hover:underline active:translate-y-0",
      },
      size: {
        default: "h-12 px-6 text-sm",
        sm:      "h-10 px-4 text-xs rounded-md",
        lg:      "h-14 px-8 text-base rounded-xl",
        icon:    "h-12 w-12 rounded-lg",
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
