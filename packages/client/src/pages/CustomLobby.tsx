import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { send, getConnectionDebugInfo, createMessageListener, forceDisconnect } from "@/net/ws-manager";
import { useAppStore } from "@/state/store";
import { Avatar } from "@/components/ui/Avatar";
import Screen from "@/components/Screen";
import HeaderBar from "@/components/HeaderBar";
import Panel from "@/components/Panel";
import { PrimaryBtn, SecondaryBtn, DangerBtn } from "@/components/Buttons";
import CopyButton from "@/components/CopyButton";
import FadeSlide from "@/components/FadeSlide";
import Modal from "@/components/Modal";
import { ROOM_CAPACITY } from "@secret/shared/src/constants";
import { showToast } from "@/lib/toast";
import { DEBUG_CONFIG } from "@/lib/config";

export default function CustomLobby() {
  const { id } = useParams();
  const nav = useNavigate();
  const room = useAppStore((s) => s.room);
  const myId = useAppStore((s) => s.myId);
  const reset = useAppStore((s) => s.reset);
  const isCustomMode = useAppStore((s) => s.isCustomMode); // フロントエンド側のカスタムモードフラグを使用

  const [disbandOpen, setDisbandOpen] = useState(false);
  
  // デバッグ用：カスタムモード判定の確認
  useEffect(() => {
    console.log("[CustomLobby] カスタムモード判定詳細:", {
      room: room,
      isCustomMode: isCustomMode,
      isAutoRoom: room?.isAutoRoom,
      isCustomModeFlag: room?.isCustomMode,
      roomState: room ? JSON.stringify(room, null, 2) : "null"
    });
  }, [room, isCustomMode]);

  // デバッグ用：接続状態の表示（開発時のみ）
  useEffect(() => {
    const interval = setInterval(() => {
      const debugInfo = getConnectionDebugInfo();
      console.log(`[CustomLobby] WebSocket接続状態:`, debugInfo);
    }, 5000); // 5秒ごとにログ出力
    return () => clearInterval(interval);
  }, []);

  // WebSocketメッセージ処理
  useEffect(() => {
    const handleWsMessage = (message: any) => {
      const { t, p } = message;
      
      if (t === "disband") {
        console.log("[CustomLobby] 解散メッセージ受信:", p);
        setDisbandOpen(true);
      }
      
      if (t === "abort") {
        console.log("[CustomLobby] 中断メッセージ受信:", p);
        // ゲーム中断時の処理
        nav("/menu", { replace: true });
      }
      
      if (t === "customTopicCreation") {
        console.log("[CustomLobby] お題作成シーン遷移メッセージ受信:", p);
        console.log("[CustomLobby] お題作成シーンへ遷移します");
        // お題作成シーンに遷移
        nav("/custom", { replace: true });
      }
    };

    const cleanup = createMessageListener(handleWsMessage);
    return cleanup;
  }, [nav]);

  // ルームIDが変更された場合の処理
  useEffect(() => {
    if (!id || !room) return;
    
    // ルームIDが一致しない場合はメニューに戻る
    if (room.roomId !== id) {
      console.warn("[CustomLobby] ルームID不一致:", { expected: id, actual: room.roomId });
      nav("/menu", { replace: true });
    }
  }, [id, room, nav]);

  const players = room?.players ?? [];
  const capacity = ROOM_CAPACITY;
  const hostActive = room?.phase === "LOBBY" && room?.hostId != null;
  const isHost = hostActive && !!myId && !!room?.hostId && myId === room.hostId;
  const placeholders = useMemo(() => Math.max(0, capacity - players.length), [players.length]);
  const canStart = players.length >= 3;

  const leave = () => { 
    console.log("[CustomLobby] ルームから退出します");
    send("leave", {}); 
    // 状態をリセットしてからメニューに遷移
    reset();
    nav("/menu", { replace: true }); 
  };
  
  // 解散通知を受けた後のOK（サーバーは既に解散処理中）
  // サーバーに追加のleaveを送らず、静かに切断→メニューへ
  const ackDisband = () => {
    console.log("[CustomLobby] 解散OK、静かに切断してメニューへ戻ります");
    try { forceDisconnect(); } catch {}
    reset();
    nav("/menu", { replace: true });
  };
  
  const [confirmOpen, setConfirmOpen] = useState(false);
  const disband = () => {
    console.log("[CustomLobby] 解散確認モーダルを表示");
    setConfirmOpen(true);
  };
  
  const confirmYes = () => { 
    console.log("[CustomLobby] ルームを解散します");
    console.log("[CustomLobby] WebSocket接続状態:", getConnectionDebugInfo());
    setConfirmOpen(false); 
    const result = send("disband", {}); 
    console.log("[CustomLobby] 解散メッセージ送信結果:", result);
  };
  const confirmNo = () => setConfirmOpen(false);
  
  // コピー成功時の処理
  const handleCopySuccess = () => {
    showToast("コピーしました", "info");
  };

  const bannerH = 56;
  const disabled = disbandOpen;

  // デバッグ用ログを削除

  return (
    <Screen bannerHeight={bannerH} contentScrollable={false}>
      <div
        className="lobby-ipad-scale px-4"
        style={{ height: `calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - ${bannerH}px)` }}
      >
        <div className="h-full flex flex-col">
          <HeaderBar title="カスタムモード - ルーム待機" center />

          <FadeSlide>
            <Panel className="p-4 sm:p-5 md:p-7 lg:p-8 space-y-3 md:space-y-4">
              <div className="flex items-center gap-3">
                <div className="text-slate-300">ルームID</div>
                <div className="px-3 py-1 rounded-lg bg-white/10 border border-white/20 text-slate-50 font-mono text-lg tracking-[0.15em]">
                  {id}
                </div>
                <CopyButton text={id ?? ""} onCopySuccess={handleCopySuccess} />
              </div>
              <div className="flex items-center justify-between text-sm text-slate-300">
                <div>参加者 <span className="font-semibold text-slate-100">{players.length}</span> / {capacity}</div>
                {isHost && <div className="text-slate-400">3人以上で開始できます</div>}
              </div>

              <div className="rounded-xl bg-black/20 border border-white/10 p-2 md:p-3 h-72 md:h-[24rem] lg:h-[26rem] overflow-y-auto">
                <div className="flex flex-col gap-2 md:gap-3">
                  {players.map((p) => (
                    <div key={p.id} className="h-16 md:h-20 lg:h-20 px-3 md:px-4 rounded-xl bg-black/30 border border-white/10 flex items-center gap-3 md:gap-4">
                      <Avatar iconId={p.iconId} size={56} />
                      <div className="min-w-0 flex-1">
                        <div className="text-base md:text-xl text-white leading-tight break-words">
                          {p.nick}
                          {room?.hostId === p.id && (
                            <span className="ml-2 text-indigo-400 font-semibold">・ホスト</span>
                          )}
                        </div>
                        <div className="text-xs md:text-sm text-white/40 font-mono break-all">{p.id}</div>
                      </div>
                    </div>
                  ))}
                  {Array.from({ length: placeholders }).map((_, i) => (
                    <div key={`ph-${i}`} className="h-16 md:h-20 lg:h-20 px-3 md:px-4 rounded-xl border border-dashed border-white/15 bg-white/5 flex items-center gap-3 md:gap-4 opacity-70">
                      <div className="rounded-full bg-white/10 border border-white/10" style={{ width: 56, height: 56 }} />
                      <div className="text-sm md:text-base text-white/40">空きスロット</div>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          </FadeSlide>

          <FadeSlide delay={0.05}>
            {hostActive ? (
              isHost ? (
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex-1">
                    <PrimaryBtn 
                      className="w-full" 
                      onClick={() => {
                        console.log("[CustomLobby] お題作成へボタンクリック");
                        console.log("[CustomLobby] disabled:", disabled, "canStart:", canStart);
                        console.log("[CustomLobby] isHost:", isHost, "hostActive:", hostActive);
                        
                        if (disabled || !canStart) {
                          console.log("[CustomLobby] ボタンが無効化されています");
                          return;
                        }
                        
                        // カスタムモードの場合はstartCustomGameメッセージを送信
                        console.log("[CustomLobby] startCustomGameメッセージを送信");
                        console.log("[CustomLobby] 送信するメッセージ:", { t: "startCustomGame", p: {} });
                        const result = send("startCustomGame", {});
                        console.log("[CustomLobby] send結果:", result);
                        
                        // WebSocketの状態を確認
                        const debugInfo = getConnectionDebugInfo();
                        console.log("[CustomLobby] 送信時のWebSocket状態:", debugInfo);
                      }} 
                      disabled={disabled || !canStart}
                    >
                      お題作成へ
                    </PrimaryBtn>
                  </div>
                  <div className="flex-1">
                    <DangerBtn 
                      onClick={() => {
                        console.log("[CustomLobby] 解散ボタンクリック");
                        disband();
                      }} 
                      disabled={disabled}
                    >
                      解散
                    </DangerBtn>
                  </div>
                </div>
              ) : (
                <div className="mt-2">
                  <SecondaryBtn onClick={leave} disabled={disabled} className="w-full">戻る</SecondaryBtn>
                </div>
              )
            ) : (
              <div className="mt-2">
                <SecondaryBtn onClick={leave} disabled={disabled} className="w-full">戻る</SecondaryBtn>
              </div>
            )}
          </FadeSlide>

          <Modal open={disbandOpen} onClose={()=>{}} closable={false} title="ルームが解散されました">
            <div className="space-y-4">
              <p>ホストがルームを解散しました。</p>
              <div className="flex justify-end">
                <PrimaryBtn onClick={ackDisband}>OK</PrimaryBtn>
              </div>
            </div>
          </Modal>

          <Modal open={confirmOpen} onClose={confirmNo} closable title="ルームを解散しますか？">
            <div className="space-y-4">
              <p>この操作は取り消せません。</p>
              <div className="flex justify-end gap-2">
                <SecondaryBtn onClick={() => {
                  console.log("[CustomLobby] 解散キャンセル");
                  confirmNo();
                }}>いいえ</SecondaryBtn>
                <DangerBtn onClick={() => {
                  console.log("[CustomLobby] 解散確認");
                  confirmYes();
                }}>はい</DangerBtn>
              </div>
            </div>
          </Modal>
        </div>
      </div>
    </Screen>
  );
}