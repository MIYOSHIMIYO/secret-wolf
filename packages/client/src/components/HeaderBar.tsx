import React from "react";

type Props = {
  title: string;
  right?: React.ReactNode; // TimerCircleなど
  center?: boolean;
  onBack?: () => void; // 戻るボタンのコールバック
};

export default function HeaderBar({ title, right, center = false, onBack }: Props) {
  if (center) {
    return (
      <div className="relative py-3 md:py-4 flex items-center justify-center">
        {onBack && (
          <button
            onClick={onBack}
            className="absolute left-0 top-1/2 -translate-y-1/2 p-2 text-slate-50 hover:text-slate-200 transition-colors"
            aria-label="戻る"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <h1 className="text-[28px] md:text-[36px] leading-9 md:leading-[44px] font-bold text-slate-50 text-center">{title}</h1>
        {right && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2">{right}</div>
        )}
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between py-3 md:py-4">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 text-slate-50 hover:text-slate-200 transition-colors"
            aria-label="戻る"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <h1 className="text-[28px] md:text-[36px] leading-9 md:leading-[44px] font-bold text-slate-50">{title}</h1>
      </div>
      <div className="flex-shrink-0">{right}</div>
    </div>
  );
} 