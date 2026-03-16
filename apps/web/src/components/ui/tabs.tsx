import * as React from "react";
import { cn } from "@/lib/utils";

export function Tabs({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center gap-2 overflow-x-auto", className)} {...props} />;
}

export interface TabsButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function TabsButton({ className, active = false, ...props }: TabsButtonProps) {
  return (
    <button
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "border-white/20 bg-white text-[#0b1020]"
          : "border-white/10 bg-white/5 text-white/68 hover:bg-white/10 hover:text-white",
        className,
      )}
      {...props}
    />
  );
}