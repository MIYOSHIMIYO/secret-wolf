import { useAppStore } from "@/state/store";
import { useNavigate } from "react-router-dom";
import { send } from "@/net/ws";
import Screen from "@/components/Screen";
import { PrimaryBtn, DangerBtn } from "@/components/Buttons";
import { Avatar } from "@/components/ui/Avatar";
import { useEffect, useState } from "react";

export default function Result() {
  const room = useAppStore((s) => s.room);
  const playersById = new Map((room?.players ?? []).map((p) => [p.id, p]));
  const nav = useNavigate();
  
  // アクティブユーザー数を計算（接続中のユーザー）
  const activePlayers = (room?.players ?? []).filter((p) => p.connected);
  
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rematchModalOpen, setRematchModalOpen] = useState(false);
  const [endGameModalOpen, setEndGameModalOpen] = useState(false);

  // モード判定
  const myId = useAppStore((s) => s.myId);
  const isHost = myId && room?.hostId === myId;

  // 公開された秘密を取得
  const secretText = room?.round?.secretText ?? "";
  const secretOwner = room?.round?.secretOwner ?? "";

  // 投票結果を計算（「投票なし」を除外）
  const votes = room?.round?.votes as Record<string, string | "NONE"> | undefined;
  const voteCounts = new Map<string, number>();
  let noneCount = 0;

  if (votes) {
    Object.values(votes).forEach((targetId) => {
      if (targetId === "NONE") {
        noneCount++;
      } else {
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
  
  // 正しい勝利判定：最多投票されたプレイヤーと公開された秘密の持ち主が一致していれば市民の勝利
  const isWolfWin = topVotedIds.length === 0 || topVotedIds.length > 1 || (topVotedIds.length === 1 && topVotedIds[0] !== secretOwner);
  const winnerText = isWolfWin ? "人狼の勝利" : "市民の勝利";
  const winnerClass = isWolfWin ? "bg-rose-500" : "bg-emerald-500";

  // デバッグ情報をコンソールに出力
  console.log("[Result] 結果判定デバッグ情報:", {
    secretText,
    secretOwner,
    votes,
    voteCounts: Object.fromEntries(voteCounts),
    noneCount,
    maxVotes,
    topVotedIds,
    topVotedIdsLength: topVotedIds.length,
    isWolfWin,
    winnerText,
    // 詳細な判定条件
    condition1: topVotedIds.length === 0,
    condition2: topVotedIds.length > 1,
    condition3: topVotedIds.length === 1 && topVotedIds[0] !== secretOwner,
    // 市民の勝利条件
    citizenWinCondition: topVotedIds.length === 1 && topVotedIds[0] === secretOwner,
    // 投票データの詳細分析
    votesEntries: votes ? Object.entries(votes) : [],
    votesValues: votes ? Object.values(votes) : [],
    votesKeys: votes ? Object.keys(votes) : [],
    // 型と値の詳細確認
    secretOwnerType: typeof secretOwner,
    secretOwnerValue: secretOwner,
    topVotedIdsType: typeof topVotedIds[0],
    topVotedIdsValue: topVotedIds[0],
    // 比較結果
    comparisonResult: topVotedIds[0] === secretOwner,
    strictComparisonResult: topVotedIds[0] === secretOwner
  });

  // WebSocketメッセージ処理（既存のイベントリスナーを使用）
  useEffect(() => {
    const handleWsMessage = (event: CustomEvent) => {
      const { t, p } = event.detail;
      
      if (t === "rematch") {
        // ホストがもう一度を選択
        console.debug("[Result] リマッチ選択を受信");
        // モーダルを表示
        setRematchModalOpen(true);
        // 3秒後にモード選択シーンに遷移
        setTimeout(() => {
          nav("/mode-select", { replace: true });
        }, 3000);
      }
      
      if (t === "endGame") {
        // ホストが終了を選択
        console.debug("[Result] ゲーム終了選択を受信");
        
        // 知らない誰かとの場合はモーダルを表示しない（5秒後の強制終了で処理される）
        if (!room?.isAutoRoom) {
          // 即座にモーダルを表示（サーバー側のabortメッセージで遷移）
          setEndGameModalOpen(true);
        }
      }
      
      if (t === "abort") {
        // App.tsxで統一的に処理されるため、ここでは何もしない
        console.debug("[Result] abortメッセージを受信（App.tsxで処理される）", { reason: p.reason });
      }
    };

    window.addEventListener("sw-msg", handleWsMessage as EventListener);
    return () => {
      window.removeEventListener("sw-msg", handleWsMessage as EventListener);
    };
  }, [nav]);

  // コンポーネントアンマウント時に状態をクリア
  useEffect(() => {
    // コンポーネントマウント時の状態リセット
    setConfirmOpen(false);
    
    return () => {
      setConfirmOpen(false);
    };
  }, []);

  return (
    <Screen bannerHeight={0} contentScrollable={true} fullBleed={true} maxWidth={9999}>
      <div className="result-ipad-scale min-h-screen px-4 md:px-8 pt-4 md:pt-8 pb-48 sm:pb-8 flex flex-col gap-2 md:gap-3">
        {/* ヘッダー（固定位置） */}
        <div className="relative mb-6 md:mb-8">
          <h1 className="text-3xl md:text-5xl font-bold text-white text-center">結果</h1>
        </div>
        
        {/* デスクトップ用レイアウト（xl以上のみ適用） */}
        <div className="hidden xl:flex flex-1 flex-col xl:flex-row xl:gap-6 xl:min-h-0">
          {/* 左カラム：結果情報 */}
          <div className="xl:w-[45%] flex flex-col gap-4">
            {/* 勝利表示 */}
            <div className="text-center">
              <div className={`${winnerClass} text-white inline-flex items-center px-8 py-4 rounded-full text-2xl font-semibold shadow-lg`}>
                {winnerText}
              </div>
            </div>
            
            {/* 秘密の持ち主の質問・回答 */}
            <div className="text-center">
              <div className="text-slate-300 text-2xl">
                {isWolfWin ? "誰の秘密だったのでしょう？" : `これは${playersById.get(topVotedIds[0])?.nick ?? topVotedIds[0]}の秘密でした`}
              </div>
            </div>
            
            {/* 公開された秘密（秘密の文） */}
            <div className="space-y-3">
              <div className="text-slate-200 text-2xl leading-8 text-center">「{secretText}」</div>
            </div>
            
            {/* ボタン群 */}
            <div className="pt-6">
              {/* 知り合いと遊ぶ（通常ルーム）の場合のみボタンを表示 */}
              {!room?.isAutoRoom && (
                isHost ? (
                  <div className="flex gap-4 justify-center">
                    <PrimaryBtn 
                      onClick={() => send("rematch", {})}
                      className="transition-all duration-200 h-14 text-xl px-8"
                    >
                      もう一度
                    </PrimaryBtn>
                    <DangerBtn onClick={() => setConfirmOpen(true)} className="h-14 text-xl px-8">終了</DangerBtn>
                  </div>
                ) : (
                  <div className="text-slate-300 text-center px-6 py-4 bg-slate-700/50 rounded-xl text-lg">
                    ホストの選択を待ってください
                  </div>
                )
              )}
              
              {/* 知らない誰かとの場合は7秒後に強制終了する旨を表示 */}
              {room?.isAutoRoom && (
                <div className="text-slate-300 text-center px-6 py-4 bg-slate-700/50 rounded-xl text-lg">
                  7秒後にメニューシーンに移行します
                </div>
              )}
            </div>
          </div>
          
          {/* 右カラム：投票結果詳細 */}
          <div className="xl:w-[55%] flex flex-col">
            {/* 投票結果タイトル */}
            <div className="mb-4">
              <div className="text-slate-200 text-2xl leading-8 text-center">投票結果</div>
            </div>
            
            {/* プレイヤー一覧（スクロール可能） */}
            <div className="flex-1 overflow-y-auto overscroll-contain rounded-2xl ring-1 ring-white/10 bg-white/5 p-4">
              <div className="space-y-4">
                {/* 各プレイヤーの投票数 */}
                {Array.from(voteCounts.entries()).map(([playerId, count]) => (
                  <div key={playerId} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-4">
                      <Avatar iconId={playersById.get(playerId)?.iconId ?? 1} size={48} />
                      <div className="text-xl text-white font-medium">{playersById.get(playerId)?.nick ?? playerId}</div>
                    </div>
                    <div className="text-slate-200 font-bold text-2xl">{count}票</div>
                  </div>
                ))}
                {/* 投票なし */}
                {noneCount > 0 && (
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <div className="text-xl text-white font-medium">投票なし</div>
                    <div className="text-slate-200 font-bold text-2xl">{noneCount}票</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* モバイル・タブレット用レイアウト（xl未満） */}
        <div className="xl:hidden flex-1 flex flex-col gap-2 md:gap-3">
          {/* 勝利表示（固定位置） */}
          <div className="text-center mb-6 md:mb-8">
            <div className={`${winnerClass} text-white inline-flex items-center px-6 md:px-8 py-3 md:py-4 rounded-full text-lg md:text-2xl font-semibold shadow-lg`}>
              {winnerText}
            </div>
          </div>
          
          {/* 秘密の持ち主の質問・回答 */}
          <div className="text-center mb-4 md:mb-6">
            <div className="text-slate-300 text-lg md:text-2xl">
              {isWolfWin ? "誰の秘密だったのでしょう？" : `これは${playersById.get(topVotedIds[0])?.nick ?? topVotedIds[0]}の秘密でした`}
            </div>
          </div>
          
          {/* 公開された秘密（秘密の文） */}
          <div className="w-full max-w-md md:max-w-2xl mx-auto space-y-2 md:space-y-3 mb-6 md:mb-8">
            <div className="text-slate-200 text-[18px] md:text-2xl leading-6 md:leading-8 text-center">「{secretText}」</div>
          </div>
          
          {/* 投票結果タイトル（固定位置） */}
          <div className="w-full max-w-md md:max-w-2xl mx-auto mb-2 md:mb-3">
            <div className="text-slate-200 text-[18px] md:text-2xl leading-6 md:leading-8 text-center">投票結果</div>
          </div>
          
          {/* プレイヤー一覧（固定高さ・スクロール可能） */}
          <div className="w-full max-w-md md:max-w-xl mx-auto mb-3 md:mb-6">
            {/* iPad でも下にはみ出さない高さ（固定） */}
            <div className="max-h-[52vh] overflow-y-auto overscroll-contain rounded-2xl ring-1 ring-white/10 bg-white/5 p-3 md:p-4">
              <div className="space-y-3 md:space-y-4">
                {/* 各プレイヤーの投票数 */}
                {Array.from(voteCounts.entries()).map(([playerId, count]) => (
                  <div key={playerId} className="flex items-center justify-between p-3 md:p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-3 md:gap-4">
                      <Avatar iconId={playersById.get(playerId)?.iconId ?? 1} size={44} />
                      <div className="text-base md:text-xl text-white font-medium">{playersById.get(playerId)?.nick ?? playerId}</div>
                    </div>
                    <div className="text-slate-200 font-bold text-lg md:text-2xl">{count}票</div>
                  </div>
                ))}
                {/* 投票なし */}
                {noneCount > 0 && (
                  <div className="flex items-center justify-between p-3 md:p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <div className="text-base md:text-xl text-white font-medium">投票なし</div>
                    <div className="text-slate-200 font-bold text-lg md:text-2xl">{noneCount}票</div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* ボタン群（固定位置） */}
          <div className="mt-8 md:mt-10 flex gap-3 md:gap-4 justify-center pb-40 sm:pb-6">
            {/* 知り合いと遊ぶ（通常ルーム）の場合のみボタンを表示 */}
            {!room?.isAutoRoom && (
              isHost ? (
                <>
                  <PrimaryBtn 
                    onClick={() => send("rematch", {})}
                    className="transition-all duration-200 md:h-14 md:text-xl"
                  >
                    もう一度
                  </PrimaryBtn>
                  <DangerBtn onClick={() => setConfirmOpen(true)} className="md:h-14 md:text-xl">終了</DangerBtn>
                </>
              ) : (
                <div className="text-slate-300 text-center px-6 py-3 bg-slate-700/50 rounded-xl">
                  ホストの選択を待ってください
                </div>
              )
            )}
            
            {/* 知らない誰かとの場合は7秒後に強制終了する旨を表示 */}
            {room?.isAutoRoom && (
              <div className="text-slate-300 text-center px-6 py-3 bg-slate-700/50 rounded-xl">
                7秒後にメニューシーンに移行します
              </div>
            )}
          </div>
        </div>
        
        {/* 終了確認モーダル */}
        {confirmOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-2xl p-6 max-w-sm mx-4 ring-1 ring-white/10 shadow-2xl">
              <div className="text-center space-y-4">
                <div className="text-white text-lg font-medium">本当に終了しますか？</div>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => {
                      send("endGame", {});
                      setConfirmOpen(false);
                    }}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors"
                  >
                    はい
                  </button>
                  <button
                    onClick={() => setConfirmOpen(false)}
                    className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-xl font-semibold transition-colors"
                  >
                    閉じる
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* リマッチ選択モーダル */}
        {rematchModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-2xl p-6 max-w-sm mx-4 ring-1 ring-white/10 shadow-2xl">
              <div className="text-center space-y-4">
                <div className="text-white text-lg font-medium">もう一度が選択されました</div>
                <div className="text-slate-300 text-sm">モード選択シーンに移行します...</div>
              </div>
            </div>
          </div>
        )}

        {/* ゲーム終了モーダル */}
        {endGameModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-2xl p-6 max-w-sm mx-4 ring-1 ring-white/10 shadow-2xl">
              <div className="text-center space-y-4">
                <div className="text-white text-lg font-medium">ゲーム終了が選択されました</div>
                <div className="text-slate-300 text-sm">メニューシーンに移行します...</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Screen>
  );
} 