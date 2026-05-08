import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Neumorphic Button — pillowed, depth-aware, never flat.
 * Default state: extruded. Hover: lifted. Active: pressed inset.
 */
const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-display font-semibold tracking-tight rounded-2xl",
    "bg-background text-foreground",
    "transition-[transform,box-shadow,background-color,color] duration-300 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    "shadow-[var(--shadow-extruded)]",
    "hover:-translate-y-px hover:shadow-[var(--shadow-extruded-hover)]",
    "active:translate-y-[1px] active:shadow-[var(--shadow-inset-sm)]",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          // Primary CTA — accent violet, retains depth
          "bg-primary text-primary-foreground shadow-[6px_6px_12px_rgba(108,99,255,0.35),-6px_-6px_12px_rgba(255,255,255,0.55)] hover:shadow-[8px_8px_16px_rgba(108,99,255,0.4),-8px_-8px_16px_rgba(255,255,255,0.6)] active:shadow-[inset_4px_4px_8px_rgba(70,60,200,0.45),inset_-4px_-4px_8px_rgba(180,170,255,0.4)]",
        secondary:
          // Surface-matched, depth-only
          "bg-background text-foreground",
        outline:
          // Same as secondary visually — neumorphism has no borders
          "bg-background text-foreground",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[6px_6px_12px_rgba(220,80,80,0.3),-6px_-6px_12px_rgba(255,255,255,0.55)] hover:shadow-[8px_8px_16px_rgba(220,80,80,0.4),-8px_-8px_16px_rgba(255,255,255,0.6)] active:shadow-[inset_4px_4px_8px_rgba(180,50,50,0.4),inset_-4px_-4px_8px_rgba(255,200,200,0.4)]",
        ghost:
          // No depth at rest, gains inset on hover (pressed-into-surface feel)
          "bg-background text-foreground shadow-none hover:shadow-[var(--shadow-inset-sm)] hover:-translate-y-0 active:shadow-[var(--shadow-inset)]",
        link:
          "bg-transparent shadow-none hover:shadow-none hover:-translate-y-0 active:translate-y-0 active:shadow-none text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-6 text-base",
        sm:      "h-10 px-4 text-sm rounded-xl",
        lg:      "h-14 px-8 text-lg rounded-2xl",
        icon:    "h-12 w-12 rounded-2xl",
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
