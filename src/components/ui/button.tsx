import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Maximalism Button — pill-shaped, gradient or clashing-border, multi-shadow.
 * Bouncy hover, scales + shifts, never restrained.
 */
const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-heading uppercase tracking-widest font-black",
    "rounded-full border-4",
    "transition-all duration-300 [transition-timing-function:cubic-bezier(0.68,-0.55,0.265,1.55)]",
    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[hsl(var(--max-3))] focus-visible:ring-offset-4 focus-visible:ring-offset-[hsl(var(--max-1))]",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:stroke-[2.5]",
    "active:scale-95",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "text-white border-[hsl(var(--max-3))]",
          "bg-gradient-to-r from-[hsl(var(--max-1))] via-[hsl(var(--max-5))] to-[hsl(var(--max-2))] bg-[length:200%_200%]",
          "shadow-[0_0_24px_hsl(var(--max-1)/0.5),6px_6px_0_hsl(var(--max-3)),12px_12px_0_hsl(var(--max-2))]",
          "hover:scale-110 hover:bg-[position:100%_50%]",
          "hover:shadow-[0_0_40px_hsl(var(--max-3)/0.8),8px_8px_0_hsl(var(--max-1)),16px_16px_0_hsl(var(--max-5))]",
        ].join(" "),
        secondary: [
          "bg-transparent text-[hsl(var(--max-3))] border-dashed border-[hsl(var(--max-3))]",
          "hover:bg-[hsl(var(--max-3))] hover:text-[hsl(var(--background))] hover:border-solid hover:scale-105",
          "hover:shadow-[0_0_24px_hsl(var(--max-3)/0.6)]",
        ].join(" "),
        outline: [
          "bg-[hsl(var(--muted-bg)/0.5)] text-white border-[hsl(var(--max-1))] backdrop-blur-sm",
          "shadow-[6px_6px_0_hsl(var(--max-3)),12px_12px_0_hsl(var(--max-2))]",
          "hover:-translate-x-1 hover:-translate-y-1",
          "hover:shadow-[10px_10px_0_hsl(var(--max-3)),20px_20px_0_hsl(var(--max-2))]",
          "active:translate-x-0 active:translate-y-0 active:shadow-none",
        ].join(" "),
        destructive: [
          "text-white border-[hsl(var(--max-3))]",
          "bg-gradient-to-r from-[hsl(var(--max-1))] to-[hsl(var(--max-4))]",
          "shadow-[0_0_24px_hsl(var(--max-1)/0.6),6px_6px_0_hsl(var(--max-3))]",
          "hover:scale-110 hover:shadow-[0_0_40px_hsl(var(--max-1)/0.9),8px_8px_0_hsl(var(--max-3))]",
        ].join(" "),
        ghost: [
          "bg-transparent text-white border-transparent",
          "hover:bg-[hsl(var(--max-5)/0.25)] hover:text-[hsl(var(--max-3))] hover:scale-105",
          "hover:shadow-[0_0_18px_hsl(var(--max-5)/0.5)]",
        ].join(" "),
        link: [
          "bg-transparent text-[hsl(var(--max-3))] border-transparent",
          "underline underline-offset-4 decoration-2 decoration-[hsl(var(--max-1))]",
          "hover:decoration-[hsl(var(--max-3))] hover:scale-105",
        ].join(" "),
      },
      size: {
        default: "h-14 px-10 text-sm",
        sm:      "h-11 px-6 text-xs",
        lg:      "h-16 px-12 text-base",
        icon:    "h-14 w-14",
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
