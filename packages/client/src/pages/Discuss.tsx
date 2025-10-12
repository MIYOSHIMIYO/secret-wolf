import { useAppStore } from "@/state/store";
import TimerCircle from "@/components/TimerCircle";
import { send } from "@/net/ws";
import { useEffect, useMemo, useRef, useState } from "react";
import Screen from "@/components/Screen";
import HeaderBar from "@/components/HeaderBar";
import useKeyboardVisible from "@/components/useKeyboardVisible";
import { useReportStore } from "@/state/reportStore";
import ReportModal from "@/components/ReportModal";

import { Avatar } from "@/components/ui/Avatar";
import { DangerBtn } from "@/components/Buttons";

type Chat = { id: string; senderId: string; nick: string; iconId: number; text: string; ts: number; shadow?: boolean };

// 8人最大を想定した重複なしのパレット
const PLAYER_COLORS = [
  "#60A5FA", // blue-400
  "#34D399", // emerald-400
  "#FBBF24", // amber-400
  "#F87171", // rose-400
  "#A78BFA", // violet-400
  "#22D3EE", // cyan-400
  "#F472B6", // pink-400
  "#4ADE80", // green-400
];

export default function Discuss() {
  const room = useAppStore((s) => s.room);
  const myId = useAppStore((s) => s.myId);
  const endsAt = useAppStore((s) => s.endsAt);
  const secret = (room as any)?.round?.secretText ?? room?.round?.revealedText ?? "";

  const [chats, setChats] = useState<Chat[]>([]);
  const [draft, setDraft] = useState("");
  const [voted, setVoted] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const kb = useKeyboardVisible();
  const [isMdUp, setIsMdUp] = useState(false);

  // 通報関連の状態
  const [reportModal, setReportModal] = useState<{
    isOpen: boolean;
    targetPlayerId: string;
    targetNick: string;
    messageId?: string;
  }>({
    isOpen: false,
    targetPlayerId: "",
    targetNick: "",
  });

  const { canReport } = useReportStore();

  // プレイヤー順に色を割り当て（重複なし）
  const playerColorMap = useMemo(() => {
    const map = new Map<string, string>();
    const players = (room?.players ?? []) as Array<{ id: string }>;
    players.forEach((p, idx) => map.set(p.id, PLAYER_COLORS[idx % PLAYER_COLORS.length]));
    return map;
  }, [room?.players]);

  // ラウンド変更時の状態リセット
  useEffect(() => {
    setChats([]);
    setDraft("");
    setVoted(false);
  }, [room?.roundId]);

  useEffect(() => { send("discussReady", {}); }, []);

  // iPad相当の判定（md以上）
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => setIsMdUp(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    function onMsg(ev: any) {
      const m = ev.detail;
      if (m?.t === "chat") setChats((cs) => [...cs, m.p]);
      if (m?.t === "reportAck") {
        // 通報成功時の処理
        console.log("[Discuss] 通報成功");
      }
    }
    window.addEventListener("sw-msg", onMsg as any);
    return () => window.removeEventListener("sw-msg", onMsg as any);
  }, []);

  // 自動スクロール（ユーザーが下付近のときのみ追従）
  const [userPinned, setUserPinned] = useState(false);
  useEffect(() => {
    const el = listRef.current; if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (!userPinned || nearBottom) { el.scrollTop = el.scrollHeight; setUserPinned(false); }
  }, [chats.length, userPinned]);

  // 通報ハンドラー
  const handleReport = (targetPlayerId: string, targetNick: string, messageId?: string) => {
    if (targetPlayerId === myId) return; // 自己通報不可
    
    if (!canReport(targetPlayerId)) {
      // 既に通報済みの場合
      return;
    }
    
    setReportModal({
      isOpen: true,
      targetPlayerId,
      targetNick,
      messageId,
    });
  };

  // 長押しハンドラー（シンプルな実装）
  const createLongPressHandler = (targetPlayerId: string, targetNick: string, messageId?: string) => {
    let longPressTimer: NodeJS.Timeout | null = null;
    
    const startLongPress = () => {
      longPressTimer = setTimeout(() => {
        handleReport(targetPlayerId, targetNick, messageId);
      }, 500);
    };
    
    const cancelLongPress = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };
    
    return {
      onMouseDown: startLongPress,
      onMouseUp: cancelLongPress,
      onMouseLeave: cancelLongPress,
      onTouchStart: startLongPress,
      onTouchEnd: cancelLongPress,
      onTouchCancel: cancelLongPress,
    };
  };

  const haveServer = (room as any)?.round?.discuss?.votesToEnd ? Object.keys((room as any).round.discuss.votesToEnd).length : 0;
  const votesToEndIds = (room as any)?.round?.discuss?.votesToEnd ? Object.keys((room as any).round.discuss.votesToEnd) : [];
  const haveDisplay = Math.max(haveServer, voted && myId ? new Set([...votesToEndIds, myId]).size : haveServer);

  return (
    <Screen bannerHeight={0} contentScrollable={false} fullBleed={true} maxWidth={9999}>
      <div
        className="h-full overflow-hidden px-4 md:px-8 lg:px-2 pt-4 md:pt-8 lg:pt-1 flex flex-col gap-2 md:gap-3 lg:gap-1"
      >
        {/* 見出し＋タイマー（中央配置）- 10% */}
        <div className="relative lg:h-[8vh] lg:min-h-[60px] lg:max-h-[80px] lg:mb-4">
          <HeaderBar title="議論" center />
          <div className="absolute right-0 top-0"><TimerCircle endsAt={endsAt} size={isMdUp ? 88 : 64} /></div>
        </div>

        {/* デスクトップ用レイアウト（xl以上のみ適用） */}
        <div className="hidden xl:flex flex-1 flex-col xl:flex-row xl:gap-2 xl:min-h-0 xl:mt-8">
          {/* 左カラム：公開された秘密 + 進捗表示 + 議論終了ボタン（約20%） */}
          <div className="xl:w-[20%] xl:flex-shrink-0 xl:flex-col xl:gap-2">
            {/* 公開された秘密（コンパクト - 縦長にしない） */}
            <div className="rounded-xl bg-white/5 ring-1 ring-white/10 p-3">
              <p className="text-sm text-white/60 mb-2">公開された秘密</p>
              <div className="px-3 py-2 rounded-lg bg-white/10 text-sm leading-tight text-white/90">
                {secret || "…"}
              </div>
            </div>

            {/* 進捗表示 + 議論終了ボタン（コンパクト） */}
            <div className="flex flex-col gap-2">
              <div className="text-center text-white/60 text-sm">
                過半数が押すか制限時間で自動終了 ({haveDisplay}/{Math.ceil((room?.players?.length ?? 0) / 2)})
              </div>
              {!voted && (
                <DangerBtn
                  onClick={() => {
                    send("endDiscuss", {});
                    setVoted(true);
                  }}
                  className="px-4 py-2 text-sm w-full"
                >
                  議論終了
                </DangerBtn>
              )}
            </div>
          </div>

          {/* 右カラム：チャットエリア + 入力欄（約80%） */}
          <div className="flex-1 flex flex-col xl:min-h-0 xl:gap-2 xl:pb-2">
            {/* チャット（縦幅を小さくし、トップ位置を下げる） */}
            <section className="overflow-hidden flex flex-col min-h-0" style={{ height: "calc(100vh - 200px)" }}>
              <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain rounded-xl ring-1 ring-white/10 bg-white/5 p-3 space-y-2">
                {chats.map((c) => {
                  const isMine = c.senderId === myId;
                  const color = playerColorMap.get(c.senderId) ?? PLAYER_COLORS[0];
                  const longPressHandlers = createLongPressHandler(c.senderId, c.nick, c.id);
                  
                  return (
                    <div 
                      key={c.id} 
                      className={`${isMine ? "ml-8" : "mr-8"} w-auto rounded-xl px-3 py-2 bg-black/30 cursor-pointer select-none max-w-[90%]`} 
                      style={{ border: `2px solid ${color}` }}
                      {...longPressHandlers}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar iconId={c.iconId} size={20} />
                        <span className="text-sm text-white/70">{c.nick}</span>
                      </div>
                      <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">{c.text}</div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 入力行（チャット入力欄＋送信ボタン - 縦幅を広げる） */}
            <div className="grid grid-cols-[1fr,auto] gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="メッセージを入力..."
                className="px-4 py-3 rounded-lg bg-black/40 border border-white/10 text-white placeholder:text-white/40 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                maxLength={120}
              />
              <button
                onClick={() => {
                  if (draft.trim()) {
                    send("chat", { text: draft.trim() });
                    setDraft("");
                  }
                }}
                disabled={!draft.trim()}
                className="px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white font-semibold transition-colors text-sm"
              >
                送信
              </button>
            </div>
          </div>
        </div>

        {/* モバイル・タブレット用レイアウト（xl未満） */}
        <div className="xl:hidden flex-1 flex flex-col gap-2 md:gap-3 pb-20 sm:pb-8">
          {/* 公開された秘密（モバイル・タブレット用） */}
          <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-3 md:p-6 flex-shrink-0">
            <p className="text-[12px] md:text-lg leading-5 text-white/60 mb-1 md:mb-2">公開された秘密</p>
            <div className="px-3 md:px-5 py-2 md:py-3 rounded-lg bg-white/10 text-[13px] md:text-xl leading-tight text-white/90 whitespace-nowrap">
              {secret || "…"}
            </div>
          </div>

          {/* チャット要素（メッセージ + 入力欄） */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* チャットメッセージ表示エリア（スマホサイズでは短く、タブレット以上では通常サイズ） */}
            <div ref={listRef} className="overflow-y-auto overscroll-contain rounded-2xl ring-1 ring-white/10 bg-white/5 p-3 space-y-2 flex-shrink-0" style={{ height: "clamp(200px, 40vh, 600px)" }}>
              {chats.map((c) => {
                const isMine = c.senderId === myId;
                const color = playerColorMap.get(c.senderId) ?? PLAYER_COLORS[0];
                const longPressHandlers = createLongPressHandler(c.senderId, c.nick, c.id);
                
                return (
                  <div 
                    key={c.id} 
                    className={`${isMine ? "ml-8" : "mr-8"} w-auto rounded-2xl px-3 py-2 bg-black/30 cursor-pointer select-none max-w-[85%]`} 
                    style={{ border: `2px solid ${color}` }}
                    {...longPressHandlers}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Avatar iconId={c.iconId} size={20} />
                      <span className="text-sm text-white/70">{c.nick}</span>
                    </div>
                    <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">{c.text}</div>
                  </div>
                );
              })}
            </div>

            {/* メッセージ入力欄（縦幅を大きく） */}
            <div className="grid grid-cols-[1fr,auto] gap-2 mt-2 flex-shrink-0">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="メッセージを入力..."
                className="px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-white/40 focus:ring-2 focus:ring-indigo-500 outline-none text-base"
                maxLength={120}
              />
              <button
                onClick={() => {
                  if (draft.trim()) {
                    send("chat", { text: draft.trim() });
                    setDraft("");
                  }
                }}
                disabled={!draft.trim()}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white font-semibold transition-colors text-base"
              >
                送信
              </button>
            </div>

            {/* 進捗表示（モバイル・タブレット用） */}
            <div className="text-center text-white/60 text-sm md:text-lg flex-shrink-0 mt-2">
              過半数が押すか制限時間で自動終了 ({haveDisplay}/{Math.ceil((room?.players?.length ?? 0) / 2)})
            </div>

            {/* 議論終了ボタン（モバイル・タブレット用） */}
            {!voted && (
              <div className="flex justify-center flex-shrink-0 mt-1">
                <DangerBtn
                  onClick={() => {
                    send("endDiscuss", {});
                    setVoted(true);
                  }}
                  className="px-6 md:px-10 py-3 md:py-4 text-base md:text-xl"
                >
                  議論終了
                </DangerBtn>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 通報モーダル */}
      <ReportModal
        isOpen={reportModal.isOpen}
        onClose={() => setReportModal(prev => ({ ...prev, isOpen: false }))}
        targetPlayerId={reportModal.targetPlayerId}
        targetNick={reportModal.targetNick}
        messageId={reportModal.messageId}
      />
    </Screen>
  );
} 