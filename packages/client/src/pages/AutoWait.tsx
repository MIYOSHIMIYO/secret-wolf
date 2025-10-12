import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Screen from "@/components/Screen";
import HeaderBar from "@/components/HeaderBar";
import Panel from "@/components/Panel";
import { SecondaryBtn } from "@/components/Buttons";
import { connectToRoomWithHandler, send, disconnect, getConnectionDebugInfo, forceDisconnect } from "@/net/ws-manager";
import { getInstallId } from "@/lib/installId";
import { getNick } from "@/lib/nick";
import { useAppStore } from "@/state/store";
import { showToast } from "@/lib/toast";
import { Avatar } from "@/components/ui/Avatar";

const API_BASE = import.meta.env.VITE_WORKER_WS?.replace(/^ws/, "http") || "http://localhost:8787";

export default function AutoWait() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const mode = sp.get("mode") ?? "NONE";
  const [roomId, setRoomId] = useState<string | null>(null);
  const players = useAppStore((s) => s.room?.players ?? []);
  const phase = useAppStore((s) => s.room?.phase);
  const room = useAppStore((s) => s.room);
  const onceRef = useRef(false);


  const installId = useMemo(() => getInstallId(), []);
  const nick = useMemo(() => getNick(), []);
  const reset = useAppStore((s) => s.reset);

  // 3人揃って準備フェーズに入ったかどうか
  const isReadyPhase = phase === "READY";
  const isFull = players.length >= 3;

  // /auto を呼び出して roomId を取得する共通処理（非200時は再試行）
  const requestAutoRoom = async (retryDelay = 1000): Promise<string | null> => {
    try {
      const res = await fetch(`${API_BASE}/auto`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode, nick, installId }),
      });

      if (!res.ok) {
        // レート制限など
        let msg = `サーバー応答が不正 (${res.status})`;
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch {}
        showToast(`${msg}。再試行します…`, "error");
        setTimeout(() => { void createNewRoom(); }, retryDelay);
        return null;
      }

      const data = await res.json().catch(() => null) as any;
      const rid = data?.roomId;
      if (!rid) {
        showToast("ルーム作成に失敗しました。再試行します…", "error");
        setTimeout(() => { void createNewRoom(); }, retryDelay);
        return null;
      }
      return rid;
    } catch (e) {
      showToast("ネットワークエラー。再試行します…", "error");
      setTimeout(() => { void createNewRoom(); }, retryDelay);
      return null;
    }
  };

  // 新しいルームを作成する関数
  const createNewRoom = async () => {
    try {
      console.log("[AutoWait] 新しいルームを作成します。");
      
      // 既存の接続を強制的に切断
      forceDisconnect();
      console.log("[AutoWait] 既存の接続を強制切断しました");
      
      const newRoomId = await requestAutoRoom();
      if (!newRoomId) return; // 再試行をスケジュール済み
      
      console.log(`[AutoWait] 新しいルーム ${newRoomId} を作成しました。`);
      
      // 新しいルームに接続
      connectToRoomWithHandler(newRoomId, nick, installId, () => {
        // 接続完了後に即座にautoメッセージを送信
        send("auto", { mode, nick, installId });
      });
      
      // 新しいルームIDを設定
      setRoomId(newRoomId);
    } catch (e) {
      console.error("[AutoWait] 新しいルーム作成に失敗:", e);
      showToast("新しいルームの作成に失敗しました。", "error");
      // ここではメニューに戻さず、ユーザーがやめるを選ぶまで画面に留める
    }
  };

  // フェーズメッセージを受信してゲーム開始時の遷移処理
  useEffect(() => {
    const onMsg = (ev: CustomEvent) => {
      const m = ev.detail;
      
      if (m?.t === "state") {
        // ルーム状態を即座に更新
        if (m.p?.roomId) {
          setRoomId(m.p.roomId);
        }
        
      }
      
      if (m?.t === "phase") {
        if (m.p?.phase === "INPUT") {
          nav("/input", { replace: true });
        }
      }
      
      if (m?.t === "warn") {
        if (m.p?.code === "ROOM_FULL") {
          showToast("このルームは満員です。新しいルームを作成します。", "info");
          setTimeout(() => {
            void createNewRoom();
          }, 1000);
        }
      }
    };

    window.addEventListener("sw-msg", onMsg as any);
    return () => window.removeEventListener("sw-msg", onMsg as any);
  }, [nav]);

  // コンポーネントマウント時の状態リセット
  useEffect(() => {
    reset();
    setRoomId(null);
  }, [reset, setRoomId]);

  useEffect(() => {
    if (onceRef.current) return;
    onceRef.current = true;
    (async () => {
      // 入室前に状態をクリーンに
      reset();
      const rid = await requestAutoRoom();
      if (!rid) return; // 再試行される
      setRoomId(rid);
      connectToRoomWithHandler(rid, nick, installId, () => {
        console.log("[AutoWait] WebSocket接続完了");
        send("auto", { mode, nick, installId });
      });
    })();
  }, [API_BASE, installId, mode, nav, nick, reset]);

  const cancel = () => {
    // 3人揃って準備フェーズに入った後は、やめるボタンを押せない
    if (isReadyPhase) {
      console.log("[AutoWait] 準備フェーズ中はやめるボタンを押せません");
      return;
    }
    
    console.log("[AutoWait] やめるボタンが押されました。サーバーに離脱を通知します。");
    
    // 自身の退出フラグを設定（モーダル表示を防ぐため）
    window.dispatchEvent(new CustomEvent("user-initiated-exit"));
    
    // サーバーに離脱を通知
    send("leave", {});
    // 旧WSからの遅延メッセージ流入を防ぐため、必ず切断
    forceDisconnect();
    
    // 状態をリセットしてからメニューに戻る
    reset();
    nav("/menu");
  };

  const count = Math.min(Math.max(players.length, 1), 3);
  const placeholders = Array.from({ length: 3 - players.length });
  

  return (
    <Screen bannerHeight={56}>
      <div className="p-4 space-y-4 max-w-md mx-auto">
        <HeaderBar title="マッチング" center />
        <Panel className="p-5">
          <div className="text-slate-300 text-sm mb-3">3人揃うと自動で開始します</div>
          <div className="text-slate-200 text-lg mb-4">待機中 {count}/3</div>
          
          {/* プレイヤー一覧 */}
          <div className="space-y-3 mb-4">
            {players && players.length > 0 ? (
              players.map((p, index) => (
                <div key={p.id || `player-${index}`} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                  <Avatar iconId={Number(p.iconId)} size={44} />
                  <div className="flex-1">
                    <div className="text-slate-200 font-medium">{p.nick || 'プレイヤー'}</div>
                    <div className="text-slate-400 text-sm">参加済み</div>
                  </div>
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                </div>
              ))
            ) : (
              <div className="text-slate-400 text-center py-4">
                <div className="text-sm">プレイヤーを待っています...</div>
              </div>
            )}
            {placeholders.map((_, i) => (
              <div key={`placeholder-${i}`} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg opacity-50">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <span className="text-slate-400 text-lg">?</span>
                </div>
                <div className="flex-1">
                  <div className="text-slate-400 font-medium">待機中...</div>
                  <div className="text-slate-500 text-sm">プレイヤーを待っています</div>
                </div>
                <div className="w-3 h-3 bg-slate-500 rounded-full"></div>
              </div>
            ))}
          </div>

          {/* 進行状況バー */}
          <div className="w-full bg-white/10 rounded-full h-2 mb-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(count / 3) * 100}%` }}
            ></div>
          </div>
          <div className="text-slate-400 text-xs text-center">
            {isReadyPhase ? "3秒後にゲーム開始..." : count === 3 ? "ゲーム開始準備中..." : `${3 - count}人待ち`}
          </div>
        </Panel>
        

        <div className="flex-1" />
        <SecondaryBtn 
          onClick={cancel}
          disabled={isReadyPhase}
          className={isReadyPhase ? "opacity-50 cursor-not-allowed" : ""}
        >
          {isReadyPhase ? "準備中..." : "やめる"}
        </SecondaryBtn>
        {/* BannerSlot("AUTO_WAIT") 予約 */}
        <div style={{ height: 56 }} />
      </div>
    </Screen>
  );
} 