import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none font-stencil uppercase tracking-wider text-base ring-offset-background transition-[transform,box-shadow,background-color,color] duration-75 focus-visible:outline-none focus-visible:border-primary focus-visible:shadow-[4px_4px_0px_hsl(var(--primary)/0.4)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border-2 border-primary-foreground/20 shadow-[4px_4px_0px_hsl(0_0%_0%/0.9)] hover:shadow-[2px_2px_0px_hsl(0_0%_0%/0.9)] active:shadow-none",
        destructive:
          "bg-destructive text-destructive-foreground border-2 border-black shadow-[4px_4px_0px_hsl(0_0%_0%/0.9)] hover:shadow-[2px_2px_0px_hsl(0_0%_0%/0.9)] active:shadow-none",
        outline:
          "border-2 border-secondary bg-transparent text-secondary shadow-[4px_4px_0px_hsl(27_100%_55%/0.3)] hover:bg-secondary hover:text-secondary-foreground hover:shadow-[2px_2px_0px_hsl(27_100%_55%/0.3)] active:shadow-none",
        secondary:
          "bg-secondary text-secondary-foreground border-2 border-black shadow-[4px_4px_0px_hsl(0_0%_0%/0.9)] hover:shadow-[2px_2px_0px_hsl(0_0%_0%/0.9)] active:shadow-none",
        ghost:
          "bg-transparent text-primary hover:bg-primary/10 hover:underline underline-offset-4",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-14 px-6 text-lg",
        sm: "h-12 px-4 text-base",
        lg: "h-16 px-10 text-xl",
        icon: "h-12 w-12 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
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
