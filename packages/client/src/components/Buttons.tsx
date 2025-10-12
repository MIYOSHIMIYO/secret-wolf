import React from "react";

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode };

export function PrimaryBtn({ children, className = "", disabled, ...rest }: BtnProps) {
  const base = disabled
    ? "bg-white/15 text-white/60 cursor-not-allowed"
    : "bg-primary-600 hover:bg-primary-500 text-white";
  return (
    <button
      className={`h-12 px-4 rounded-2xl font-semibold transition-[transform,background-color] duration-200 ${base} ${className}`}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}

export function SecondaryBtn({ children, className = "", ...rest }: BtnProps) {
  return (
    <button
      className={`h-12 px-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white active:scale-[0.98] transition-[transform,background-color] duration-200 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function DangerBtn({ children, className = "", ...rest }: BtnProps) {
  return (
    <button
      className={`px-4 py-3 rounded-2xl inline-flex items-center justify-center bg-rose-600 hover:bg-rose-500 text-white font-semibold leading-none active:scale-[0.98] transition-[transform,background-color] duration-200 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
} 