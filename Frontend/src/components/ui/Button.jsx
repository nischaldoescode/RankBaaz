/**
 * renders the reusable button ui primitive with accessible states and theme friendly styling
 *
 * @file frontend/src/components/ui/button.jsx
 * @module frontend/src/components/ui/button
 * @exports component used by pages and shared layouts
 */

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold tracking-[0.01em] transition-all duration-200 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 active:scale-[0.985] cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_1px_2px_rgba(15,23,42,0.08),0_8px_22px_rgba(59,130,246,0.14)] hover:bg-primary/90 hover:shadow-[0_2px_6px_rgba(15,23,42,0.10),0_14px_34px_rgba(59,130,246,0.18)]",
        destructive:
          "bg-destructive text-white shadow-[0_8px_22px_rgba(220,38,38,0.16)] hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        success:
          "bg-blue-500 text-white shadow-[0_8px_22px_rgba(59,130,246,0.14)] hover:bg-blue-600",
        warning:
          "bg-amber-500 text-slate-950 shadow-[0_8px_22px_rgba(245,158,11,0.16)] hover:bg-amber-400",
        outline:
          "border border-blue-200 bg-white/80 text-blue-600 shadow-sm backdrop-blur-md hover:bg-blue-50 hover:border-blue-300 dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-blue-50 text-blue-600 shadow-sm hover:bg-blue-100",
        ghost:
          "text-slate-700 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-accent/50",
        link: "rounded-md px-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2 has-[>svg]:px-4",
        sm: "h-9 gap-1.5 px-4 has-[>svg]:px-3",
        lg: "h-12 px-7 text-base has-[>svg]:px-5",
        icon: "size-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
