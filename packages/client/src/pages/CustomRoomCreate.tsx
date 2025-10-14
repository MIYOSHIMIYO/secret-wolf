import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/state/store";
import { connectToRoomWithHandler } from "@/net/ws-manager";
import Screen from "@/components/Screen";
import HeaderBar from "@/components/HeaderBar";
import { PrimaryBtn, SecondaryBtn } from "@/components/Buttons";
// Inputコンポーネントの代わりにtextareaを使用
import { showToast } from "@/lib/toast";

export default function CustomRoomCreate() {
  const nav = useNavigate();
  const [roomId, setRoomId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [showRoomFullModal, setShowRoomFullModal] = useState(false);
  const reset = useAppStore((s) => s.reset);
  const setIsCustomMode = useAppStore((s) => s.setIsCustomMode);

  // カスタムモードフラグを設定
  useEffect(() => {
    setIsCustomMode(true);
  }, [setIsCustomMode]);

  // WebSocketメッセージ処理
  useEffect(() => {
    const handleWsMessage = (event: CustomEvent) => {
      const { t, p } = event.detail;
      
      if (t === "state") {
        // ルーム状態を受信した場合、ルーム作成/参加成功
        const roomId = p.roomId;
        
        if (roomId && (isCreating || isJoining)) {
          // 状態を即座にリセット
          setIsCreating(false);
          setIsJoining(false);
          
          // 即座に画面遷移（非同期で実行）
          requestAnimationFrame(() => {
            // カスタムロビーに遷移
            nav(`/custom-lobby/${roomId}`);
          });
        }
      }
      
      if (t === "roomFull") {
        // ルームが満員の場合
        if (isJoining) {
          setIsJoining(false);
          setShowRoomFullModal(true);
        }
      }
      
      if (t === "abort") {
        // ルームが終了された場合
        console.log("[CustomRoomCreate] ルーム終了:", p.reason);
        reset();
        nav("/menu");
      }
    };

    window.addEventListener("sw-msg", handleWsMessage as EventListener);
    
    return () => {
      window.removeEventListener("sw-msg", handleWsMessage as EventListener);
    };
  }, [nav, isCreating, isJoining, reset]);

  // ルーム作成
  const handleCreateRoom = async () => {
    if (isCreating || isJoining) return;
    
    try {
      setIsCreating(true);
      const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      await connectToRoomWithHandler(
        newRoomId,
        "ホスト",
        `custom-host-${Date.now()}`,
        undefined,
        true // isCustomMode = true
      );
      
      console.log("[CustomRoomCreate] ルーム作成開始:", newRoomId);
    } catch (error) {
      console.error("[CustomRoomCreate] ルーム作成エラー:", error);
      setIsCreating(false);
      showToast("ルーム作成に失敗しました", "error");
    }
  };

  // ルーム参加
  const joinRoom = async () => {
    if (!roomId.trim() || isCreating || isJoining) return;
    
    try {
      setIsJoining(true);
      
      await connectToRoomWithHandler(
        roomId.trim().toUpperCase(),
        "ゲスト",
        `custom-guest-${Date.now()}`,
        undefined,
        true // isCustomMode = true
      );
      
      console.log("[CustomRoomCreate] ルーム参加開始:", roomId);
    } catch (error) {
      console.error("[CustomRoomCreate] ルーム参加エラー:", error);
      setIsJoining(false);
      showToast("ルーム参加に失敗しました", "error");
    }
  };

  return (
    <Screen
      contentScrollable={false}
      className="h-full overflow-hidden"
    >
      <div className="h-full flex flex-col">
        {/* 上詰め配置 */}
        <div className="w-full">
          <HeaderBar title="カスタムモード - ルーム作成・参加" center />
          
          {/* メインコンテンツ */}
          <div className="px-4 py-6 space-y-6">
            {/* ルーム作成セクション */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white text-center">
                新しいルームを作成
              </h2>
              <PrimaryBtn
                className="w-full"
                onClick={handleCreateRoom}
                disabled={isCreating || isJoining}
              >
                {isCreating ? "作成中..." : "ルームを作成"}
              </PrimaryBtn>
            </div>

            {/* 区切り線 */}
            <div className="flex items-center">
              <div className="flex-1 h-px bg-gray-600"></div>
              <span className="px-4 text-gray-400 text-sm">または</span>
              <div className="flex-1 h-px bg-gray-600"></div>
            </div>

            {/* ルーム参加セクション */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white text-center">
                既存のルームに参加
              </h2>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="ルームIDを入力"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  disabled={isCreating || isJoining}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
                <SecondaryBtn
                  className="w-full"
                  onClick={joinRoom}
                  disabled={!roomId.trim() || isCreating || isJoining}
                >
                  {isJoining ? "参加中..." : "ルームに参加"}
                </SecondaryBtn>
              </div>
            </div>
          </div>
        </div>

        {/* 下部余白（モバイル対応） */}
        <div className="flex-1"></div>
      </div>

      {/* ルーム満員モーダル */}
      {showRoomFullModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 mx-4 max-w-sm w-full">
            <h3 className="text-lg font-bold text-white mb-4 text-center">
              ルームが満員です
            </h3>
            <p className="text-gray-300 text-center mb-6">
              このルームは既に満員です。別のルームに参加するか、新しいルームを作成してください。
            </p>
            <div className="flex gap-3">
              <SecondaryBtn
                className="flex-1"
                onClick={() => setShowRoomFullModal(false)}
              >
                閉じる
              </SecondaryBtn>
              <PrimaryBtn
                className="flex-1"
                onClick={() => {
                  setShowRoomFullModal(false);
                  handleCreateRoom();
                }}
              >
                新規作成
              </PrimaryBtn>
            </div>
          </div>
        </div>
      )}
    </Screen>
  );
}
