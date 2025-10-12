import { forceDisconnect } from "@/net/ws";
import { useAppStore } from "@/state/store";

/**
 * ルーム状態を完全にリセットする共通関数
 * 新しいルームに接続する前に呼び出す
 */
export const resetRoomState = async () => {
  // WebSocket接続を強制切断
  forceDisconnect();
  
  // ソケットクローズを待機（最大200ms）
  await new Promise<void>(resolve => {
    const timeout = setTimeout(resolve, 200);
    
    // WebSocketのクローズイベントを監視
    const checkClosed = () => {
      // 接続が閉じられたかチェック
      if (typeof window !== 'undefined' && window.WebSocket) {
        // 簡単なチェック：WebSocketの状態を確認
        clearTimeout(timeout);
        resolve();
      }
    };
    
    // 短い間隔でチェック
    const interval = setInterval(checkClosed, 10);
    setTimeout(() => {
      clearInterval(interval);
      clearTimeout(timeout);
      resolve();
    }, 200);
  });
  
  // アプリストアの状態をリセット
  const reset = useAppStore.getState().reset;
  reset();
  
  // ローカルストレージから古いルーム情報をクリア
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('room') || key.includes('game') || key.includes('player'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log("[roomUtils] ローカルストレージから古いルーム情報をクリアしました");
  } catch (error) {
    console.warn("[roomUtils] ローカルストレージのクリアに失敗:", error);
  }
  
  // セッションストレージもクリア
  try {
    sessionStorage.clear();
    console.log("[roomUtils] セッションストレージをクリアしました");
  } catch (error) {
    console.warn("[roomUtils] セッションストレージのクリアに失敗:", error);
  }
  
  console.log("[roomUtils] ルーム状態を完全にリセットしました");
};

/**
 * 新しいルームに接続する前の準備処理
 * @param delay 待機時間（ミリ秒）
 */
export const prepareNewRoomConnection = async (delay: number = 200) => {
  // 既存の状態をリセット（非同期でソケットクローズを待機）
  await resetRoomState();
  
  // 適切な待機時間
  await new Promise(resolve => setTimeout(resolve, delay));
  
  console.log("[roomUtils] 新しいルーム接続の準備が完了しました");
}; 