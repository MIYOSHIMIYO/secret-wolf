import { useAppStore } from "@/state/store";
import TimerCircle from "@/components/TimerCircle";
import { send } from "@/net/ws";
import { useEffect, useState } from "react";
import Screen from "@/components/Screen";
import { Avatar } from "@/components/ui/Avatar";
import { PrimaryBtn } from "@/components/Buttons";

export default function Vote() {
  const room = useAppStore((s) => s.room);
  const myId = useAppStore((s) => s.myId);
  const playersAll = room?.players ?? [];
  const players = playersAll.filter((p) => p.id !== myId).slice(0, 7); // 最大7人
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setSelectedId(null);
    setSubmitted(false);
  }, [room?.roundId, room?.phase]);

  // タイマー監視とフェーズ遷移
  useEffect(() => {
    if (!room?.endsAt) return;
    
    const checkTimer = () => {
      const now = Date.now();
      if (now >= room.endsAt && !submitted) {
        // タイマー終了時、まだ投票していない場合は「投票なし」を送信
        if (!submitted) {
          send("vote", { targetId: "NONE" });
          setSubmitted(true);
        }
        // サーバー側でgoJudge()が呼ばれ、phase:"JUDGE"が送信される
        console.log("Vote timer expired, auto-submitting NONE vote");
      }
    };

    const interval = setInterval(checkTimer, 100);
    return () => clearInterval(interval);
  }, [room?.endsAt, submitted]);

  const myVoteTarget = (() => {
    const votes = room?.round?.votes as Record<string, string | "NONE"> | undefined;
    if (!votes || !myId) return null;
    const v = votes[myId];
    return typeof v === "string" && v !== "NONE" ? v : null;
  })();

  function onSelect(targetId: string) {
    if (submitted) return;
    setSelectedId(targetId === selectedId ? null : targetId);
  }

  function onSubmit() {
    if (!selectedId || submitted) return;
    setSubmitted(true);
    send("vote", { targetId: selectedId });
  }

  // サーバーから送られてくる正確なタイマー値を使用
  const voteEndsAt = room?.endsAt || Date.now() + 10000;

  return (
    <Screen contentScrollable={false}>
      <div className="vote-ipad-scale h-screen overflow-hidden px-4 md:px-8 pt-4 md:pt-8 pb-[env(safe-area-inset-bottom)] flex flex-col gap-4 md:gap-6">
        {/* タイトル＋タイマー（中央配置） */}
        <div className="relative">
          <h1 className="text-3xl font-bold text-center">投票</h1>
          <div className="absolute right-0 top-0">
            <TimerCircle endsAt={voteEndsAt} />
          </div>
        </div>

        {/* 候補リスト（固定サイズ・スクロール可能） */}
        <div className="space-y-3 md:space-y-4">
          <div className="text-slate-200 text-[18px] md:text-2xl leading-6 md:leading-8">候補</div>
          <div className="h-[calc(100vh-400px)] md:h-[calc(100vh-520px)] overflow-y-auto overscroll-contain rounded-2xl ring-1 ring-white/10 bg-white/5 p-3 md:p-4">
            <div className="space-y-3 md:space-y-4">
              {players.map((p) => (
                <button
                  key={p.id}
                  className={`w-full px-4 md:px-5 py-4 md:py-5 rounded-2xl bg-white/5 border border-white/10 text-left hover:bg-primary-400/10 transition-all ${
                    selectedId === p.id ? "ring-2 ring-primary-400 bg-primary-400/20" : ""
                  } ${submitted ? "opacity-60 cursor-not-allowed" : ""}`}
                  disabled={submitted}
                  onClick={() => onSelect(p.id)}
                >
                  <div className="flex items-center gap-3 md:gap-4">
                    <Avatar iconId={p.iconId} size={52} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm md:text-base text-white/60 font-mono truncate">{p.id}</div>
                      <div className="text-base md:text-xl text-white font-medium truncate">{p.nick}</div>
                    </div>
                    {selectedId === p.id && (
                      <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-primary-400 flex items-center justify-center">
                        <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-white"></div>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 決定ボタン */}
        <div className="pb-4 md:pb-6">
          <PrimaryBtn
            onClick={onSubmit}
            disabled={!selectedId || submitted}
            className="w-full md:h-14 md:text-xl"
          >
            {submitted ? "投票完了" : "決定"}
          </PrimaryBtn>
        </div>
      </div>
    </Screen>
  );
} 