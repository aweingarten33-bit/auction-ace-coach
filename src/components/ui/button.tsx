import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Banksy Button — sharp stencil, hard offset shadow, vibration on press.
 */
const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-display tracking-[0.08em] uppercase",
    "border-2 border-foreground rounded-none",
    "bg-background text-foreground",
    "shadow-[var(--shadow-stencil)]",
    "transition-[transform,box-shadow,background-color,color] duration-100",
    "hover:-translate-y-px hover:shadow-[var(--shadow-stencil-lg)]",
    "active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_rgba(0,0,0,0.95)]",
    "focus-visible:outline-none focus-visible:shadow-[var(--shadow-spray-red)]",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border-foreground hover:bg-primary/90",
        secondary:
          "bg-surface text-foreground border-foreground hover:bg-surface/70",
        outline:
          "bg-transparent text-foreground border-foreground hover:bg-foreground hover:text-background",
        destructive:
          "bg-primary text-primary-foreground border-foreground hover:bg-primary/90",
        ghost:
          "bg-transparent text-foreground border-transparent shadow-none hover:bg-foreground/10 hover:border-foreground/40 hover:shadow-none active:translate-x-0 active:translate-y-0",
        link:
          "bg-transparent border-transparent shadow-none text-primary underline underline-offset-4 hover:no-underline hover:-translate-y-0 active:translate-x-0 active:translate-y-0 active:shadow-none",
      },
      size: {
        default: "h-12 px-6 text-sm",
        sm:      "h-9 px-4 text-xs",
        lg:      "h-14 px-8 text-base",
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
