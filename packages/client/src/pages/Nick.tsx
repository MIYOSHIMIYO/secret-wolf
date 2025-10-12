import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getNick as loadNick, setNick as persistNick } from "@/lib/nick";
import Screen from "@/components/Screen";
import HeaderBar from "@/components/HeaderBar";

function clampGraphemes(value: string, max: number): string {
  // naive grapheme approximation: length by Array.from
  const arr = Array.from(value.normalize("NFC"));
  if (arr.length <= max) return value.normalize("NFC");
  return arr.slice(0, max).join("");
}

export default function Nick() {
  const nav = useNavigate();
  const [nick, setNick] = useState("");
  const limit = 8;

  useEffect(() => {
    setNick(loadNick());
  }, []);

  const count = useMemo(() => Array.from(nick.normalize("NFC")).length, [nick]);
  const canSave = count > 0 && count <= limit;

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = clampGraphemes(e.target.value, limit);
    setNick(v);
  }

  function save() {
    const v = nick.trim();
    if (!v) return;
    persistNick(v);
    nav(-1);
  }

  const bannerH = 56;
  return (
    <Screen bannerHeight={bannerH}>
      <div
        className="px-4 md:px-8"
        style={{ height: `calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - ${bannerH}px)` }}
      >
        <div className="h-full flex flex-col">
          <HeaderBar title="ニックネーム" center />

          {/* move form higher */}
          <div className="flex-1 flex flex-col items-center gap-4 pt-6 md:pt-16">
            <div className="w-full max-w-[480px] md:max-w-[720px]">
              <label className="text-slate-300 text-sm md:text-2xl">表示名（最大8文字）</label>
              <div className="mt-1 flex items-center gap-2 md:gap-4">
                <input
                  value={nick}
                  onChange={onChange}
                  className="flex-1 px-4 md:px-8 h-12 md:h-20 rounded-2xl md:rounded-3xl bg-white/5 border border-white/10 text-slate-50 placeholder:text-white/40 md:text-2xl"
                  placeholder="例）ええええ"
                />
                <div className={`px-3 md:px-5 h-12 md:h-20 rounded-2xl md:rounded-3xl flex items-center justify-center text-sm md:text-xl ${count<=limit?"text-slate-300 bg-white/5":"text-rose-100 bg-rose-500/20"}`}>
                  {count}/{limit}
                </div>
              </div>
              <button
                className={`mt-5 h-12 md:h-20 w-full rounded-2xl md:rounded-3xl font-semibold transition-colors md:text-2xl ${canSave?"bg-primary-600 hover:bg-primary-500 text-white":"bg-white/10 text-white/40"}`}
                onClick={save}
                disabled={!canSave}
              >
                保存
              </button>
              <div className="mt-3 md:mt-5 flex justify-end">
                <button className="text-primary-400 md:text-xl" onClick={() => nav(-1)}>戻る</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Screen>
  );
} 