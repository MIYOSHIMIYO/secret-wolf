import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppStore } from "@/state/store";
import { send } from "@/net/ws";
import Screen from "@/components/Screen";
import HeaderBar from "@/components/HeaderBar";
import { PrimaryBtn, DangerBtn } from "@/components/Buttons";
import { Avatar } from "@/components/ui/Avatar";
import { ROOM_CAPACITY } from "@secret/shared/src/constants";
import { showToast } from "@/lib/toast";

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

  // WebSocketメッセージ処理
  useEffect(() => {
    const handleWsMessage = (event: CustomEvent) => {
      const { t, p } = event.detail;
      
      if (t === "abort") {
        console.log("[CustomLobby] ルーム終了:", p.reason);
        reset();
        nav("/menu");
      }
    };

    window.addEventListener("sw-msg", handleWsMessage as EventListener);
    
    return () => {
      window.removeEventListener("sw-msg", handleWsMessage as EventListener);
    };
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

  return (
    <Screen
      contentScrollable={false}
      className="h-full overflow-hidden"
    >
      <div className="h-full flex flex-col">
        <HeaderBar title="カスタムモード - ルーム待機" center />
        
        {/* メインコンテンツ */}
        <div className="flex-1 px-4 py-6 space-y-6">
          {/* ルーム情報 */}
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-white">
              ルームID: {id}
            </h2>
            <p className="text-gray-300">
              {activeCount}人 / {ROOM_CAPACITY}人
            </p>
          </div>

          {/* プレイヤーリスト */}
          <div className="space-y-3">
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
              <div className="mt-2 flex items-center gap-3">
                <div className="flex-1">
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
                </div>
                <DangerBtn
                  onClick={() => setDisbandOpen(true)}
                  className="px-4 py-2"
                >
                  解散
                </DangerBtn>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-gray-300 mb-4">
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
            <div className="text-center">
              <p className="text-gray-300 mb-4">
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

        {/* 下部余白（モバイル対応） */}
        <div className="pb-20 sm:pb-4"></div>
      </div>

      {/* ルーム解散確認モーダル */}
      {disbandOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 mx-4 max-w-sm w-full">
            <h3 className="text-lg font-bold text-white mb-4 text-center">
              ルームを解散しますか？
            </h3>
            <p className="text-gray-300 text-center mb-6">
              ルームを解散すると、参加者全員が退出します。
            </p>
            <div className="flex gap-3">
              <SecondaryBtn
                className="flex-1"
                onClick={() => setDisbandOpen(false)}
              >
                キャンセル
              </SecondaryBtn>
              <DangerBtn
                className="flex-1"
                onClick={handleDisband}
              >
                解散する
              </DangerBtn>
            </div>
          </div>
        </div>
      )}
    </Screen>
  );
}
