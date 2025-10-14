import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAppStore } from "@/state/store";
import { getNick } from "@/lib/nick";
import { getInstallId } from "@/lib/installId";
import { connectToRoomWithHandler, getConnectionDebugInfo, forceDisconnect } from "@/net/ws-manager";
import { showToast } from "@/lib/toast";
import Screen from "@/components/Screen";
import HeaderBar from "@/components/HeaderBar";
import Panel from "@/components/Panel";
import { PrimaryBtn, SecondaryBtn } from "@/components/Buttons";
import RoomFullModal from "@/components/RoomFullModal";

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

  // WebSocketメッセージ処理（join送信は ws.ts 内で接続完了時に一度だけ実施）
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
      const nick = getNick();
      const installId = getInstallId();
      
      await connectToRoomWithHandler(
        newRoomId,
        nick,
        installId,
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
      const nick = getNick();
      const installId = getInstallId();
      
      await connectToRoomWithHandler(
        roomId.trim().toUpperCase(),
        nick,
        installId,
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
        <HeaderBar title="カスタムモード - ルーム作成・参加" center />
        
        <div className="flex-1 px-4 py-6">
          <Panel className="h-full">
            <div className="h-full flex flex-col justify-center space-y-8">
              {/* ルーム作成セクション */}
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-white text-center">
                  新しいルームを作成
                </h2>
                <p className="text-gray-300 text-center text-sm">
                  カスタムお題でゲームを始めましょう
                </p>
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
                <h2 className="text-xl font-bold text-white text-center">
                  既存のルームに参加
                </h2>
                <p className="text-gray-300 text-center text-sm">
                  ルームIDを入力して参加
                </p>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="ルームIDを入力"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    disabled={isCreating || isJoining}
                    className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    maxLength={6}
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
          </Panel>
        </div>

        {/* 下部余白（モバイル対応） */}
        <div className="pb-20 sm:pb-4"></div>
      </div>

      {/* ルーム満員モーダル */}
      <RoomFullModal
        isOpen={showRoomFullModal}
        onClose={() => setShowRoomFullModal(false)}
        onCreateNew={handleCreateRoom}
      />
    </Screen>
  );
}
