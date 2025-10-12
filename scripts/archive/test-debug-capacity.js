const WebSocket = require('ws');

const WORKER_URL = 'https://secret-werewolf-prod.qmdg2pmnw6.workers.dev';

// 知り合いモードのルームを作成
async function createFriendsRoom() {
  const response = await fetch(`${WORKER_URL}/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mode: 'FRIENDS'
    })
  });
  
  if (!response.ok) {
    throw new Error(`ルーム作成失敗: ${response.status}`);
  }
  
  const data = await response.json();
  return data.roomId;
}

// プレイヤーを参加させる
function joinPlayer(roomId, playerInfo) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WORKER_URL}/ws/room/${roomId}`);
    
    ws.on('open', () => {
      console.log(`✅ 接続成功: ${playerInfo.nick}`);
      ws.send(JSON.stringify({
        t: 'join',
        p: playerInfo
      }));
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        console.log(`📨 ${playerInfo.nick} 受信:`, message.t, message.p ? Object.keys(message.p) : '');
        
        if (message.t === 'state') {
          console.log(`📊 ${playerInfo.nick} 参加成功: ${message.p.players.length}人`);
          resolve({ ws, message });
        } else if (message.t === 'warn') {
          console.log(`⚠️ ${playerInfo.nick} 警告:`, message.p);
          resolve({ ws, message, isWarning: true });
        }
      } catch (error) {
        console.error(`❌ ${playerInfo.nick} メッセージ解析エラー:`, error.message);
      }
    });
    
    ws.on('error', (error) => {
      console.error(`❌ ${playerInfo.nick} 接続エラー:`, error.message);
      reject(error);
    });
    
    ws.on('close', (code, reason) => {
      console.log(`🔌 ${playerInfo.nick} 接続終了: code=${code}, reason=${reason}`);
    });
    
    // タイムアウト設定
    setTimeout(() => {
      ws.close();
      reject(new Error('タイムアウト'));
    }, 5000);
  });
}

// メイン処理
async function main() {
  console.log('🧪 人数制限デバッグテストを開始します...\n');
  
  try {
    // 1. ルーム作成
    const roomId = await createFriendsRoom();
    console.log(`✅ ルーム作成成功: ${roomId}\n`);
    
    // 2. 8人まで参加させる
    console.log('👥 8人まで参加させます...');
    const connections = [];
    
    for (let i = 1; i <= 8; i++) {
      const playerInfo = {
        nick: `テストプレイヤー${i}`,
        installId: `test-install-${i}`
      };
      
      const result = await joinPlayer(roomId, playerInfo);
      connections.push(result.ws);
      
      if (result.isWarning) {
        console.log(`❌ プレイヤー${i}が警告を受けました`);
        break;
      }
      
      // 少し待機
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`\n📊 現在の参加者数: ${connections.length}人\n`);
    
    // 3. 9人目を参加させて人数制限をテスト
    console.log('🚫 9人目を参加させて人数制限をテスト...');
    const playerInfo9 = {
      nick: 'テストプレイヤー9',
      installId: 'test-install-9'
    };
    
    try {
      const result9 = await joinPlayer(roomId, playerInfo9);
      
      if (result9.isWarning) {
        console.log('✅ 人数制限が正しく動作しました！');
        console.log(`📝 エラーメッセージ: ${result9.message.p.msg}`);
      } else {
        console.log('❌ 人数制限が動作していません（9人目が参加できました）');
        connections.push(result9.ws);
      }
    } catch (error) {
      if (error.message.includes('タイムアウト')) {
        console.log('❌ 人数制限が動作していません（タイムアウト）');
      } else {
        console.error('❌ 9人目参加時のエラー:', error.message);
      }
    }
    
    // 4. 接続をクリーンアップ
    console.log('\n🧹 接続をクリーンアップ中...');
    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });
    
    console.log('\n✅ デバッグテスト完了！');
    
  } catch (error) {
    console.error('❌ テスト実行エラー:', error.message);
  }
}

main().catch(console.error);
