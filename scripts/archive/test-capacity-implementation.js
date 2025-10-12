const WebSocket = require('ws');

const WORKER_URL = 'https://secret-werewolf-prod.qmdg2pmnw6.workers.dev';
const ROOM_CAPACITY = 8;

// テスト用のルームIDを生成
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// プレイヤー情報を生成
function generatePlayerInfo(index) {
  return {
    nick: `テストプレイヤー${index}`,
    installId: `test-install-${index}`
  };
}

// WebSocket接続を作成
function createConnection(roomId, playerInfo) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WORKER_URL}/ws/room/${roomId}`);
    
    ws.on('open', () => {
      console.log(`✅ 接続成功: ${playerInfo.nick}`);
      ws.send(JSON.stringify({
        t: 'join',
        p: playerInfo
      }));
      resolve(ws);
    });
    
    ws.on('error', (error) => {
      console.error(`❌ 接続エラー: ${playerInfo.nick}`, error.message);
      reject(error);
    });
    
    ws.on('close', (code, reason) => {
      console.log(`🔌 接続終了: ${playerInfo.nick} (code: ${code}, reason: ${reason})`);
    });
  });
}

// メッセージを待機
function waitForMessage(ws, expectedType, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`タイムアウト: ${expectedType}メッセージを受信できませんでした`));
    }, timeout);
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        if (message.t === expectedType) {
          clearTimeout(timer);
          resolve(message);
        }
      } catch (error) {
        // JSON解析エラーは無視
      }
    });
  });
}

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

// 人数制限テストを実行
async function testCapacityLimits() {
  console.log('🧪 人数制限テストを開始します...\n');
  
  try {
    // 1. 知り合いモードのルームを作成
    console.log('📝 知り合いモードのルームを作成中...');
    const roomId = await createFriendsRoom();
    console.log(`✅ ルーム作成成功: ${roomId}\n`);
    
    // 2. 8人まで参加させる
    console.log('👥 8人まで参加させます...');
    const connections = [];
    
    for (let i = 1; i <= ROOM_CAPACITY; i++) {
      try {
        const playerInfo = generatePlayerInfo(i);
        const ws = await createConnection(roomId, playerInfo);
        
        // stateメッセージを待機
        const stateMessage = await waitForMessage(ws, 'state', 3000);
        console.log(`✅ プレイヤー${i}参加成功: ${stateMessage.p.players.length}人`);
        
        connections.push(ws);
        
        // 少し待機
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ プレイヤー${i}参加失敗:`, error.message);
        break;
      }
    }
    
    console.log(`\n📊 現在の参加者数: ${connections.length}人\n`);
    
    // 3. 9人目を参加させて人数制限をテスト
    console.log('🚫 9人目を参加させて人数制限をテスト...');
    try {
      const playerInfo = generatePlayerInfo(9);
      const ws = await createConnection(roomId, playerInfo);
      
      // warnメッセージを待機
      const warnMessage = await waitForMessage(ws, 'warn', 3000);
      
      if (warnMessage.p.code === 'ROOM_FULL') {
        console.log('✅ 人数制限が正しく動作しました！');
        console.log(`📝 エラーメッセージ: ${warnMessage.p.msg}`);
      } else {
        console.log('❌ 予期しないエラーコード:', warnMessage.p.code);
      }
      
      ws.close();
    } catch (error) {
      if (error.message.includes('タイムアウト')) {
        console.log('❌ 人数制限が動作していません（タイムアウト）');
      } else {
        console.error('❌ 9人目参加時のエラー:', error.message);
      }
    }
    
    // 4. 1人退出させて再度参加を試行
    console.log('\n🔄 1人退出させて再度参加を試行...');
    if (connections.length > 0) {
      connections[0].close();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        const playerInfo = generatePlayerInfo(10);
        const ws = await createConnection(roomId, playerInfo);
        
        const stateMessage = await waitForMessage(ws, 'state', 3000);
        console.log('✅ 空きが出た後の参加成功！');
        console.log(`📊 現在の参加者数: ${stateMessage.p.players.length}人`);
        
        ws.close();
      } catch (error) {
        console.error('❌ 空き後の参加失敗:', error.message);
      }
    }
    
    // 5. 接続をクリーンアップ
    console.log('\n🧹 接続をクリーンアップ中...');
    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });
    
    console.log('\n✅ 人数制限テスト完了！');
    
  } catch (error) {
    console.error('❌ テスト実行エラー:', error.message);
  }
}

// テストを実行
testCapacityLimits().catch(console.error);
