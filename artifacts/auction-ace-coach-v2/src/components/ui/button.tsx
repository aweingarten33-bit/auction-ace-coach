import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Neumorphism (Soft UI) — Button.
 * Same-surface pillows. Dual opposing shadows. Soft press on active.
 * Suit palette: navy primary, ochre gold, maroon destructive.
 */
const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap select-none",
    "font-medium tracking-tight",
    "rounded-2xl border-0",
    "transition-[transform,background-color,color,box-shadow] duration-300 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    "shadow-none",
    "hover:opacity-90",
    "active:scale-[0.98]",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-[hsl(var(--foreground))] text-[hsl(var(--background))] rounded-full",
        secondary:
          "bg-[hsl(var(--surface))] text-[hsl(var(--foreground))] rounded-full",
        outline:
          "bg-transparent text-[hsl(var(--foreground))] rounded-full shadow-[inset_0_0_0_1px_hsl(var(--foreground)/0.2)] hover:bg-[hsl(var(--foreground)/0.06)]",
        destructive:
          "bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] rounded-full",
        gold:
          "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-full",
        ghost:
          "bg-transparent text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface))] rounded-full",
        link:
          "bg-transparent text-[hsl(var(--primary))] underline underline-offset-4",
      },
      size: {
        default: "h-12 px-7 text-sm",
        sm: "h-10 px-5 text-xs rounded-full",
        lg: "h-14 px-9 text-base rounded-full",
        icon: "h-12 w-12 rounded-full",
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
