import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const VARIANTS = {
  primary: "bg-primary text-white hover:bg-primary-dark disabled:bg-primary/50",
  accent: "bg-accent text-white hover:brightness-95 disabled:opacity-50",
  outline: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 disabled:opacity-50",
  ghost: "text-slate-700 hover:bg-slate-100 disabled:opacity-50",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:opacity-50",
} as const;

const SIZES = {
  sm: "h-9 px-3 text-sm",
  md: "h-12 px-5 text-base", // ≥48px tap target (§7)
  lg: "h-14 px-6 text-lg",
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
});

export function buttonClass(variant: keyof typeof VARIANTS = "primary", size: keyof typeof SIZES = "md", extra?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors",
    VARIANTS[variant],
    SIZES[size],
    extra,
  );
}
