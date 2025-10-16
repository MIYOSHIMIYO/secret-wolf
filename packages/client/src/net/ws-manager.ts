/**
 * WebSocket管理システム
 * 既存のApp.tsxのパターンを基に、統一されたメッセージ処理を提供
 */

import { addMessageHandler, connectToRoom, disconnect, send, forceDisconnect, getDebugInfo } from './ws';

// グローバルなメッセージハンドラー
let globalMessageHandler: ((message: any) => void) | null = null;

/**
 * グローバルメッセージハンドラーを設定
 * App.tsxで使用される統一的なメッセージ処理
 */
export function setGlobalMessageHandler(handler: (message: any) => void): void {
  // 既存のハンドラーを削除
  if (globalMessageHandler) {
    // ハンドラーの削除は ws-ideal.ts の addMessageHandler の戻り値で管理
  }
  
  globalMessageHandler = handler;
  
  // 新しいハンドラーを登録
  addMessageHandler(handler);
}

/**
 * ルームに接続（既存のconnectToRoomのラッパー）
 */
export async function connectToRoomWithHandler(
  roomId: string, 
  nick: string, 
  installId: string,
  onConnected?: () => void,
  isCustomMode?: boolean,
  onMessage?: (message: any) => void
): Promise<void> {
  // 接続成功時のコールバックを設定
  if (onConnected) {
    const cleanup = addMessageHandler((message) => {
      if (message.t === 'connected') {
        // 念のため接続確立時に join を送信（ws.ts 側でも送るが、取りこぼし防止の二重安全）
        try { 
          console.log('[ws-manager] joinメッセージ送信:', { roomId, nick, installId, isCustomMode });
          console.log('[ws-manager] joinメッセージ詳細:', JSON.stringify({ roomId, nick, installId, isCustomMode }, null, 2));
          send('join', { roomId, nick, installId, isCustomMode }); 
        } catch {}
        onConnected();
        cleanup();
      }
    });
  }
  
  // メッセージハンドラーを設定
  if (onMessage) {
    const cleanup = addMessageHandler(onMessage);
    // クリーンアップ関数を返す（必要に応じて）
  }
  
  // LOBBYフェーズになった時の遷移ハンドラーを設定
  const lobbyCleanup = addMessageHandler((message) => {
    if (message.t === 'state' && message.p?.phase === 'LOBBY') {
      console.log('ルーム作成成功、Lobbyに遷移します');
      // グローバルメッセージハンドラーが処理するので、ここでは何もしない
      lobbyCleanup();
    }
  });
  
  await connectToRoom(roomId, nick, installId, isCustomMode);
}

/**
 * メッセージ送信（既存のsendのラッパー）
 */
export { send };

/**
 * 接続を切断（既存のdisconnectのラッパー）
 */
export { disconnect };

/**
 * 接続を強制的に切断（既存のforceDisconnectのラッパー）
 */
export { forceDisconnect };

/**
 * 既存のApp.tsxのメッセージ処理パターンを再現
 * この関数をApp.tsxで使用することで、既存の動作を維持
 */
export function createAppMessageHandler(
  setRoom: (room: any) => void,
  setEndsAt: (endsAt: number) => void,
  setMyId: (myId: string) => void,
  nav: (path: string, options?: any) => void
) {
  return function onMsg(message: any) {
    const { t, p } = message;
    
    // stateメッセージの処理（既存のApp.tsxと同じ）
    if (t === 'state') {
      setRoom(p);
      
      // stateメッセージのphaseフィールドで画面遷移
      const { phase } = p || {};
      if (phase) {
        if (phase === 'MODE_SELECT') {
          nav('/mode-select', { replace: true });
        } else if (phase === 'INPUT') {
          nav('/input', { replace: true });
        } else if (phase === 'REVEAL') {
          nav('/reveal', { replace: true });
        } else if (phase === 'DISCUSS') {
          nav('/discuss', { replace: true });
        } else if (phase === 'VOTE') {
          nav('/vote', { replace: true });
        } else if (phase === 'JUDGE') {
          nav('/judge', { replace: true });
        } else if (phase === 'RESULT') {
          nav('/result', { replace: true });
        }
      }
    }
    
    // youメッセージの処理（既存のApp.tsxと同じ）
    if (t === 'you') {
      const id = p?.playerId;
      if (typeof id === 'string' && id) {
        setMyId(id);
      }
    }
    
    // phaseメッセージの処理（既存のApp.tsxと同じ）
    if (t === 'phase') {
      const { phase, endsAt } = p || {};
      
      if (typeof endsAt === 'number') {
        setEndsAt(endsAt);
      }
      
      // 画面遷移（既存のApp.tsxと同じ）
      if (phase === 'MODE_SELECT') {
        nav('/mode-select', { replace: true });
      } else if (phase === 'INPUT') {
        nav('/input', { replace: true });
      } else if (phase === 'REVEAL') {
        nav('/reveal', { replace: true });
      } else if (phase === 'DISCUSS') {
        nav('/discuss', { replace: true });
      } else if (phase === 'VOTE') {
        nav('/vote', { replace: true });
      } else if (phase === 'JUDGE') {
        nav('/judge', { replace: true });
      } else if (phase === 'RESULT') {
        nav('/result', { replace: true });
      }
    }
    
    // abortメッセージの処理（既存のApp.tsxと同じ）
    if (t === 'abort') {
      nav('/menu', { replace: true });
    }
    
    // ここではカスタムイベントは発火しない
    // （ws.ts 側で一元的に 'sw-msg' を配信するため、二重配信→再帰を防止）
  };
}

/**
 * 既存のコンポーネントで使用されているメッセージリスナーパターンを再現
 * 各コンポーネントで使用できるヘルパー関数
 */
export function createMessageListener(
  handler: (message: any) => void
): () => void {
  const cleanup = addMessageHandler(handler);
  
  return () => {
    cleanup();
  };
}

/**
 * デバッグ用：接続状態を取得
 */
export function getConnectionDebugInfo() { return getDebugInfo(); }
