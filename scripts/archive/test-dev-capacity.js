const WebSocket = require('ws');

const DEV_WORKER_URL = 'http://localhost:8787';

// 開発環境での人数制限テスト
async function testDevCapacity() {
  console.log('🧪 開発環境での人数制限テストを開始します...\n');
  
  try {
    // 1. ルーム作成
    console.log('📝 ルーム作成テスト...');
    const response = await fetch(`${DEV_WORKER_URL}/rooms`, {
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
    const roomId = data.roomId;
    console.log(`✅ ルーム作成成功: ${roomId}\n`);
    
    // 2. 8人まで参加させる
    console.log('👥 8人まで参加させます...');
    const connections = [];
    
    for (let i = 1; i <= 8; i++) {
      const playerInfo = {
        nick: `開発テストプレイヤー${i}`,
        installId: `dev-test-${i}`
      };
      
      const ws = new WebSocket(`${DEV_WORKER_URL}/ws/room/${roomId}`);
      
      await new Promise((resolve, reject) => {
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
            if (message.t === 'state') {
              console.log(`📊 ${playerInfo.nick} 参加成功: ${message.p.players.length}人`);
              console.log(`🔧 isAutoRoom: ${message.p.isAutoRoom}`);
              connections.push(ws);
              resolve();
            } else if (message.t === 'warn') {
              console.log(`⚠️ ${playerInfo.nick} 警告:`, message.p);
              resolve();
            }
          } catch (error) {
            console.error(`❌ ${playerInfo.nick} メッセージ解析エラー:`, error.message);
          }
        });
        
        ws.on('error', (error) => {
          console.error(`❌ ${playerInfo.nick} 接続エラー:`, error.message);
          reject(error);
        });
        
        setTimeout(() => {
          ws.close();
          reject(new Error('タイムアウト'));
        }, 5000);
      });
      
      // 少し待機
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`\n📊 現在の参加者数: ${connections.length}人\n`);
    
    // 3. 9人目を参加させて人数制限をテスト
    console.log('🚫 9人目を参加させて人数制限をテスト...');
    const playerInfo9 = {
      nick: '開発テストプレイヤー9',
      installId: 'dev-test-9'
    };
    
    try {
      const ws9 = new WebSocket(`${DEV_WORKER_URL}/ws/room/${roomId}`);
      
      await new Promise((resolve, reject) => {
        ws9.on('open', () => {
          console.log(`✅ 接続成功: ${playerInfo9.nick}`);
          ws9.send(JSON.stringify({
            t: 'join',
            p: playerInfo9
          }));
        });
        
        ws9.on('message', (data) => {
          try {
            const message = JSON.parse(data);
            console.log(`📨 ${playerInfo9.nick} 受信:`, message.t);
            
            if (message.t === 'state') {
              console.log('❌ 人数制限が動作していません（9人目が参加できました）');
              console.log(`📊 参加者数: ${message.p.players.length}人`);
              ws9.close();
              resolve();
            } else if (message.t === 'warn') {
              if (message.p.code === 'ROOM_FULL') {
                console.log('✅ 人数制限が正しく動作しました！');
                console.log(`📝 エラーメッセージ: ${message.p.msg}`);
              } else {
                console.log('⚠️ 予期しない警告:', message.p);
              }
              ws9.close();
              resolve();
            }
          } catch (error) {
            console.error(`❌ ${playerInfo9.nick} メッセージ解析エラー:`, error.message);
          }
        });
        
        ws9.on('error', (error) => {
          console.error(`❌ ${playerInfo9.nick} 接続エラー:`, error.message);
          reject(error);
        });
        
        ws9.on('close', (code, reason) => {
          console.log(`🔌 ${playerInfo9.nick} 接続終了: code=${code}, reason=${reason}`);
        });
        
        setTimeout(() => {
          ws9.close();
          reject(new Error('タイムアウト'));
        }, 5000);
      });
      
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
    
    console.log('\n✅ 開発環境テスト完了！');
    
  } catch (error) {
    console.error('❌ テスト実行エラー:', error.message);
  }
}

// メイン処理
async function main() {
  // 開発環境の起動を待つ
  console.log('⏳ 開発環境の起動を待っています...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    await testDevCapacity();
  } catch (error) {
    console.error('❌ テスト実行エラー:', error.message);
  }
}

main().catch(console.error);
