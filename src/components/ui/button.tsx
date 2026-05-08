import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * FRANK MILLER NEWSPRINT BRUTALISM — Button.
 * Industrial. Authoritative. Sharp corners, hard borders, mono labels.
 * Hover inverts ink. Active presses into the page.
 */
const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap select-none",
    "font-mono uppercase tracking-[0.14em] font-semibold",
    "rounded-none border-2",
    "transition-[transform,background-color,color,border-color,box-shadow] duration-150 ease-[cubic-bezier(0.2,0,0.1,1)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--bone))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]",
    "disabled:pointer-events-none disabled:opacity-40",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:stroke-[2.25]",
    "active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
  ].join(" "),
  {
    variants: {
      variant: {
        // Primary — bone on void. The headline action.
        default: [
          "bg-[hsl(var(--bone))] text-[hsl(var(--void))] border-[hsl(var(--bone))]",
          "shadow-[6px_6px_0_0_hsl(0_0%_0%)]",
          "hover:bg-[hsl(var(--void))] hover:text-[hsl(var(--bone))]",
        ].join(" "),
        // Secondary — ghost steel
        secondary: [
          "bg-transparent text-[hsl(var(--bone))] border-[hsl(var(--bone))]",
          "shadow-[4px_4px_0_0_hsl(0_0%_0%)]",
          "hover:bg-[hsl(var(--bone))] hover:text-[hsl(var(--void))]",
        ].join(" "),
        // Outline — gunmetal frame
        outline: [
          "bg-[hsl(var(--charcoal))] text-[hsl(var(--bone))] border-[hsl(var(--border))]",
          "shadow-[4px_4px_0_0_hsl(0_0%_0%)]",
          "hover:border-[hsl(var(--bone))]",
        ].join(" "),
        // Destructive — blood stamp
        destructive: [
          "bg-[hsl(var(--blood))] text-[hsl(var(--bone))] border-[hsl(var(--blood))]",
          "shadow-[6px_6px_0_0_hsl(0_0%_0%)]",
          "hover:bg-[hsl(var(--signal-red))] hover:border-[hsl(var(--signal-red))]",
        ].join(" "),
        // Gold — earned, dirty
        gold: [
          "bg-[hsl(var(--dirty-gold))] text-[hsl(var(--void))] border-[hsl(var(--dirty-gold))]",
          "shadow-[6px_6px_0_0_hsl(0_0%_0%)]",
          "hover:bg-[hsl(var(--warning-yellow))] hover:border-[hsl(var(--warning-yellow))]",
        ].join(" "),
        // Ghost — invisible until touched
        ghost: [
          "bg-transparent text-[hsl(var(--bone))] border-transparent",
          "hover:bg-[hsl(var(--charcoal))] hover:border-[hsl(var(--border))]",
        ].join(" "),
        // Link — newsprint underline
        link: [
          "bg-transparent text-[hsl(var(--bone))] border-transparent shadow-none",
          "underline underline-offset-4 decoration-2 decoration-[hsl(var(--dirty-gold))]",
          "hover:decoration-[hsl(var(--blood))] active:translate-x-0 active:translate-y-0",
        ].join(" "),
      },
      size: {
        default: "h-12 px-6 text-xs",
        sm:      "h-10 px-4 text-[0.65rem]",
        lg:      "h-14 px-9 text-sm",
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
