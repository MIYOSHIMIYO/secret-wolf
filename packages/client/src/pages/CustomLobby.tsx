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
  
  // プレイヤー情報の取得
  const playersById = new Map((room?.players ?? []).map((p) => [p.id, p]));
  const myPlayer = myId ? playersById.get(myId) : null;
  const hostPlayer = room?.hostId ? playersById.get(room.hostId) : null;

  // ホスト判定
  const isHost = myId && room?.hostId === myId;

  // アクティブプレイヤー数
  const activePlayers = (room?.players ?? []).filter((p) => p.connected);
  const activeCount = activePlayers.length;

  // ゲーム開始可能かどうか
  const canStart = activeCount >= 3;
  const disabled = !canStart;

  // ホストがアクティブかどうか
  const hostActive = hostPlayer?.connected ?? false;

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
      
      if (t === "abort") {
        console.log("[CustomLobby] ルーム終了:", p.reason);
        reset();
        nav("/menu");
      }
    };

    const cleanup = createMessageListener(handleWsMessage);
    return cleanup;
  }, [nav, reset]);

  // ルーム解散
  const handleDisband = () => {
    if (isHost) {
      send("disband", {});
      reset();
      nav("/menu");
    }
  };

  // ルーム退出
  const handleLeave = () => {
    send("leave", {});
    reset();
    nav("/menu");
  };

  // ルームIDのコピー
  const handleCopyRoomId = () => {
    if (id) {
      navigator.clipboard.writeText(id);
      showToast("ルームIDをコピーしました", "success");
    }
  };

  return (
    <Screen
      contentScrollable={false}
      className="h-full overflow-hidden"
    >
      <div className="h-full flex flex-col">
        <HeaderBar title="カスタムモード - ルーム待機" center />
        
        <div className="flex-1 px-4 py-6">
          <Panel className="h-full">
            <div className="h-full flex flex-col justify-center space-y-8">
              {/* ルーム情報 */}
              <div className="text-center space-y-4">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white">
                    ルームID: {id}
                  </h2>
                  <div className="flex items-center justify-center gap-2">
                    <CopyButton
                      text={id || ""}
                      onCopy={handleCopyRoomId}
                      className="text-blue-400 hover:text-blue-300"
                    />
                    <span className="text-gray-400 text-sm">クリックでコピー</span>
                  </div>
                </div>
                <p className="text-gray-300">
                  {activeCount}人 / {ROOM_CAPACITY}人
                </p>
              </div>

              {/* プレイヤーリスト */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white text-center">
                  参加者
                </h3>
                <div className="space-y-2">
                  {activePlayers.map((player) => (
                    <div
                      key={player.id}
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        player.id === room?.hostId
                          ? "bg-blue-900/30 border border-blue-500"
                          : "bg-gray-800"
                      }`}
                    >
                      <Avatar
                        iconId={player.iconId}
                        size="md"
                        className="flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium truncate">
                            {player.nick}
                          </span>
                          {player.id === room?.hostId && (
                            <span className="text-blue-400 text-sm font-medium">
                              ホスト
                            </span>
                          )}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {player.connected ? "オンライン" : "オフライン"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ゲーム開始ボタン */}
              {hostActive ? (
                isHost ? (
                  <div className="space-y-4">
                    <PrimaryBtn 
                      className="w-full" 
                      onClick={() => {
                        // カスタムモードの場合はお題作成シーンに遷移
                        nav("/custom");
                      }} 
                      disabled={disabled || !canStart}
                    >
                      お題作成へ
                    </PrimaryBtn>
                    <DangerBtn
                      onClick={() => setDisbandOpen(true)}
                      className="w-full"
                    >
                      ルームを解散
                    </DangerBtn>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <p className="text-gray-300">
                      ホストがお題作成を開始するまでお待ちください
                    </p>
                    <SecondaryBtn
                      onClick={handleLeave}
                      className="w-full"
                    >
                      ルームを退出
                    </SecondaryBtn>
                  </div>
                )
              ) : (
                <div className="text-center space-y-4">
                  <p className="text-gray-300">
                    ホストが接続を待っています...
                  </p>
                  <SecondaryBtn
                    onClick={handleLeave}
                    className="w-full"
                  >
                    ルームを退出
                  </SecondaryBtn>
                </div>
              )}

              {/* ゲーム開始条件の説明 */}
              {!canStart && (
                <div className="text-center text-gray-400 text-sm">
                  ゲームを開始するには3人以上必要です
                </div>
              )}
            </div>
          </Panel>
        </div>

        {/* 下部余白（モバイル対応） */}
        <div className="pb-20 sm:pb-4"></div>
      </div>

      {/* ルーム解散確認モーダル */}
      <Modal
        isOpen={disbandOpen}
        onClose={() => setDisbandOpen(false)}
        title="ルームを解散しますか？"
        content="ルームを解散すると、参加者全員が退出します。"
        actions={[
          {
            label: "キャンセル",
            onClick: () => setDisbandOpen(false),
            variant: "secondary" as const,
          },
          {
            label: "解散する",
            onClick: handleDisband,
            variant: "danger" as const,
          },
        ]}
      />
    </Screen>
  );
}
