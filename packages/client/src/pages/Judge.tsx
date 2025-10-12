import Screen from "@/components/Screen";
import { useAppStore } from "@/state/store";
import { Avatar } from "@/components/ui/Avatar";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { send } from "@/net/ws";

export default function Judge() {
  const room = useAppStore((s) => s.room);
  const nav = useNavigate();
  
  // JUDGEフェーズで5秒経過したら強制的にRESULTへ遷移
  useEffect(() => {
    console.log("[Judge] JUDGEフェーズ開始、5秒後にRESULTへ遷移予定");
    const timer = setTimeout(() => {
      console.log("[Judge] 5秒経過、RESULTフェーズに強制遷移");
      
      // サーバー側にRESULTフェーズへの移行を通知
      send("phaseChange", { phase: "RESULT" });
      
      nav("/result");
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [nav]);
  
  // 公開された秘密を取得
  const secretText = room?.round?.secretText ?? "";
  
  // 投票結果を計算（「投票なし」を除外）
  const votes = room?.round?.votes as Record<string, string | "NONE"> | undefined;
  const voteCounts = new Map<string, number>();
  
  if (votes) {
    // 各プレイヤーへの投票数をカウント（「投票なし」は除外）
    Object.values(votes).forEach((targetId) => {
      if (targetId !== "NONE") {
        voteCounts.set(targetId, (voteCounts.get(targetId) || 0) + 1);
      }
    });
  }
  
  // 最多投票者を特定
  let maxVotes = 0;
  let topVotedIds: string[] = [];
  
  voteCounts.forEach((count, playerId) => {
    if (count > maxVotes) {
      maxVotes = count;
      topVotedIds = [playerId];
    } else if (count === maxVotes) {
      topVotedIds.push(playerId);
    }
  });
  
  const playersById = new Map((room?.players ?? []).map((p) => [p.id, p]));

  return (
    <Screen contentScrollable={false}>
      <div className="judge-ipad-scale h-screen overflow-hidden px-4 md:px-8 pt-4 md:pt-8 pb-[env(safe-area-inset-bottom)] flex flex-col items-center justify-center gap-8 md:gap-10">
        {/* 公開された秘密 */}
        <div className="w-full max-w-md md:max-w-2xl space-y-3 md:space-y-4">
          <div className="text-slate-200 text-[18px] md:text-2xl leading-6 md:leading-8 text-center">公開された秘密</div>
          <div className="p-4 md:p-6 rounded-2xl bg-white/5 ring-1 ring-white/10 min-h-[60px] md:min-h-[88px] flex items-center justify-center">
            <div className="text-center text-white/90 whitespace-pre-wrap break-words md:text-xl">
              {secretText || "…"}
            </div>
          </div>
        </div>
        
        {/* 最多投票者 */}
        <div className="w-full max-w-md md:max-w-2xl space-y-3 md:space-y-4">
          <div className="text-slate-200 text-[18px] md:text-2xl leading-6 md:leading-8 text-center">選ばれたプレイヤー</div>
          {topVotedIds.length === 0 || topVotedIds.length > 1 ? (
            <div className="p-4 md:p-6 rounded-2xl bg-white/5 ring-1 ring-white/10 text-center text-slate-300 md:text-xl">
              同票のため選択無効
            </div>
          ) : (
            <div className="p-4 md:p-6 rounded-2xl bg-white/5 ring-1 ring-white/10">
              <div className="flex items-center justify-center gap-3 md:gap-4">
                <Avatar iconId={playersById.get(topVotedIds[0])?.iconId ?? 1} size={60} />
                <div className="text-center">
                  <div className="text-sm md:text-base text-white/60 font-mono">{topVotedIds[0]}</div>
                  <div className="text-base md:text-2xl text-white font-medium">
                    {playersById.get(topVotedIds[0])?.nick ?? topVotedIds[0]}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* 判定は... */}
        <div className="text-slate-300 text-lg md:text-2xl text-center">判定は…</div>
      </div>
    </Screen>
  );
} 