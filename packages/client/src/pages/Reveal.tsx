import Screen from "@/components/Screen";
import { useAppStore } from "@/state/store";
import { useEffect, useRef, useState } from "react";
import { REVEAL_FADE_MS } from "@secret/shared/src/reveal";
import { send } from "@/net/ws";

export default function Reveal() {
  const room = useAppStore((s) => s.room);
  const rv = (room as any)?.reveal as { text: string; startAt: number; at1: number; at2: number; at3: number; endsAt: number } | undefined;

  // Hooks must always be called in the same order
  const sentAck = useRef(false);
  useEffect(() => {
    if (!rv) return;
    const ackAt = rv.at3 + REVEAL_FADE_MS;
    const t = window.setTimeout(() => {
      if (!sentAck.current) {
        try { send("revealReady", {}); } catch {}
        sentAck.current = true;
      }
    }, Math.max(0, ackAt - Date.now()));
    return () => clearTimeout(t);
  }, [rv?.at3]);

  const phase = useAppStore((s) => s.room?.phase);
  const [, rerender] = useState(0);
  useEffect(() => { const id = setInterval(() => rerender((x) => x + 1), 120); return () => clearInterval(id); }, []);

  const now = Date.now();
  const d1 = rv ? Math.max(0, (rv.at1 - now) / 1000) : 0;
  const d2 = rv ? Math.max(0, (rv.at2 - now) / 1000) : 0;
  const d3 = rv ? Math.max(0, (rv.at3 - now) / 1000) : 0;
  const showSyncChip = !!rv && Date.now() >= rv.endsAt - 50 && phase === "REVEAL" && sentAck.current;

  return (
    <Screen contentScrollable={false}>
      <div className="min-h-dvh px-5 pt-8 pb-[env(safe-area-inset-bottom)] flex flex-col gap-6 overflow-hidden">
        <h1 className="text-4xl font-extrabold tracking-wide drop-shadow-[0_4px_20px_rgba(168,85,247,.35)] text-center">秘密発表</h1>
        <div className="relative rounded-3xl p-6 md:p-8 bg-gradient-to-br from-violet-900/50 via-violet-800/25 to-fuchsia-900/15 ring-1 ring-violet-400/30 shadow-[0_0_0_1px_rgba(139,92,246,.15),0_12px_40px_rgba(139,92,246,.25)] max-w-[700px] mx-auto w-full mb-4">
          {!rv ? (
            <div className="text-slate-300 text-sm">公開準備中…</div>
          ) : (
            <>
              <p style={{ animationDelay: `${d1}s` }} className="reveal-line text-[20px] md:text-[22px] leading-relaxed text-violet-100 text-center">
                おやおや、こんなところに<br />
                誰かの秘密が落ちている
              </p>
              <div
                style={{ animationDelay: `${d2}s` }}
                className="reveal-line mt-4 rounded-2xl px-6 py-6 bg-gradient-to-r from-violet-600/20 via-purple-600/25 to-fuchsia-600/20 ring-2 ring-violet-400/40 shadow-[inset_0_0_30px_rgba(139,92,246,.15),0_4px_20px_rgba(139,92,246,.3)] max-w-full relative overflow-hidden"
              >
                {/* 背景の光る効果 */}
                <div className="absolute inset-0 bg-gradient-to-r from-violet-400/5 via-purple-400/5 to-fuchsia-400/5 animate-pulse"></div>
                
                {/* 秘密の文 */}
                <p className="text-3xl md:text-[32px] leading-relaxed whitespace-pre-wrap break-words font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-violet-200 via-purple-100 to-fuchsia-200 relative z-10 text-center">
                  {rv.text || "時間切れで入力できず、ごめんなさい"}
                </p>
                
                {/* 装飾的な角の光 */}
                <div className="absolute top-0 left-0 w-3 h-3 bg-gradient-to-br from-violet-400/60 to-transparent rounded-tl-2xl"></div>
                <div className="absolute top-0 right-0 w-3 h-3 bg-gradient-to-bl from-purple-400/60 to-transparent rounded-tr-2xl"></div>
                <div className="absolute bottom-0 left-0 w-3 h-3 bg-gradient-to-tr from-fuchsia-400/60 to-transparent rounded-bl-2xl"></div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-gradient-to-tl from-violet-400/60 to-transparent rounded-br-2xl"></div>
              </div>
              <p style={{ animationDelay: `${d3}s` }} className="reveal-line text-[20px] md:text-[22px] mt-8 text-violet-100 text-center">
                これは一体誰の秘密だろう
              </p>
            </>
          )}
          {showSyncChip && (
            <div className="pointer-events-none fixed bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white ring-1 ring-white/10 shadow">通信中…</div>
          )}
        </div>
      </div>
    </Screen>
  );
} 