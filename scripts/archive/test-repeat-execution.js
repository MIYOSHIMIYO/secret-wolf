// 繰り返し実行のテスト
const WebSocket = require('ws');

async function testSingleCycle() {
  const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  const wsUrl = `wss://secret-werewolf-prod.qmdg2pmnw6.workers.dev/ws/room/${roomId}`;
  
  return new Promise((resolve) => {
    const ws = new WebSocket(wsUrl);
    let playerId = null;
    let stateReceived = false;
    let disbandSent = false;
    
    ws.on('open', () => {
      console.log(`✅ 接続成功 (${roomId})`);
      
      // joinメッセージを送信
      const joinMessage = {
        t: "join",
        p: {
          roomId: roomId,
          nick: "テストプレイヤー",
          installId: "test-install-id"
        }
      };
      
      ws.send(JSON.stringify(joinMessage));
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.t === 'you') {
          playerId = message.p.playerId;
        }
        
        if (message.t === 'state' && !stateReceived) {
          stateReceived = true;
          console.log(`📊 ルーム状態受信 (${roomId}): ${message.p.players.length}人`);
          
          // 解散メッセージを送信
          setTimeout(() => {
            if (!disbandSent) {
              disbandSent = true;
              const disbandMessage = { t: "disband", p: {} };
              ws.send(JSON.stringify(disbandMessage));
            }
          }, 500);
        }
        
        if (message.t === 'disband') {
          console.log(`✅ 解散完了 (${roomId})`);
          ws.close();
          resolve(true);
        }
        
        if (message.t === 'abort') {
          console.log(`✅ ゲーム中断完了 (${roomId})`);
          ws.close();
          resolve(true);
        }
        
      } catch (error) {
        console.error('❌ メッセージ解析エラー:', error);
      }
    });
    
    ws.on('close', (code, reason) => {
      if (code === 4000) {
        console.log(`🔌 正常終了 (${roomId})`);
        resolve(true);
      } else {
        console.log(`🔌 異常終了 (${roomId}): コード=${code}`);
        resolve(false);
      }
    });
    
    ws.on('error', (error) => {
      console.error(`❌ エラー (${roomId}):`, error.message);
      resolve(false);
    });
    
    // タイムアウト設定
    setTimeout(() => {
      console.log(`⏰ タイムアウト (${roomId})`);
      ws.close();
      resolve(false);
    }, 8000);
  });
}

async function testRepeatedExecution() {
  console.log('=== 繰り返し実行テスト ===');
  
  const results = [];
  const testCount = 5;
  
  for (let i = 1; i <= testCount; i++) {
    console.log(`\n--- テスト ${i}/${testCount} ---`);
    
    const result = await testSingleCycle();
    results.push(result);
    
    if (result) {
      console.log(`✅ テスト ${i} 成功`);
    } else {
      console.log(`❌ テスト ${i} 失敗`);
    }
    
    // 次のテストまでの待機時間
    if (i < testCount) {
      console.log('⏳ 次のテストまで待機中...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  const successCount = results.filter(r => r).length;
  const successRate = (successCount / testCount) * 100;
  
  console.log('\n=== テスト結果 ===');
  console.log(`成功: ${successCount}/${testCount} (${successRate.toFixed(1)}%)`);
  console.log(`結果詳細:`, results);
  
  if (successRate >= 80) {
    console.log('✅ 繰り返し実行テスト成功');
  } else {
    console.log('❌ 繰り返し実行テスト失敗');
  }
  
  return successRate >= 80;
}

// テスト実行
testRepeatedExecution().then(success => {
  if (success) {
    console.log('\n🎉 全てのテストが成功しました！');
  } else {
    console.log('\n💥 一部のテストが失敗しました');
  }
}).catch(error => {
  console.error('❌ テスト実行エラー:', error);
});
