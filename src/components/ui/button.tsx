import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Neo-brutalist Button — bordered sticker. Click presses down onto its shadow.
 */
const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-display font-black uppercase tracking-wide",
    "rounded-none border-4 border-foreground",
    "shadow-[4px_4px_0_0_hsl(var(--foreground))]",
    "transition-all duration-100 ease-linear",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:stroke-[3]",
    "hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[6px_6px_0_0_hsl(var(--foreground))]",
    "active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-[hsl(var(--primary))] text-foreground",
        secondary:
          "bg-[hsl(var(--secondary))] text-foreground",
        outline:
          "bg-card text-foreground",
        destructive:
          "bg-[hsl(var(--primary))] text-foreground",
        ghost:
          "bg-transparent text-foreground border-transparent shadow-none hover:bg-[hsl(var(--secondary))] hover:border-foreground hover:shadow-[4px_4px_0_0_hsl(var(--foreground))]",
        link:
          "bg-transparent text-foreground border-transparent shadow-none underline-offset-4 hover:underline hover:translate-x-0 hover:translate-y-0 active:translate-x-0 active:translate-y-0",
      },
      size: {
        default: "h-12 px-5 text-sm",
        sm:      "h-10 px-4 text-xs",
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
