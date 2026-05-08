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
    "shadow-[var(--neu-extruded)]",
    "hover:-translate-y-[1px] hover:shadow-[var(--neu-extruded-hover)]",
    "active:translate-y-[0.5px] active:shadow-[var(--neu-inset-sm)]",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-[hsl(42_92%_55%)] to-[hsl(34_82%_38%)] text-[hsl(225_50%_6%)] shadow-[inset_0_1px_0_hsl(48_100%_75%/0.7),inset_0_-2px_0_hsl(20_60%_18%/0.6),0_8px_18px_-6px_hsl(38_90%_30%/0.7)] hover:from-[hsl(44_95%_60%)] hover:to-[hsl(34_82%_42%)]",
        secondary:
          "bg-[hsl(var(--surface))] text-[hsl(var(--foreground))] shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.3),0_8px_18px_-8px_hsl(0_0%_0%/0.8)]",
        outline:
          "bg-transparent text-[hsl(var(--primary))] shadow-[inset_0_0_0_1.5px_hsl(var(--primary)/0.7)] hover:bg-[hsl(var(--primary)/0.08)]",
        destructive:
          "bg-gradient-to-b from-[hsl(354_72%_42%)] to-[hsl(354_78%_24%)] text-[hsl(40_55%_92%)] shadow-[inset_0_1px_0_hsl(354_80%_60%/0.5),0_8px_18px_-6px_hsl(354_80%_15%/0.7)]",
        gold:
          "bg-gradient-to-b from-[hsl(42_92%_55%)] to-[hsl(34_82%_38%)] text-[hsl(225_50%_6%)] shadow-[inset_0_1px_0_hsl(48_100%_75%/0.7),inset_0_-2px_0_hsl(20_60%_18%/0.6)]",
        ghost:
          "bg-transparent shadow-none text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface))] hover:shadow-[var(--neu-extruded-sm)]",
        link:
          "bg-transparent shadow-none text-[hsl(var(--primary))] underline underline-offset-4 hover:translate-y-0 active:translate-y-0",
      },
      size: {
        default: "h-12 px-6 text-sm",
        sm: "h-10 px-4 text-xs rounded-xl",
        lg: "h-14 px-9 text-base rounded-2xl",
        icon: "h-12 w-12 rounded-2xl",
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
