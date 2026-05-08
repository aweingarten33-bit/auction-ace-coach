import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Newsprint Button — bordered editorial CTA.
 * Inverts color on hover. Sharp corners. Uppercase tracking-widest.
 */
const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-sans uppercase tracking-widest font-semibold",
    "rounded-none border transition-all duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-40",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:stroke-[1.5]",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-foreground text-background border-foreground hover:bg-background hover:text-foreground",
        secondary:
          "bg-background text-foreground border-foreground hover:bg-foreground hover:text-background",
        outline:
          "bg-transparent text-foreground border-foreground hover:bg-foreground hover:text-background",
        destructive:
          "bg-[hsl(var(--accent))] text-background border-[hsl(var(--accent))] hover:bg-background hover:text-[hsl(var(--accent))]",
        ghost:
          "bg-transparent text-foreground border-transparent hover:bg-secondary",
        link:
          "bg-transparent text-foreground border-transparent underline-offset-4 decoration-2 decoration-[hsl(var(--accent))] hover:underline",
      },
      size: {
        default: "h-11 px-5 text-xs",
        sm:      "h-10 px-4 text-[11px]",
        lg:      "h-12 px-8 text-sm",
        icon:    "h-11 w-11",
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
