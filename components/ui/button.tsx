import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-[14px] text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:translate-y-[2px]",
  {
    variants: {
      variant: {
        default:
          "bg-brand-500 text-white shadow-pressable hover:bg-brand-600 active:shadow-pressable-pressed",
        destructive: "bg-coral-500 text-white shadow-pressable hover:bg-coral-500/90 active:shadow-pressable-pressed",
        outline: "border border-stroke-200 bg-transparent text-brand-700 hover:bg-bg-50 active:bg-bg-100",
        secondary: "glass text-brand-700 border-stroke-200 hover:bg-white/80 active:bg-white/90",
        ghost: "text-brand-600 hover:bg-brand-500/10 hover:text-brand-700",
        link: "text-brand-600 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5",
        sm: "h-9 rounded-[12px] px-3 text-xs",
        lg: "h-11 rounded-[16px] px-8 text-base",
        icon: "h-10 w-10 rounded-[14px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
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
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
