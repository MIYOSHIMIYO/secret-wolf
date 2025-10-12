const WebSocket = require('ws');

const WORKER_URL = 'https://secret-werewolf-prod.qmdg2pmnw6.workers.dev';

// 設定修正後のテスト
async function testConfigurationFix() {
  console.log('🧪 設定修正後のテストを開始します...\n');
  
  try {
    // 1. ルーム作成
    console.log('📝 ルーム作成テスト...');
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
    const roomId = data.roomId;
    console.log(`✅ ルーム作成成功: ${roomId}\n`);
    
    // 2. WebSocket接続テスト
    console.log('🔌 WebSocket接続テスト...');
    const ws = new WebSocket(`${WORKER_URL}/ws/room/${roomId}`);
    
    return new Promise((resolve, reject) => {
      ws.on('open', () => {
        console.log('✅ WebSocket接続成功');
        
        // joinメッセージを送信
        ws.send(JSON.stringify({
          t: 'join',
          p: {
            nick: '設定テストプレイヤー',
            installId: 'config-test-1'
          }
        }));
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          console.log('📨 受信メッセージ:', message.t);
          
          if (message.t === 'state') {
            console.log('✅ ルーム状態受信成功');
            console.log(`📊 参加者数: ${message.p.players.length}人`);
            console.log(`🔧 isAutoRoom: ${message.p.isAutoRoom}`);
            console.log(`🌐 ルームID: ${message.p.roomId}`);
            
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
    
  } catch (error) {
    console.error('❌ テスト実行エラー:', error.message);
    return false;
  }
}

// メイン処理
async function main() {
  try {
    const success = await testConfigurationFix();
    
    if (success) {
      console.log('\n✅ 設定修正後のテスト成功！');
      console.log('🎉 環境変数の統一化が正常に動作しています');
    } else {
      console.log('\n❌ 設定修正後のテスト失敗');
    }
    
  } catch (error) {
    console.error('❌ テスト実行エラー:', error.message);
  }
}

main().catch(console.error);
