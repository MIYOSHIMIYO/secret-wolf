import { Outlet, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/state/store";
import { showToast } from "@/lib/toast";
import { uiResetForPhaseChange } from "@/state/uiReset";
import { createAppMessageHandler, setGlobalMessageHandler } from "@/net/ws-manager";


const WARN_TEXT: Record<string, string> = {
  TEXT_RANGE: "文字数が範囲外です",
  CHAT_RANGE: "メッセージが長すぎます",
  REPORTED: "通報しました",
  NOT_HOST: "ホストのみ実行できます",
  INVALID_OP: "この操作は現在の状態では行えません",
  MIN_PLAYERS: "開始は3人からです",
  ROOM_CLOSED: "現在、解散処理中です",
  ALREADY_STARTED: "すでにゲームが開始されています",
  ROOM_FULL: "このルームは満員です",
  INVALID_ROOM_MODE: "このルームIDは異なるモード用です",
  INVALID_ROOM_ID: "ルームIDの形式が正しくありません",
  ROOM_NOT_FOUND: "ルームが存在しません",
};

export default function App() {
  const nav = useNavigate();
  const setRoom = useAppStore((s) => s.setRoom);
  const setEndsAt = useAppStore((s) => s.setEndsAt);
  const setMyId = useAppStore((s) => s.setMyId);
  const reset = useAppStore((s) => s.reset);
  const room = useAppStore((s) => s.room);
  
  // 現在のフェーズ状態を追跡
  const currentPhaseRef = useRef<{ phase: string; roundId: string; phaseSeq: number } | null>(null);
  
  // 中断メッセージの重複表示を防ぐためのフラグ
  const abortShownRef = useRef(false);
  
  // 前回のendsAt値を記録（重複更新防止用）
  const lastEndsAtRef = useRef<number | undefined>(undefined);
  
  // 中断・終了モーダルの状態
  const [abortModal, setAbortModal] = useState<{
    isOpen: boolean;
    reason: string;
    message: string;
    showAd: boolean;
  } | null>(null);

  useEffect(() => {
    // 新設計のメッセージハンドラー（既存追加ロジック込み）
    const onMsg = createAppMessageHandler(setRoom, setEndsAt, setMyId, nav);
    const enhancedOnMsg = (m: any) => {
      // 基本メッセージ処理
      onMsg(m);
      
      // 既存の追加ロジック
      if (m?.t === "state") {
        // 新しいゲーム開始時に中断フラグをリセット
        if (m.p?.phase === "LOBBY" || m.p?.phase === "INPUT") {
          abortShownRef.current = false;
        }
      }
      
      if (m?.t === "phase") {
        const { phase, endsAt, roundId, phaseSeq } = m.p || {};
        
        // 古い信号を破棄（roundId/phaseSeq比較）
        if (currentPhaseRef.current) {
          const current = currentPhaseRef.current;
          if (current.roundId === roundId && current.phaseSeq >= (phaseSeq || 0)) {
            console.debug("[phase] 古い信号を破棄", { current, received: { phase, roundId, phaseSeq } });
            return;
          }
        }
        
        // フェーズ変更時のUIリセット
        if (currentPhaseRef.current?.phase !== phase) {
          console.debug("[phase] フェーズ変更", { from: currentPhaseRef.current?.phase, to: phase });
          // ここでUIリセットを実行（各シーンで個別に処理）
        }
        
        // 状態を更新
        if (typeof endsAt === "number") {
          // 重複更新を防ぐため、前回の値と比較
          if (lastEndsAtRef.current !== endsAt) {
            console.debug("[phase] endsAt更新", { from: lastEndsAtRef.current, to: endsAt });
            setEndsAt(endsAt);
            lastEndsAtRef.current = endsAt;
          }
        }
        currentPhaseRef.current = { phase, roundId: roundId || "", phaseSeq: phaseSeq || 0 };
        
        // 新しいゲーム開始時に中断フラグをリセット
        if (phase === "INPUT") {
          abortShownRef.current = false;
        }
        
        // 画面遷移（createAppMessageHandlerで処理される）
        if (phase === "MODE_SELECT") {
          console.log("[App] MODE_SELECTフェーズに遷移");
          // カスタムモードの場合はMODE_SELECTをスキップ
          const isCustomMode = useAppStore.getState().isCustomMode;
          console.log("[App] isCustomModeフラグ:", isCustomMode);
          if (isCustomMode) {
            console.log("[App] カスタムモードのため、MODE_SELECTフェーズをスキップ");
            return;
          }
          nav("/mode-select");
        }
        if (phase === "TOPIC_CREATION") {
          console.log("[App] TOPIC_CREATIONフェーズに遷移");
          nav("/custom");
        }
        if (phase === "INPUT") {
          console.log("[App] INPUTフェーズに遷移");
          nav("/input");
        }
        if (phase === "REVEAL") {
          console.log("[App] REVEALフェーズに遷移");
          nav("/reveal");
        }
        if (phase === "DISCUSS") {
          console.log("[App] DISCUSSフェーズに遷移");
          nav("/discuss");
        }
        if (phase === "VOTE") {
          console.log("[App] VOTEフェーズに遷移");
          nav("/vote");
        }
        if (phase === "JUDGE") {
          console.log("[App] JUDGEフェーズに遷移");
          nav("/judge");
        }
        if (phase === "RESULT") {
          console.log("[App] RESULTフェーズに遷移");
          nav("/result");
        }
      }
      if (m?.t === "abort") {
        const reason = String(m.p?.reason || "aborted");
        
        // 明示的ユーザー切断のabortはスキップ
        if (reason === 'disbanded') {
          console.log("[App] ユーザーによる切断/解散のため、追加処理をスキップします");
          return;
        }

        // LOBBY画面中（URL起点）または LOBBY フェーズ想定の中断は無言でメニューへ
        const path = typeof window !== 'undefined' ? window.location.pathname : '';
        if (path.startsWith('/lobby')) {
          console.log('[App] ロビー画面中の中断を検知。メニューに戻ります。reason=', reason);
          nav('/menu', { replace: true });
          return;
        }
        
        // ゲーム中の host_left / host_disconnected は「誰かが切断」に統一し、モーダルを出さず即メニューへ
        if (reason === 'host_left' || reason === 'host_disconnected') {
          showToast('誰かの接続が切れたためゲームが終了しました', 'error');
          nav('/menu', { replace: true });
          return;
        }
        
        // 中断メッセージの重複表示を防ぐ
        if (abortShownRef.current) {
          console.debug("[App] 中断メッセージは既に表示済み", { reason });
          return;
        }
        
      
        // 理由に応じた具体的なメッセージ
        let msg = "";
        let showAd = false;
        
        switch (reason) {
          case "disbanded":
            // 解散時はモーダルを表示しない（ルーム待機シーンで既に表示済み）
            console.log("[App] 解散時のモーダル表示をスキップ（ルーム待機シーンで既に表示済み）");
            return;
          
          case "game_ended":
            // 知らない誰かとの強制終了の場合は、モーダルを表示せずに即座にメニューシーンに遷移
            console.log("[App] 知らない誰かとの強制終了、即座にメニューシーンに遷移します");
            currentPhaseRef.current = null;
            reset(); // グローバル状態をリセット
            nav("/menu", { replace: true });
            return;
          
          // ゲーム終了系
          case "end_button_pressed":
            console.log("[App] ホストが終了ボタンを押しました。全プレイヤーに終了通知を送信します。");
            msg = "ゲームが終了しました";
            showAd = false;
            break;
          case "end":
            msg = "ゲームが終了しました";
            showAd = false;
            break;
          
          // ルーム解散系
          case "disband_timeout":
            msg = "ルームが解散されました";
            showAd = false;
            break;
          
          default:
            msg = "ゲームが終了しました";
            showAd = false;
        }
        
        // モーダルを表示（トーストではなく）
        setAbortModal({
          isOpen: true,
          reason,
          message: msg,
          showAd
        });
        
        abortShownRef.current = true; // 表示済みフラグを設定
        
        // 中断時の状態リセット
        console.debug("[App] ゲーム中断", { reason, message: msg, showAd });
        currentPhaseRef.current = null;
        reset(); // グローバル状態をリセット
      }
      if (m?.t === "warn") {
        const code = String(m.p?.code || "WARN");
        showToast(WARN_TEXT[code] ?? code, code === "REPORTED" ? "info" : "error");
      }
    }
    // グローバルハンドラーの登録（状態更新・遷移はここで一元処理）
    setGlobalMessageHandler(enhancedOnMsg);
    // 初期メッセージ取りこぼし防止のため 'sw-msg' も直接監視
    const listener = (e: any) => enhancedOnMsg(e.detail);
    window.addEventListener('sw-msg', listener as any);
    return () => {
      window.removeEventListener('sw-msg', listener as any);
    };
  }, [nav, setRoom, setEndsAt, setMyId]);

  // モーダルOK時の処理
  const handleAbortModalOK = () => {
    if (!abortModal) return;
    
    setAbortModal(null);
    
    // 即座にメニューに遷移（広告なし）
    nav("/menu");
  };

  return (
    <div className="min-h-full flex flex-col">
      <div className="flex-1"><Outlet /></div>
      
      {/* 中断・終了モーダル */}
      {abortModal?.isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-sm mx-4 ring-1 ring-white/10 shadow-2xl">
            <div className="text-center space-y-4">
              <div className="text-white text-lg font-medium">{abortModal.message}</div>
              <div className="flex justify-center">
                <button
                  onClick={handleAbortModalOK}
                  className="px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 