import React from "react";

type Props = React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode };

export default function Panel({ children, className = "", ...rest }: Props) {
  return (
    <div
      className={`rounded-2xl bg-white/5 backdrop-blur-[6px] border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,.25)] ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
} 