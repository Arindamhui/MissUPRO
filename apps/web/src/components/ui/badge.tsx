import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]",
  {
    variants: {
      variant: {
        default: "bg-white/10 text-white/70",
        live: "bg-[#ff6b3d]/18 text-[#ffb59e]",
        hot: "bg-[#ffc857]/18 text-[#ffe3a0]",
        neutral: "bg-[#7dd3fc]/16 text-[#c9f0ff]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}