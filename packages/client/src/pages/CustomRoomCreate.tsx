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
            // カスタムモード専用ロビーに遷移
            nav(`/custom-lobby/${roomId}`);
          });
        }
      }
      
      if (t === "warn" || t === "error") {
        // エラーハンドリング
        setIsCreating(false);
        setIsJoining(false);
        
        // ROOM_FULLの場合はモーダルを表示
        if (p?.code === "ROOM_FULL") {
          setShowRoomFullModal(true);
        } else {
          // その他のエラーはトーストで表示
          showToast(p?.msg || "エラーが発生しました", "error");
        }
      }
    };

    window.addEventListener("sw-msg", handleWsMessage as EventListener);
    
    return () => {
      window.removeEventListener("sw-msg", handleWsMessage as EventListener);
    };
  }, [nav, isCreating, isJoining]);

  const createRoom = async () => {
    if (isCreating) return;
    
    try {
      setIsCreating(true);
      
      // 1. 既存の接続を切断
      forceDisconnect();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 2. ルーム状態をリセット
      reset();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 3. 新しいルームIDを生成
      const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // 4. 少し待機
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 5. WebSocket接続を開始（カスタムモードフラグ付き）
      const nick = getNick();
      const installId = getInstallId();
      connectToRoomWithHandler(newRoomId, nick, installId, undefined, true); // カスタムモードフラグをtrueに設定
      
      // 接続タイムアウトを設定（8秒）
      setTimeout(() => {
        if (isCreating) {
          setIsCreating(false);
          showToast("接続に失敗しました。もう一度お試しください。", "error");
        }
      }, 8000);
      
    } catch (error) {
      console.error("ルーム作成エラー:", error);
      setIsCreating(false);
      showToast("ルーム作成に失敗しました。", "error");
    }
  };

  const joinRoom = async () => {
    if (!roomId.trim()) {
      showToast("ルームIDを入力してください", "error");
      return;
    }
    
    if (isJoining) return;
    
    try {
      setIsJoining(true);
      
      // 1. 既存の接続を切断
      forceDisconnect();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 2. ルーム状態をリセット
      reset();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 3. WebSocket接続を開始（カスタムモードフラグ付き）
      const nick = getNick();
      const installId = getInstallId();
      
      connectToRoomWithHandler(roomId, nick, installId, () => {
        console.log(`[CustomRoomCreate] 接続完了: roomId=${roomId}`);
      }, true); // カスタムモードフラグをtrueに設定
      
      // 接続タイムアウトを設定（8秒）
      setTimeout(() => {
        if (isJoining) {
          setIsJoining(false);
          showToast("接続に失敗しました。もう一度お試しください。", "error");
        }
      }, 8000);
      
    } catch (error) {
      console.error("ルーム参加エラー:", error);
      setIsJoining(false);
      showToast("ルーム参加に失敗しました。", "error");
    }
  };

  const joinEnabled = /^[A-Z0-9]{6,8}$/.test(roomId);
  const bannerH = 0;

  return (
    <Screen
      bannerHeight={bannerH}
      contentScrollable={false}
      maxWidth={1200}
      innerClassName="xl:px-12"
    >
      <div
        className="room-create-ipad-scale px-4"
        style={{ height: `calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - ${bannerH}px)` }}
      >
        <div className="h-full flex flex-col">
          {/* 上詰め配置 */}
          <div className="w-full">
              <HeaderBar title="カスタムモード - ルーム作成・参加" center />

              {/* create section */}
              <Panel className="mt-6 md:mt-10 lg:mt-10 xl:mt-12 p-4 sm:p-6 md:p-9 lg:p-9 xl:p-10">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <h2 className="text-white text-lg sm:text-xl md:text-2xl font-semibold mb-2">
                      ルーム作成
                    </h2>
                    <p className="text-slate-300 text-sm md:text-lg">
                      新しいルームを作成して友達を招待しましょう
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <PrimaryBtn 
                      onClick={createRoom} 
                      disabled={isCreating || isJoining}
                      className="px-6 py-3 text-sm md:text-lg"
                    >
                      {isCreating ? "作成中..." : "作成"}
                    </PrimaryBtn>
                  </div>
                </div>
              </Panel>

              {/* join section */}
              <Panel className="mt-4 md:mt-6 lg:mt-6 xl:mt-8 p-4 sm:p-6 md:p-9 lg:p-9 xl:p-10">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-white text-lg sm:text-xl md:text-2xl font-semibold mb-2">
                      ルーム参加
                    </h2>
                    <p className="text-slate-300 text-sm md:text-lg">
                      友達から教えてもらったルームIDを入力してください
                    </p>
                  </div>
                  
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                      placeholder="ルームIDを入力"
                      className="flex-1 px-4 py-3 rounded-lg bg-slate-700 text-white placeholder-slate-400 border border-slate-600 focus:border-blue-500 focus:outline-none text-sm md:text-lg"
                      maxLength={8}
                    />
                    <SecondaryBtn 
                      onClick={joinRoom} 
                      disabled={!joinEnabled || isCreating || isJoining}
                      className="px-6 py-3 text-sm md:text-lg"
                    >
                      {isJoining ? "参加中..." : "参加"}
                    </SecondaryBtn>
                  </div>
                </div>
              </Panel>
            </div>

            {/* 下詰め配置 */}
            <div className="mt-auto">
              <div className="text-center">
                <Link to="/menu" className="text-slate-400 hover:text-slate-300 text-sm md:text-lg">
                  メニューに戻る
                </Link>
              </div>
            </div>
        </div>
      </div>

      {/* ルーム満員モーダル */}
      <RoomFullModal 
        open={showRoomFullModal} 
        onClose={() => setShowRoomFullModal(false)} 
      />
    </Screen>
  );
}
