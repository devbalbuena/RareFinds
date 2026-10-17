import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        grail:
          "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold tracking-wider",
        ds:
          "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold",
        vnds:
          "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400 font-semibold",
        used:
          "border-zinc-500/40 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 font-medium",
        sold:
          "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400 font-bold uppercase",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
