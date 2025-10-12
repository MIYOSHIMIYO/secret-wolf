import WebSocket from 'ws';

// テスト結果を記録するオブジェクト
const testResults = {
  passed: 0,
  failed: 0,
  total: 0
};

// テスト結果を記録する関数
function recordTestResult(testName, passed) {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${testName}: 成功`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName}: 失敗`);
  }
}

// テスト結果を表示する関数
function displayTestResults() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 テスト結果サマリー');
  console.log('='.repeat(60));
  console.log(`総テスト数: ${testResults.total}`);
  console.log(`成功: ${testResults.passed}`);
  console.log(`失敗: ${testResults.failed}`);
  console.log(`成功率: ${testResults.total > 0 ? Math.round((testResults.passed / testResults.total) * 100) : 0}%`);
  console.log('='.repeat(60));
}

// ヘルスチェック関数
async function healthCheck() {
  try {
    const response = await fetch('http://localhost:8787/healthz');
    return response.ok;
  } catch (error) {
    return false;
  }
}

// WebSocket接続テスト
async function testWebSocketConnection() {
  console.log('\n🔌 WebSocket接続テスト開始');
  
  return new Promise((resolve) => {
    const ws = new WebSocket('ws://localhost:8787/ws/room/test-room-123');
    
    const timeout = setTimeout(() => {
      console.log('⏰ WebSocket接続タイムアウト');
      ws.close();
      resolve(false);
    }, 5000);
    
    ws.on('open', () => {
      console.log('✅ WebSocket接続が確立されました');
      clearTimeout(timeout);
      ws.close();
      resolve(true);
    });
    
    ws.on('error', (error) => {
      console.log(`❌ WebSocket接続エラー: ${error.message}`);
      clearTimeout(timeout);
      resolve(false);
    });
  });
}

// 複数クライアント接続テスト
async function testMultipleClients() {
  console.log('\n👥 複数クライアント接続テスト開始');
  
  return new Promise((resolve) => {
    const clients = [];
    const maxClients = 3;
    let connectedCount = 0;
    
    const timeout = setTimeout(() => {
      console.log('⏰ 複数クライアント接続テストタイムアウト');
      clients.forEach(ws => ws.close());
      resolve(false);
    }, 10000);
    
    for (let i = 0; i < maxClients; i++) {
      const ws = new WebSocket('ws://localhost:8787/ws/room/test-room-multi');
      
      ws.on('open', () => {
        connectedCount++;
        console.log(`✅ クライアント ${i + 1} が接続されました`);
        
        if (connectedCount === maxClients) {
          console.log('✅ 全てのクライアントが接続されました');
          clearTimeout(timeout);
          clients.forEach(ws => ws.close());
          resolve(true);
        }
      });
      
      ws.on('error', (error) => {
        console.log(`❌ クライアント ${i + 1} 接続エラー: ${error.message}`);
        clearTimeout(timeout);
        resolve(false);
      });
      
      clients.push(ws);
    }
  });
}

// メッセージ送受信テスト
async function testMessageExchange() {
  console.log('\n📨 メッセージ送受信テスト開始');
  
  return new Promise((resolve) => {
    const ws = new WebSocket('ws://localhost:8787/ws/room/test-room-message');
    let messageReceived = false;
    
    const timeout = setTimeout(() => {
      console.log('⏰ メッセージ送受信テストタイムアウト');
      ws.close();
      resolve(false);
    }, 5000);
    
    ws.on('open', () => {
      console.log('✅ WebSocket接続が確立されました');
      
      // テストメッセージを送信
      const testMessage = {
        t: "join",
        p: {
          roomId: "test-room-message",
          nick: "テストユーザー",
          installId: "test-install-123"
        }
      };
      
      ws.send(JSON.stringify(testMessage));
      console.log('📤 テストメッセージを送信しました');
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('📥 メッセージを受信しました:', message.t);
        
        if (message.t === "state" || message.t === "error") {
          messageReceived = true;
          console.log('✅ メッセージ送受信テスト成功');
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        }
      } catch (error) {
        console.log(`❌ メッセージ解析エラー: ${error.message}`);
        clearTimeout(timeout);
        ws.close();
        resolve(false);
      }
    });
    
    ws.on('error', (error) => {
      console.log(`❌ WebSocketエラー: ${error.message}`);
      clearTimeout(timeout);
      resolve(false);
    });
  });
}

// 自動マッチングルーム作成テスト（STRANGERモード）
async function testAutoRoomCreation() {
  console.log('\n�� 自動マッチングルーム作成テスト開始（STRANGERモード）');
  
  try {
    const response = await fetch('http://localhost:8787/auto', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        mode: 'STRANGER',
        nick: 'テストユーザー1',
        installId: 'test-install-1'
      })
    });
    
    const data = await response.json();
    
    if (data.roomId) {
      console.log(`✅ 自動マッチングルームが作成されました: ${data.roomId}`);
      return { success: true, roomId: data.roomId };
    } else {
      console.log('❌ ルームIDが取得できませんでした');
      return { success: false };
    }
  } catch (error) {
    console.log(`❌ 自動マッチングルーム作成に失敗: ${error.message}`);
    return { success: false };
  }
}

// STRANGERモードの完全なマッチングテスト
async function testStrangerMatchingFlow() {
  console.log('\n�� STRANGERモード完全マッチングテスト開始');
  
  // 1人目のプレイヤーでルームを作成
  console.log('�� 1人目のプレイヤーがSTRANGERモードでルームを作成中...');
  const room1 = await testAutoRoomCreation();
  if (!room1.success) {
    return false;
  }
  
  // 2人目のプレイヤーで同じルームに参加
  console.log('�� 2人目のプレイヤーがSTRANGERモードで同じルームに参加中...');
  const room2 = await testAutoRoomCreation();
  if (!room2.success) {
    return false;
  }
  
  // 同じルームIDかチェック
  if (room1.roomId !== room2.roomId) {
    console.log(`❌ 異なるルームにマッチングされました: ${room1.roomId} vs ${room2.roomId}`);
    return false;
  }
  
  console.log('✅ 2人のプレイヤーが同じルームにマッチングされました');
  
  // 両方のプレイヤーがWebSocketで接続して、離脱テストを実行
  return new Promise((resolve) => {
    const roomId = room1.roomId;
    let player1Connected = false;
    let player2Connected = false;
    let player1Left = false;
    let player2Left = false;
    
    const timeout = setTimeout(() => {
      console.log('⏰ STRANGERモードマッチングテストタイムアウト');
      resolve(false);
    }, 15000);
    
    // 1人目のプレイヤーの接続
    const ws1 = new WebSocket(`ws://localhost:8787/ws/room/${roomId}`);
    ws1.on('open', () => {
      console.log('✅ 1人目のプレイヤーの接続が確立されました');
      player1Connected = true;
      
      const joinMessage = {
        t: "join",
        p: {
          roomId: roomId,
          nick: "プレイヤー1",
          installId: "test-player-1"
        }
      };
      ws1.send(JSON.stringify(joinMessage));
    });
    
    ws1.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.t === "state") {
          const players = message.p?.players || [];
          console.log(`�� 1人目プレイヤー視点 - 現在のプレイヤー数: ${players.length}`);
          
          // 2人揃ったら1人目が離脱
          if (players.length >= 2 && !player1Left) {
            console.log('📤 1人目のプレイヤーが離脱します');
            const leaveMessage = { t: "leave", p: {} };
            ws1.send(JSON.stringify(leaveMessage));
            player1Left = true;
          }
        }
        
        if (message.t === "abort") {
          console.log('✅ 1人目のプレイヤーがルーム終了を受信しました');
          ws1.close();
        }
      } catch (error) {
        console.error('❌ 1人目プレイヤーのメッセージ解析エラー:', error);
      }
    });
    
    // 2人目のプレイヤーの接続
    const ws2 = new WebSocket(`ws://localhost:8787/ws/room/${roomId}`);
    ws2.on('open', () => {
      console.log('✅ 2人目のプレイヤーの接続が確立されました');
      player2Connected = true;
      
      const joinMessage = {
        t: "join",
        p: {
          roomId: roomId,
          nick: "プレイヤー2",
          installId: "test-player-2"
        }
      };
      ws2.send(JSON.stringify(joinMessage));
    });
    
    ws2.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.t === "state") {
          const players = message.p?.players || [];
          console.log(`�� 2人目プレイヤー視点 - 現在のプレイヤー数: ${players.length}`);
          
          // 1人目が離脱した後、2人目も離脱
          if (players.length === 1 && player1Left && !player2Left) {
            console.log('📤 2人目のプレイヤーが離脱します');
            const leaveMessage = { t: "leave", p: {} };
            ws2.send(JSON.stringify(leaveMessage));
            player2Left = true;
          }
        }
        
        if (message.t === "abort") {
          console.log('✅ 2人目のプレイヤーがルーム終了を受信しました');
          ws2.close();
          
          // 両方のプレイヤーが離脱してルームが削除された
          if (player1Left && player2Left) {
            console.log('✅ ルームが正常に削除されました');
            clearTimeout(timeout);
            resolve(true);
          }
        }
      } catch (error) {
        console.error('❌ 2人目プレイヤーのメッセージ解析エラー:', error);
      }
    });
    
    ws1.on('error', (error) => {
      console.error('❌ 1人目プレイヤーのWebSocketエラー:', error);
    });
    
    ws2.on('error', (error) => {
      console.error('❌ 2人目プレイヤーのWebSocketエラー:', error);
    });
  });
}

// メイン実行
async function main() {
  console.log('�� WebSocket接続のテストを開始します...');
  
  // ヘルスチェック
  if (!(await healthCheck())) {
    console.log('\n❌ Workerが起動していません。先にWorkerを起動してください。');
    console.log('  例: cd packages/worker && npm run dev');
    process.exit(1);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('�� WebSocketテスト開始');
  console.log('='.repeat(60));
  
  // 各テストを実行
  const connectionTest = await testWebSocketConnection();
  recordTestResult('WebSocket接続テスト', connectionTest);
  
  const multipleClientsTest = await testMultipleClients();
  recordTestResult('複数クライアント接続テスト', multipleClientsTest);
  
  const messageTest = await testMessageExchange();
  recordTestResult('メッセージ送受信テスト', messageTest);
  
  const autoRoomTest = await testAutoRoomCreation();
  recordTestResult('自動マッチングルーム作成テスト（STRANGER）', autoRoomTest.success);
  
  const strangerFlowTest = await testStrangerMatchingFlow();
  recordTestResult('STRANGERモード完全マッチングテスト', strangerFlowTest);
  
  // 結果を表示
  displayTestResults();
  
  // 終了コード
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// スクリプト実行
main().catch(error => {
  console.error('❌ テスト実行中にエラーが発生しました:', error);
  process.exit(1);
});