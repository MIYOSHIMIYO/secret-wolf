import React from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  closable?: boolean;
};

export default function Modal({ open, onClose, title, children, closable = true }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={closable ? onClose : undefined} />
      <div className="relative mx-3 w-full max-w-[560px] sm:max-w-[640px] lg:max-w-[720px] xl:max-w-[820px]">
        <div className="rounded-2xl bg-white/10 backdrop-blur-[6px] border border-white/20 shadow-[0_8px_30px_rgba(0,0,0,.35)] p-4 sm:p-5 lg:p-6">
          {title && <div className="text-lg sm:text-xl lg:text-2xl font-semibold mb-2">{title}</div>}
          <div className="text-slate-200 text-sm sm:text-base lg:text-lg leading-6 max-h-[60vh] overflow-y-auto">
            {children}
          </div>
          {closable && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={onClose}
                className="h-10 sm:h-11 lg:h-12 px-4 sm:px-5 lg:px-6 rounded-xl bg-white/10 hover:bg-white/15 text-white focus-visible:ring-2 ring-primary-400 text-sm sm:text-base"
              >
                閉じる
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 