import { useEffect, useMemo, useRef, useState } from "react";

type Props = { endsAt: number; label?: string; size?: number };

export default function TimerCircle({ endsAt, label = "", size = 64 }: Props) {
  const [now, setNow] = useState(Date.now());
  const startAtRef = useRef<number>(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // endsAtが変更された時のみstartAtRefを更新
  useEffect(() => {
    startAtRef.current = Date.now();
  }, [endsAt]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, []); // 一度だけ実行

  const { sec, pct } = useMemo(() => {
    const remainMs = Math.max(0, endsAt - now);
    const sec = Math.ceil(remainMs / 1000);
    const total = Math.max(1000, endsAt - startAtRef.current);
    const pct = 1 - Math.min(1, remainMs / total);
    return { sec, pct };
  }, [endsAt, now]);

  const deg = Math.round(pct * 360);
  const style = {
    background: `conic-gradient(rgb(139 92 246) ${deg}deg, rgba(255,255,255,0.08) 0deg)`,
    width: size,
    height: size,
  } as React.CSSProperties;

  return (
    <div className="flex flex-col items-center gap-1">
      {label && <div className="text-[12px] leading-4 text-white/70">{label}</div>}
      <div className="rounded-full p-[3px]" style={style}>
        <div className="w-full h-full rounded-full bg-black/80 border border-white/10 flex items-center justify-center">
          <div className="text-sm">{sec}s</div>
        </div>
      </div>
    </div>
  );
} 