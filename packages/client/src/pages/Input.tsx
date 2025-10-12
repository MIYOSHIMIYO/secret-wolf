import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/state/store";
import TimerCircle from "@/components/TimerCircle";
import GraphemeSplitter from "grapheme-splitter";
import { send } from "@/net/ws";

import { useViewportCompact } from "@/hooks/useViewportCompact";
import HeaderBar from "@/components/HeaderBar";
import Screen from "@/components/Screen";

function toNFC(s: string): string { return s.normalize("NFC"); }
function graphemeLengthNFC(s: string): number { const sp = new GraphemeSplitter(); return sp.countGraphemes(toNFC(s)); }
function clampGraphemeNFC(s: string, max: number): string {
  const sp = new GraphemeSplitter();
  const arr = (sp as any).splitGraphemes?.(toNFC(s).replace(/\r?\n+/g, " ")) ?? Array.from(toNFC(s));
  return arr.slice(0, max).join("");
}

export default function Input() {
  const room = useAppStore((s) => s.room);
  const endsAt = useAppStore((s) => s.endsAt);
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const count = useMemo(() => graphemeLengthNFC(text), [text]);
  const compact = useViewportCompact();

  // ラウンド変更時の状態リセット
  useEffect(() => {
    setText("");
    setSubmitted(false);
    console.debug("[Input] ラウンド変更、状態リセット", { roundId: room?.roundId, prompt: room?.round?.prompt });
  }, [room?.roundId, room?.round?.prompt]);

  const disabled = submitted || count === 0 || count > 20;

  function onSubmit() {
    if (disabled) return;
    const payload = clampGraphemeNFC(text.trim(), 20);
    setSubmitted(true);
    send("submitSecret", { text: payload });
    try { (document.activeElement as HTMLElement | null)?.blur(); } catch {}
  }

  return (
    <Screen topPadAdjustPx={10} contentScrollable={false} maxWidth={1200} innerClassName="xl:px-12">
      <div className="input-ipad-scale h-full overflow-hidden px-4 md:px-10 xl:px-0 pt-4 md:pt-10 flex flex-col gap-3 md:gap-6 xl:gap-8">
        {/* 見出し＋タイマー（中央配置） */}
        <div className="relative">
          <HeaderBar title="秘密入力" center />
          <div className="absolute right-0 top-0">
            <TimerCircle endsAt={endsAt} />
          </div>
        </div>

        <div className="flex-1 overflow-hidden xl:overflow-visible">
          <div className="flex flex-col gap-3 md:gap-6 xl:grid xl:grid-cols-[minmax(0,460px)_minmax(0,1fr)] xl:gap-8 xl:items-start h-full">
            <div className="flex flex-col gap-3 md:gap-6 xl:gap-8 xl:sticky xl:top-8">
              {/* お題セクション */}
              <div className="rounded-2xl bg-gradient-to-br from-violet-900/50 via-violet-800/30 to-fuchsia-900/20 ring-1 ring-violet-400/30 p-3 md:p-6">
                <h2 className="text-violet-200 text-sm md:text-xl font-medium mb-2 md:mb-4">お題</h2>
                <div className="px-3 md:px-5 py-2 md:py-4 rounded-lg bg-black/30 ring-1 ring-violet-300/30 text-sm md:text-xl leading-relaxed text-white/90">
                  {room?.round?.promptText || room?.round?.prompt || ""}
                </div>
              </div>

              {/* 秘密入力セクション（内容分の高さに縮める） */}
              <div className="rounded-2xl bg-gradient-to-br from-violet-900/50 via-violet-800/30 to-fuchsia-900/20 ring-1 ring-violet-400/30 p-3 md:p-6">
                <h2 className="text-violet-200 text-sm md:text-xl font-medium mb-2 md:mb-4">秘密を入力（20文字まで）</h2>
                <div className="flex flex-col h-full">
                  <textarea
                    value={text}
                    readOnly={submitted}
                    onChange={(e) => setText(clampGraphemeNFC(e.target.value, 20))}
                    rows={2}
                    className="w-full resize-none rounded-lg px-3 md:px-5 py-2 md:py-4 bg-black/30 text-white ring-1 ring-violet-300/30 focus:ring-2 focus:ring-violet-400/50 outline-none text-sm md:text-2xl leading-relaxed mb-2 md:min-h-[88px]"
                    placeholder="20文字以内で入力"
                    maxLength={200}
                  />
                  <div className="text-xs md:text-lg text-violet-200/80 mb-3">{count}/20</div>
                  
                  {!submitted ? (
                    <button
                      onClick={onSubmit}
                      disabled={disabled}
                      className="w-full rounded-lg font-semibold bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white py-2 md:py-4 text-sm md:text-2xl transition-all duration-200"
                    >
                      決定
                    </button>
                  ) : (
                    <div className="w-full rounded-lg text-center bg-white/10 text-white/80 py-2 md:py-4 text-sm md:text-xl">
                      他のプレイヤーの入力を待ってください
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 md:gap-6 xl:gap-6 xl:max-h-[calc(100vh-220px)] xl:overflow-y-auto xl:pr-3">

              {/* 秘密人狼の心得 */}
              <div className="rounded-2xl bg-gradient-to-br from-emerald-900/40 via-emerald-800/25 to-teal-900/15 ring-1 ring-emerald-400/25 p-3 md:p-6">
                <h3 className="text-emerald-200 font-medium text-sm md:text-2xl mb-2 md:mb-4">秘密人狼の心得</h3>
                <ul className="text-xs md:text-xl leading-5 md:leading-8 space-y-1 md:space-y-2 text-emerald-50">
                  <li>その1、入力する秘密は必ず自身のものとする。</li>
                  <li>その2、入力する秘密は嘘、冗談である。</li>
                  <li>その3、愛を込めて相手と向き合う。</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Screen>
  );
} 
