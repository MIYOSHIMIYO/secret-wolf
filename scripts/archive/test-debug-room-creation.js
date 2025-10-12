const WebSocket = require('ws');

const WORKER_URL = 'https://secret-werewolf-prod.qmdg2pmnw6.workers.dev';

// 知り合いモードのルームを作成
async function createFriendsRoom() {
  console.log('📝 知り合いモードのルームを作成中...');
  
  try {
    const response = await fetch(`${WORKER_URL}/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: 'FRIENDS'
      })
    });
    
    console.log(`📊 レスポンスステータス: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ ルーム作成失敗: ${response.status} - ${errorText}`);
      return null;
    }
    
    const data = await response.json();
    console.log(`✅ ルーム作成成功: ${data.roomId}`);
    return data.roomId;
  } catch (error) {
    console.error('❌ ルーム作成エラー:', error.message);
    return null;
  }
}

// WebSocket接続をテスト
async function testWebSocketConnection(roomId) {
  console.log(`🔌 WebSocket接続をテスト中: ${roomId}`);
  
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WORKER_URL}/ws/room/${roomId}`);
    
    ws.on('open', () => {
      console.log('✅ WebSocket接続成功');
      
      // joinメッセージを送信
      ws.send(JSON.stringify({
        t: 'join',
        p: {
          nick: 'テストプレイヤー',
          installId: 'test-install-1'
        }
      }));
      
      // メッセージを待機
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          console.log('📨 受信メッセージ:', message);
          
          if (message.t === 'state') {
            console.log('✅ ルーム状態受信成功');
            ws.close();
            resolve(true);
          } else if (message.t === 'warn') {
            console.log('⚠️ 警告メッセージ:', message.p);
            ws.close();
            resolve(false);
          }
        } catch (error) {
          console.error('❌ メッセージ解析エラー:', error.message);
        }
      });
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket接続エラー:', error.message);
      reject(error);
    });
    
    ws.on('close', (code, reason) => {
      console.log(`🔌 WebSocket接続終了: code=${code}, reason=${reason}`);
    });
    
    // タイムアウト設定
    setTimeout(() => {
      ws.close();
      reject(new Error('タイムアウト'));
    }, 10000);
  });
}

// メイン処理
async function main() {
  console.log('🧪 デバッグテストを開始します...\n');
  
  try {
    // 1. ルーム作成
    const roomId = await createFriendsRoom();
    if (!roomId) {
      console.log('❌ ルーム作成に失敗したため、テストを終了します');
      return;
    }
    
    console.log('');
    
    // 2. WebSocket接続テスト
    const success = await testWebSocketConnection(roomId);
    
    if (success) {
      console.log('\n✅ デバッグテスト成功！');
    } else {
      console.log('\n❌ デバッグテスト失敗');
    }
    
  } catch (error) {
    console.error('❌ テスト実行エラー:', error.message);
  }
}

main().catch(console.error);
