/**
 * バックエンドのデバッグテスト
 * バックエンドでjoinメッセージが正しく処理されているかを確認
 */

const WebSocket = require('ws');

const WS_URL = 'wss://secret-werewolf-prod.qmdg2pmnw6.workers.dev';
const TEST_ROOM_ID = 'DEBUG' + Math.random().toString(36).substring(2, 6).toUpperCase();

class BackendDebugger {
  constructor() {
    this.ws = null;
    this.messageCount = 0;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      const wsUrl = `${WS_URL}/ws/room/${TEST_ROOM_ID}`;
      console.log(`[デバッグ] WebSocket接続開始: ${wsUrl}`);
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.on('open', () => {
        console.log(`[デバッグ] WebSocket接続成功`);
        resolve();
      });
      
      this.ws.on('error', (error) => {
        console.error(`[デバッグ] WebSocket接続エラー:`, error);
        reject(error);
      });
      
      this.ws.on('message', (data) => {
        this.messageCount++;
        const message = JSON.parse(data.toString());
        console.log(`[デバッグ] メッセージ #${this.messageCount}:`, {
          t: message.t,
          p: message.p ? Object.keys(message.p) : 'no payload',
          fullMessage: message
        });
      });
    });
  }

  async sendJoin() {
    const joinMessage = {
      t: 'join',
      p: {
        roomId: TEST_ROOM_ID,
        nick: 'デバッグユーザー',
        installId: 'debug-install-id-' + Date.now(),
        isCustomMode: true
      }
    };
    
    console.log(`[デバッグ] joinメッセージ送信:`, JSON.stringify(joinMessage, null, 2));
    this.ws.send(JSON.stringify(joinMessage));
  }

  async runDebug() {
    try {
      console.log(`[デバッグ] バックエンドデバッグ開始`);
      console.log(`[デバッグ] ルームID: ${TEST_ROOM_ID}`);
      
      await this.connect();
      await this.sendJoin();
      
      // 5秒間待機してメッセージを確認
      console.log(`[デバッグ] 5秒間待機中...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      console.log(`[デバッグ] 受信メッセージ数: ${this.messageCount}`);
      
    } catch (error) {
      console.error(`[デバッグ] デバッグ実行エラー:`, error);
    } finally {
      if (this.ws) {
        this.ws.close();
      }
    }
  }
}

// デバッグ実行
async function runBackendDebug() {
  const backendDebugger = new BackendDebugger();
  await backendDebugger.runDebug();
}

runBackendDebug().catch(console.error);
