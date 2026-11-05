"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

export interface CoverButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  rounded?: "full" | "subtle";
}

const CoverButton = forwardRef<HTMLButtonElement, CoverButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      rounded = "subtle",
      disabled,
      className = "",
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: "px-3 py-1.5 text-xs font-medium tracking-wide",
      md: "px-4 py-2 text-sm font-semibold tracking-wide",
      lg: "px-6 py-2.5 text-base font-bold tracking-wide",
    }[size];

    const radiusClass = rounded === "full" ? "rounded-full" : "rounded-sm";

    const variantClasses = {
      primary:
        "bg-[var(--accent)] text-[var(--accent-ink)] hover:opacity-90 active:scale-[0.99] border border-transparent shadow-sm",
      secondary:
        "bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)] hover:bg-[var(--bg-elevated)] active:scale-[0.99]",
      accent:
        "bg-[var(--border-strong)] text-[var(--accent-ink)] hover:opacity-95 active:scale-[0.99] border border-transparent",
      danger:
        "bg-[var(--danger)] text-white hover:opacity-90 active:scale-[0.99] border border-transparent",
      ghost:
        "bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] border border-transparent",
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`inline-flex items-center justify-center font-sans transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none ${sizeClasses} ${radiusClass} ${variantClasses} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

CoverButton.displayName = "CoverButton";

export default CoverButton;
