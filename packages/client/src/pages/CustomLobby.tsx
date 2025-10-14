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

  const [disbandOpen, setDisbandOpen] = useState(false);

  // デバッグ用：接続状態の表示（開発時のみ）
  useEffect(() => {
    if (!DEBUG_CONFIG.ENABLED) return;
    const interval = setInterval(() => {
      const debugInfo = getConnectionDebugInfo();
      console.log(`[CustomLobby] WebSocket接続状態:`, debugInfo);
    }, 10000);
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
    };

    const cleanup = createMessageListener(handleWsMessage);
    return cleanup;
  }, [nav]);

  // プレイヤー情報の計算
  const players = room?.players || [];
  const capacity = ROOM_CAPACITY;
  const isHost = myId && room?.hostId === myId;
  const hostActive = room?.players?.find((p: any) => p.id === room?.hostId)?.connected;
  const onlineCount = players.filter((p: any) => p.connected).length;
  const canStart = onlineCount >= 3;

  // ボタンの無効化状態
  const disabled = isHost ? false : true;

  // コピー成功時の処理
  const handleCopySuccess = () => {
    showToast("ルームIDをコピーしました", "success");
  };

  // 解散処理
  const disband = () => {
    if (!isHost) return;
    send("disband", {});
  };

  // 退出処理
  const leave = () => {
    send("leave", {});
    forceDisconnect();
    reset();
    nav("/menu", { replace: true });
  };

  const bannerH = 0;

  return (
    <Screen
      bannerHeight={bannerH}
      contentScrollable={false}
      maxWidth={1200}
      innerClassName="xl:px-12"
    >
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
                <div className="flex-1 bg-slate-800 px-3 py-2 rounded-lg text-white font-mono text-sm md:text-lg">
                  {id}
                </div>
                <CopyButton text={id ?? ""} onCopySuccess={handleCopySuccess} />
              </div>
              <div className="flex items-center justify-between text-sm text-slate-300">
                <div>参加者 <span className="font-semibold text-slate-100">{players.length}</span> / {capacity}</div>
                {isHost && <div className="text-slate-400">3人以上でお題作成できます</div>}
              </div>

              <div className="rounded-xl bg-black/20 border border-white/10 p-2 md:p-3 h-72 md:h-[24rem] lg:h-[26rem] overflow-y-auto">
                <div className="flex flex-col gap-2 md:gap-3">
                  {players.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 p-2 md:p-3 rounded-lg bg-slate-700/50">
                      <Avatar iconId={p.iconId} size="sm" />
                      <div className="flex-1">
                        <div className="text-white font-medium text-sm md:text-lg">{p.nick}</div>
                        <div className="text-slate-400 text-xs md:text-sm">
                          {p.id === room?.hostId ? "ホスト" : "参加者"}
                        </div>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${p.connected ? "bg-green-400" : "bg-red-400"}`} />
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
                      onClick={() => nav("/custom")} 
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

          <Modal open={disbandOpen} onClose={()=>{}} closable={false}
            className="bg-slate-800 rounded-2xl p-6 max-w-sm mx-4 ring-1 ring-white/10 shadow-2xl">
            <div className="text-center space-y-4">
              <div className="text-white text-lg font-medium">ルームが解散されました</div>
              <div className="text-slate-300 text-sm">メニューに戻ります...</div>
            </div>
          </Modal>
        </div>
      </div>
    </Screen>
  );
}
