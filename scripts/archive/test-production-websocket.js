// 本番環境でのWebSocket接続テストスクリプト
const WebSocket = require('ws');

const PROD_WS_URL = 'wss://secret-werewolf-prod.qmdg2pmnw6.workers.dev';

// テスト用のルームID（先ほど作成したもの）
const roomId = 'BX12Z5';
const wsUrl = `${PROD_WS_URL}/ws/room/${roomId}`;

console.log('🚀 本番環境WebSocket接続テスト開始...');
console.log('接続先:', wsUrl);

const ws = new WebSocket(wsUrl);

ws.on('open', function open() {
  console.log('✅ 本番環境WebSocket接続成功');
  
  // 参加メッセージを送信
  const joinMessage = {
    t: 'join',
    p: {
      roomId: roomId,
      nick: '本番テストプレイヤー',
      installId: 'prod-test-' + Date.now()
    }
  };
  
  console.log('📤 参加メッセージ送信:', JSON.stringify(joinMessage, null, 2));
  ws.send(JSON.stringify(joinMessage));
});

ws.on('message', function message(data) {
  try {
    const msg = JSON.parse(data.toString());
    console.log('📥 受信メッセージ:', JSON.stringify(msg, null, 2));
    
    if (msg.t === 'you') {
      console.log('✅ プレイヤーID受信:', msg.p.playerId);
    }
    
    if (msg.t === 'state') {
      console.log('✅ ルーム状態受信:', {
        roomId: msg.p.roomId,
        phase: msg.p.phase,
        players: msg.p.players.length,
        mode: msg.p.mode,
        isAutoRoom: msg.p.isAutoRoom
      });
    }
    
    if (msg.t === 'phase') {
      console.log('✅ フェーズ変更受信:', {
        phase: msg.p.phase,
        endsAt: new Date(msg.p.endsAt).toISOString(),
        roundId: msg.p.roundId,
        phaseSeq: msg.p.phaseSeq
      });
    }
    
    if (msg.t === 'abort') {
      console.log('⚠️ ゲーム中断:', msg.p.reason);
    }
    
  } catch (error) {
    console.error('❌ メッセージ解析エラー:', error);
  }
});

ws.on('error', function error(err) {
  console.error('❌ WebSocketエラー:', err);
});

ws.on('close', function close(code, reason) {
  console.log('🔌 WebSocket接続終了:', code, reason.toString());
});

// 15秒後に接続を閉じる
setTimeout(() => {
  console.log('⏰ テスト終了、接続を閉じます');
  ws.close();
}, 15000);

