/**
 * 理想的なWebSocket設計
 * 既存の正常動作部分のパターンを基に、シンプルで堅牢な設計を実装
 */

import { WS_CONFIG } from '@/lib/config';

// 接続状態の管理
let ws: WebSocket | null = null;
let isConnecting = false;
let reconnectTimer: NodeJS.Timeout | null = null;
let heartbeatTimer: NodeJS.Timeout | null = null;
let connectionAttempts = 0;
let hasJoined = false; // joinメッセージ送信済みフラグ
let lastJoinPayload: { roomId: string; nick: string; installId: string; isCustomMode?: boolean } | null = null; // 再接続時の自動join用
let manualClose = false; // 明示的切断かどうかのフラグ（接続単位で評価）
let connectionIdCounter = 0; // 接続ごとに増えるID（manualCloseフラグのスコープを接続単位に限定）
let manualCloseConnId: number | null = null; // manualClose をセットした接続ID

// イベントリスナーの管理
const messageHandlers = new Set<(message: any) => void>();

/**
 * WebSocket接続を開始
 */
export async function connect(url: string): Promise<void> {
  // 既に接続済みの場合は何もしない
  if (ws?.readyState === WebSocket.OPEN) {
    console.log('[WebSocket] 既に接続済みです');
    return;
  }

  // 接続中の場合は待機
  if (isConnecting) {
    console.log('[WebSocket] 接続中です。待機します。');
    return;
  }

  // 最大試行回数チェック
  if (connectionAttempts >= WS_CONFIG.MAX_RECONNECT_ATTEMPTS) {
    console.error('[WebSocket] 最大接続試行回数に達しました');
    notifyHandlers({ t: 'connection_failed', p: { reason: 'max_attempts' } });
    return;
  }

  isConnecting = true;
  connectionAttempts++;

  console.log(`[WebSocket] 接続開始: ${url} (試行回数: ${connectionAttempts})`);

  try {
    // 既存の接続をクリーンアップ
    if (ws) {
      ws.close();
      ws = null;
    }

    // 新しい接続IDを採番
    const thisConnId = ++connectionIdCounter;

    ws = new WebSocket(url);
    
    // 接続成功
    ws.onopen = () => {
      console.log('[WebSocket] 接続成功');
      isConnecting = false;
      connectionAttempts = 0;
      
      // ハートビート開始
      startHeartbeat();
      
      // 接続成功を通知
      notifyHandlers({ t: 'connected', p: { url } });

      // 再接続含め、接続確立時に一度だけjoinを送信（lastJoinPayloadが設定されている場合）
      if (lastJoinPayload && !hasJoined) {
        const { roomId, nick, installId, isCustomMode } = lastJoinPayload;
        console.log('[WebSocket] joinメッセージ送信:', { roomId, nick, installId, isCustomMode });
        send('join', { roomId, nick, installId, isCustomMode });
        hasJoined = true;
      }
    };

    // メッセージ受信
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        // 本番ではハートビートやstateスパムを抑制
        if (import.meta.env.DEV) {
          if (message?.t !== 'state' && message?.t !== 'pong') {
            console.log('[WebSocket] メッセージ受信:', message);
          }
        }
        notifyHandlers(message);
      } catch (error) {
        console.error('[WebSocket] メッセージ解析エラー:', error);
      }
    };

    // 接続終了
    ws.onclose = (event) => {
      console.log('[WebSocket] 接続終了:', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      });
      
      isConnecting = false;
      stopHeartbeat();
      // 再接続時に再joinできるようにフラグをリセット
      hasJoined = false;

      // ② 1006（Abnormal Closure）は通信断の一時的な可能性が高い。
      //    この場合は「ユーザー切断扱い」にせず、再接続だけを行う。
      if (event.code === 1006) {
        console.log('[WebSocket] 異常終了(1006)。ユーザー切断扱いにはせず再接続します');
        // 古い manualClose が残っていても無視されるようにクリアしておく
        manualClose = false;
        manualCloseConnId = null;
        scheduleReconnect(url);
        return;
      }

      // ① manualClose は接続単位。現在の接続IDと一致する場合のみユーザー切断として扱う
      const isManualForThisConn = manualClose && manualCloseConnId === thisConnId;

      // 明示的な解散/ユーザー切断の場合は再接続しない
      if (isManualForThisConn || event.code === 4000 || event.reason.includes('disbanded') || event.reason.includes('user_closed')) {
        manualClose = false;
        manualCloseConnId = null;
        notifyHandlers({ t: 'abort', p: { reason: 'disbanded' } });
        return;
      }
      
      // 自動再接続
      scheduleReconnect(url);
    };

    // 接続エラー
    ws.onerror = (error) => {
      console.error('[WebSocket] 接続エラー:', error);
      isConnecting = false;
      
      // エラー時の再接続
      scheduleReconnect(url);
    };

    // 接続タイムアウト
    setTimeout(() => {
      if (ws?.readyState === WebSocket.CONNECTING) {
        console.error('[WebSocket] 接続タイムアウト');
        ws.close();
        isConnecting = false;
        scheduleReconnect(url);
      }
    }, WS_CONFIG.TIMEOUT);

  } catch (error) {
    console.error('[WebSocket] 接続作成エラー:', error);
    isConnecting = false;
    scheduleReconnect(url);
  }
}

/**
 * 再接続をスケジュール
 */
function scheduleReconnect(url: string): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }

  const delay = Math.min(
    WS_CONFIG.BACKOFF_BASE * Math.pow(WS_CONFIG.BACKOFF_MULTIPLIER, connectionAttempts - 1),
    WS_CONFIG.BACKOFF_MAX
  );

  console.log(`[WebSocket] ${delay}ms後に再接続を試行します`);
  
  reconnectTimer = setTimeout(() => {
    connect(url);
  }, delay);
}

/**
 * ハートビート開始
 */
function startHeartbeat(): void {
  stopHeartbeat();
  
  heartbeatTimer = setInterval(() => {
    if (ws?.readyState === WebSocket.OPEN) {
      // 本番ログ抑制のため送信ログは出さない
      try {
        ws.send(JSON.stringify({ t: 'ping', p: Date.now() }));
      } catch {}
    }
  }, WS_CONFIG.HEARTBEAT_INTERVAL);
}

/**
 * ハートビート停止
 */
function stopHeartbeat(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

/**
 * メッセージ送信
 */
export function send(type: string, payload: any): boolean {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn('[WebSocket] 接続していないためメッセージを送信できません');
    return false;
  }

  const message = { t: type, p: payload };
  
  try {
    ws.send(JSON.stringify(message));
    if (import.meta.env.DEV) {
      // 開発時のみログ
      if (type !== 'ping') console.log('[WebSocket] メッセージ送信成功:', message);
    }
    return true;
  } catch (error) {
    console.error('[WebSocket] メッセージ送信エラー:', error);
    return false;
  }
}

/**
 * メッセージハンドラーを登録
 */
export function addMessageHandler(handler: (message: any) => void): () => void {
  messageHandlers.add(handler);
  
  // クリーンアップ関数を返す
  return () => {
    messageHandlers.delete(handler);
  };
}

/**
 * 全てのハンドラーにメッセージを通知
 */
function notifyHandlers(message: any): void {
  messageHandlers.forEach(handler => {
    try {
      handler(message);
    } catch (error) {
      console.error('[WebSocket] ハンドラー実行エラー:', error);
    }
  });
  // UI層（RoomCreate など）の既存リスナー向けにグローバル配信
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sw-msg', { detail: message }));
    }
  } catch {}
}

/**
 * ルームに接続
 */
export async function connectToRoom(roomId: string, nick: string, installId: string, isCustomMode?: boolean): Promise<void> {
  const url = `${WS_CONFIG.BASE_URL}/ws/room/${roomId}`.replace(/^http/, 'ws');
  
  // 再接続時にも自動でjoinできるようにペイロードを保持
  lastJoinPayload = { roomId, nick, installId, isCustomMode };
  hasJoined = false;
  await connect(url);
}

/**
 * 接続を切断
 */
export function disconnect(): void {
  console.log('[WebSocket] 接続を切断します');
  
  // タイマーをクリア
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  
  stopHeartbeat();
  
  // WebSocketを閉じる
  if (ws) {
    ws.close();
    ws = null;
  }
  
  // 状態をリセット
  isConnecting = false;
  connectionAttempts = 0;
}

/**
 * 接続状態を取得
 */
export function getConnectionState(): {
  isConnected: boolean;
  isConnecting: boolean;
  connectionAttempts: number;
} {
  return {
    isConnected: ws?.readyState === WebSocket.OPEN,
    isConnecting,
    connectionAttempts
  };
}

/**
 * 接続を強制的に切断
 */
export function forceDisconnect(): void {
  console.log('[WebSocket] 強制切断を実行します');
  
  // タイマーをクリア
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  
  stopHeartbeat();
  
  // WebSocketを閉じる（再接続抑止用フラグとコードを付与）
  if (ws) {
    manualClose = true;
    // 現在の接続IDに対して manualClose をセット
    manualCloseConnId = connectionIdCounter;
    try { ws.close(4000, 'user_closed'); } catch {}
    ws = null;
  }
  
  // 状態をリセット
  isConnecting = false;
  connectionAttempts = 0;
  hasJoined = false; // joinフラグもリセット
  
  console.log('[WebSocket] 強制切断完了');
}

/**
 * デバッグ情報を取得
 */
export function getDebugInfo(): any {
  return {
    ws: ws,
    wsState: ws?.readyState,
    wsUrl: ws?.url,
    isConnecting,
    connectionAttempts,
    maxAttempts: WS_CONFIG.MAX_RECONNECT_ATTEMPTS,
    messageHandlersCount: messageHandlers.size,
    timestamp: new Date().toISOString()
  };
}
