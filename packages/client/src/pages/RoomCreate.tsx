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

export default function RoomCreate() {
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
            // 通常モードの場合はロビーに遷移
            nav(`/lobby/${roomId}`);
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
          showToast(`エラー: ${p?.msg || p?.message || "不明なエラー"}`, "error");
        }
      }
    };

    window.addEventListener("sw-msg", handleWsMessage as EventListener);
    return () => {
      window.removeEventListener("sw-msg", handleWsMessage as EventListener);
    };
  }, [nav, isCreating, isJoining, roomId]);

  const createRoom = async () => {
    setIsCreating(true);
    
    try {
      // 1. 完全なリセットを実行
      reset();
      
      // 2. 新しいルームIDを生成（通常モード用プレフィックス付き）
      const baseId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newRoomId = `N${baseId}`; // N = Normal mode
      
      // 3. 既存のWebSocket接続を強制的にクリーンアップ
      forceDisconnect();
      
      // 4. クリーンアップ後の待機時間を最小化
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 5. WebSocket接続を開始
      const nick = getNick();
      const installId = getInstallId();
      connectToRoomWithHandler(newRoomId, nick, installId, undefined, false, true);
      
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
    
    setIsJoining(true);
    
    try {
      // 1. 完全なリセットを実行
      reset();
      
      // 2. 既存のWebSocket接続を強制的にクリーンアップ
      forceDisconnect();
      
      // クリーンアップ後の待機時間を最小化
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // 3. WebSocket接続を開始
      const nick = getNick();
      const installId = getInstallId();
      
      connectToRoomWithHandler(roomId, nick, installId, () => {
        console.log(`[RoomCreate] 接続完了: roomId=${roomId}`);
      }, false, false);
      
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

  const joinEnabled = /^N[A-Z0-9]{6}$/.test(roomId); // 通常モード用のプレフィックスN付きルームID
  const bannerH = 0;

  return (
    <Screen bannerHeight={bannerH} contentScrollable={false}>
      <div
        className="roomcreate-ipad-scale px-4 sm:px-6 md:px-10 lg:px-12 xl:px-16 max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto"
        style={{ height: `calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - ${bannerH}px)` }}
      >
        <div className="h-full flex flex-col">
          {/* 上詰め配置 */}
          <div className="w-full">
              <HeaderBar title="心理戦 - ルーム作成・参加" center />

              {/* create section */}
              <Panel className="mt-6 md:mt-10 lg:mt-10 xl:mt-12 p-4 sm:p-6 md:p-9 lg:p-9 xl:p-10">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-slate-200 text-xl sm:text-2xl md:text-5xl lg:text-4xl xl:text-4xl font-semibold">新しいルームを作成</div>
                    <div className="text-slate-400 text-sm sm:text-base md:text-2xl lg:text-xl xl:text-xl">最大8人まで参加可能</div>
                  </div>
                  <PrimaryBtn 
                    onClick={createRoom} 
                    disabled={isCreating || isJoining}
                    className="px-7 sm:px-8 md:px-10 lg:px-10 xl:px-12 h-12 sm:h-14 md:h-24 lg:h-20 xl:h-20 text-base sm:text-lg md:text-3xl lg:text-2xl xl:text-2xl shrink-0"
                  >
                    {isCreating ? "作成中..." : "作成"}
                  </PrimaryBtn>
                </div>
              </Panel>

              {/* join section */}
              <Panel className="mt-5 md:mt-10 lg:mt-8 xl:mt-10 p-4 sm:p-6 md:p-9 lg:p-9 xl:p-10">
                <div className="text-slate-200 text-base sm:text-lg md:text-4xl lg:text-3xl xl:text-3xl mb-4">ルームIDを入力して参加</div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                    placeholder="例: NABC123"
                    className="flex-1 px-4 sm:px-5 md:px-7 lg:px-6 xl:px-7 py-3 sm:py-4 md:py-7 lg:py-5 xl:py-6 bg-slate-800 border border-slate-600 rounded-lg lg:rounded-xl xl:rounded-2xl text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500 text-base sm:text-lg md:text-3xl lg:text-xl xl:text-2xl"
                    maxLength={8}
                  />
                  <PrimaryBtn 
                    onClick={joinRoom} 
                    disabled={!joinEnabled || isCreating || isJoining}
                    className="px-5 sm:px-6 md:px-8 lg:px-7 xl:px-9 h-10 sm:h-12 md:h-20 lg:h-14 xl:h-20 text-sm sm:text-base md:text-2xl lg:text-lg xl:text-xl shrink-0"
                  >
                    {isJoining ? "参加中..." : "参加"}
                  </PrimaryBtn>
                </div>
                <div className="text-slate-400 text-xs sm:text-sm md:text-xl lg:text-base xl:text-lg mt-3">
                  7文字の英数字で入力してください（N + 6文字、例：NABC123）（フリック式入力ではなくキーボード式入力の方が安定します）。
                </div>
              </Panel>

              {/* メニューに戻る（参加のすぐ下） */}
              <div className="mt-6 md:mt-10 lg:mt-8 xl:mt-10">
                <Link to="/menu" className="block">
                  <div className="h-12 sm:h-12 md:h-20 lg:h-16 xl:h-20 rounded-2xl text-white font-semibold text-center flex items-center justify-center active:scale-[0.98] transition-transform text-base sm:text-base md:text-2xl lg:text-xl xl:text-2xl"
                       style={{ background: "linear-gradient(135deg, rgba(31,41,55,.9), rgba(75,85,99,.8), rgba(31,41,55,.9))" }}>
                    メニューに戻る
                  </div>
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