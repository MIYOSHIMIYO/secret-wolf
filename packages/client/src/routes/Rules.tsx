import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { RULE_PAGES } from "@/content/rules";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";

function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i}>{p.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

const slideVariants = {
  enter: (dir: 1 | -1) => ({ x: 28 * dir, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: 1 | -1) => ({ x: -28 * dir, opacity: 0 }),
};

export default function Rules() {
  const nav = useNavigate();
  const [i, setI] = useState(() => {
    const savedIdx = Number(localStorage.getItem("rules.idx") || 0);
    // 保存されたインデックスが範囲外の場合は0にリセット
    return savedIdx >= RULE_PAGES.length ? 0 : savedIdx;
  });
  const [dir, setDir] = useState<1 | -1>(1);
  const page = RULE_PAGES[i];
  const total = RULE_PAGES.length;

  // ページが存在しない場合の安全対策
  if (!page) {
    return (
      <Screen>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">エラーが発生しました</h1>
          <p className="mb-4">ルールページの読み込みに失敗しました</p>
          <button
            onClick={() => nav("/menu", { replace: true })}
            className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl"
          >
            メニューに戻る
          </button>
        </div>
      </Screen>
    );
  }

  const headerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [measuredSlideMax, setMeasuredSlideMax] = useState<number | undefined>(undefined);
  const [availableForSlide, setAvailableForSlide] = useState<number | undefined>(undefined);

  // lock body scrolling while this screen is visible
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const go = (n: number, d: 1 | -1) => {
    if (n < 0 || n >= total) return;
    setDir(d);
    setI(n);
    try { localStorage.setItem("rules.idx", String(n)); } catch {}
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(i + 1, 1);
      if (e.key === "ArrowLeft") go(i - 1, -1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i]);

  // Pre-measure: calculate the max slide height
  const measRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = measRef.current;
    if (!root) return;
    let maxH = 0;
    for (const el of Array.from(root.children)) {
      maxH = Math.max(maxH, (el as HTMLElement).offsetHeight);
    }
    if (maxH > 0) setMeasuredSlideMax(maxH);
  }, []);

  // Compute available space for the slide from viewport minus header/progress paddings
  useLayoutEffect(() => {
    const calc = () => {
      const vpH = window.visualViewport?.height ?? window.innerHeight;
      const headerH = headerRef.current?.offsetHeight ?? 0;
      const isDesktop = window.innerWidth >= 1024;
      const progressH = isDesktop ? 0 : progressRef.current?.offsetHeight ?? 0;
      const canvas = canvasRef.current;
      const padT = canvas ? parseFloat(getComputedStyle(canvas).paddingTop) : 0;
      const padB = canvas ? parseFloat(getComputedStyle(canvas).paddingBottom) : 0;
      // SE幅ではルート要素に縮小スケールを当てているため、
      // 実効表示に合わせて利用可能高さを少し抑える
      const isSE = window.innerWidth <= 375;
      // SEではルートを 0.89 スケールしているため、見かけの高さを補正して
      // スライド容器を広めに確保する（vpH / scale）
      const seScale = 0.89; // SEの表示欄サイズはこのスケールに合わせて計算
      const extraBottom = isSE ? 10 : 0; // 余白を少し戻す
      const reserveForControls = isSE ? 120 : 0; // 進捗＋CTA＋左右ボタン分（十分に確保）
      const heightBase = isSE ? (vpH / seScale) : vpH;
      const available = heightBase - headerH - progressH - padT - padB - extraBottom - reserveForControls;
      setAvailableForSlide(Math.max(0, Math.floor(available)));
    };
    calc();
    window.addEventListener("resize", calc);
    window.visualViewport?.addEventListener("resize", calc);
    return () => {
      window.removeEventListener("resize", calc);
      window.visualViewport?.removeEventListener("resize", calc);
    };
  }, []);

  // SEでは表示欄を優先的に縦に広げる（内容高さよりも利用可能高さを優先）
  const isSmallViewport = typeof window !== "undefined" ? window.innerWidth <= 375 : false;
  const slideHeight = measuredSlideMax && availableForSlide
    ? (isSmallViewport ? availableForSlide : Math.min(measuredSlideMax, availableForSlide))
    : undefined;

  return (
    <Screen maxWidth={1240} innerClassName="lg:px-12">
      <div className="h-full overflow-hidden text-slate-100 rules-se-scale lg:py-6">
        {/* header */}
        <div ref={headerRef} className="mx-auto max-w-[800px] px-5 pt-5 md:px-10 md:pt-10 flex items-center justify-between lg:max-w-none lg:px-0 lg:pt-0">
          <button
            aria-label="メニューに戻る"
            onClick={() => nav("/menu", { replace: true })}
            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 border border-white/15 backdrop-blur hover:bg-white/15 active:scale-95 flex items-center justify-center focus-visible:ring-2 ring-primary-400"
          >
            <X className="size-5 md:size-6" />
          </button>
          <div className="text-sm md:text-base text-slate-300 tabular-nums">
            {i + 1} / {total}
          </div>
        </div>

      {/* hidden pre-measure container */}
      <div ref={measRef} className="absolute opacity-0 pointer-events-none select-none -z-10 max-w-[800px] lg:max-w-[760px] px-5 md:px-10 lg:px-0">
        {RULE_PAGES.map((p) => (
          <section key={`m-${p.key}`} className="rule-card rounded-3xl border border-white/10 bg-white/5 backdrop-blur-[6px] shadow-[0_10px_30px_rgba(0,0,0,.25)] p-6 md:p-10">
            <h1 className="rule-title text-3xl md:text-6xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-violet-200 to-sky-200">
              {p.title}
            </h1>
            <div className="h-1 md:h-2 w-14 md:w-24 bg-primary-400/70 rounded-full mt-2 md:mt-4 mb-4 md:mb-7" />
              <ul className="space-y-2 md:space-y-4">
              {p.bullets.map((b, idx) => (
                <li key={idx} className="rule-item text-lg md:text-[1.7rem] leading-relaxed before:content-['•'] before:mr-2 before:text-violet-300">
                  <Rich text={b} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

        {/* canvas */}
        <div ref={canvasRef} className="relative mx-auto max-w-[800px] px-5 pt-4 pb-4 md:px-10 md:pt-8 md:pb-8 lg:max-w-none lg:px-0 lg:pt-10">
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12 lg:items-start">
            <div className="relative">
              <div className="relative overflow-hidden" style={{ height: slideHeight }}>
                <AnimatePresence initial={false} custom={dir} mode="wait">
                  <motion.section
                    key={page.key}
                    custom={dir}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="rule-card absolute inset-0 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-[6px] shadow-[0_10px_30px_rgba(0,0,0,.25)] p-6 md:p-10"
                  >
                    <h1 className="rule-title text-3xl md:text-6xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-violet-200 to-sky-200">
                      {page.title}
                    </h1>
                    <div className="h-1 md:h-2 w-14 md:w-24 bg-primary-400/70 rounded-full mt-2 md:mt-4 mb-4 md:mb-7" />
                    <ul className="space-y-2 md:space-y-4">
                      {page.bullets.map((b, idx) => (
                        <li
                          key={idx}
                          className="rule-item text-lg md:text-[1.7rem] leading-relaxed before:content-['•'] before:mr-2 before:text-violet-300"
                        >
                          <Rich text={b} />
                        </li>
                      ))}
                    </ul>
                  </motion.section>
                </AnimatePresence>
              </div>
            </div>

            <div ref={progressRef} className="mt-3 md:mt-6 flex flex-col items-center gap-2 md:gap-4 lg:mt-0 lg:items-stretch lg:gap-6 lg:h-full lg:pr-4">
              <div className="w-full h-1 md:h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-400 transition-all"
                  style={{ width: `${((i + 1) / total) * 100}%` }}
                />
              </div>
              <div className="flex gap-2 md:gap-4 justify-center">
                {RULE_PAGES.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => go(idx, idx > i ? 1 : -1)}
                    aria-label={`${idx + 1}ページへ`}
                    className={`h-2 rounded-full transition-all focus-visible:ring-2 ring-primary-400 ${
                      idx === i ? "w-6 bg-primary-400" : "w-2 bg-white/25 hover:bg-white/35"
                    }`}
                  />
                ))}
              </div>

              <div className="mt-2 md:mt-4 lg:mt-0">
                <button
                  onClick={() => nav("/topics")}
                  className="px-6 py-3 md:px-10 md:py-5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl md:text-xl"
                >
                  お題一覧を見る
                </button>
              </div>

              <div className="mt-2 md:mt-4 w-full flex items-center justify-between px-6 md:px-10 lg:px-0 lg:mt-auto">
                <div className="w-1/3 flex justify-start">
                  {i > 0 ? (
                    <button
                      aria-label="前へ"
                      onClick={() => go(i - 1, -1)}
                      className="w-11 h-11 md:w-16 md:h-16 rounded-full bg-white/10 border border-white/20 backdrop-blur shadow-lg hover:bg-white/15 active:scale-95 flex items-center justify-center focus-visible:ring-2 ring-primary-400"
                    >
                      <ChevronLeft className="size-6 md:size-8" />
                    </button>
                  ) : (
                    <div className="w-11 h-11 md:w-16 md:h-16" />
                  )}
                </div>
                <div className="w-1/3" />
                <div className="w-1/3 flex justify-end">
                  {i < total - 1 ? (
                    <button
                      aria-label="次へ"
                      onClick={() => go(i + 1, 1)}
                      className="w-11 h-11 md:w-16 md:h-16 rounded-full bg-white/10 border border-white/20 backdrop-blur shadow-lg hover:bg-white/15 active:scale-95 flex items-center justify-center focus-visible:ring-2 ring-primary-400"
                    >
                      <ChevronRight className="size-6 md:size-8" />
                    </button>
                  ) : (
                    <div className="w-11 h-11 md:w-16 md:h-16" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* バナー: 既存 BannerSlot を使用可能 */}
        {/* <BannerSlot place="RULES" /> */}
      </div>
    </Screen>
  );
} 
