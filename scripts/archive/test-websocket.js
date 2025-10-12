const WebSocket = require('ws');

console.log('WebSocket接続テスト開始...');

const roomId = 'TEST123';
const wsUrl = `wss://secret-werewolf-prod.qmdg2pmnw6.workers.dev/ws/room/${roomId}`;

console.log('接続先:', wsUrl);

const ws = new WebSocket(wsUrl);

ws.on('open', () => {
  console.log('✅ WebSocket接続成功！');
  
  // joinメッセージを送信
  const joinMessage = {
    t: "join",
    p: {
      roomId: roomId,
      nick: "test-user",
      installId: "test-install-id"
    }
  };
  
  console.log('joinメッセージ送信:', JSON.stringify(joinMessage));
  ws.send(JSON.stringify(joinMessage));
});

ws.on('message', (data) => {
  console.log('📨 メッセージ受信:', data.toString());
  
  try {
    const message = JSON.parse(data.toString());
    console.log('📨 パース済みメッセージ:', message);
    
    if (message.t === 'you') {
      console.log('✅ プレイヤーID受信:', message.p.playerId);
    } else if (message.t === 'state') {
      console.log('✅ ルーム状態受信:', message.p);
    }
  } catch (error) {
    console.log('❌ メッセージパースエラー:', error.message);
  }
});

ws.on('error', (error) => {
  console.log('❌ WebSocket接続エラー:', error.message);
});

ws.on('close', (code, reason) => {
  console.log(`🔌 WebSocket接続終了: コード=${code}, 理由=${reason}`);
});

// 10秒でタイムアウト
setTimeout(() => {
  if (ws.readyState === WebSocket.OPEN) {
    console.log('⏰ テスト完了、接続を閉じます');
    ws.close();
  } else {
    console.log('⏰ タイムアウト、接続を閉じます');
    ws.close();
  }
}, 10000);