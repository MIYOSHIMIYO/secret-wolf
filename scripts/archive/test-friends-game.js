// 知り合いとの遊び機能のE2Eテスト
const WebSocket = require('ws');

const PROD_WS_URL = 'wss://secret-werewolf-prod.qmdg2pmnw6.workers.dev';
const roomId = 'U7LURH'; // 先ほど作成したルームID
const wsUrl = `${PROD_WS_URL}/ws/room/${roomId}`;

console.log('👥 知り合いとの遊び機能E2Eテスト開始...');
console.log('ルームID:', roomId);
console.log('接続先:', wsUrl);

// プレイヤー1（ホスト）
const player1 = new WebSocket(wsUrl);
let player1Id = null;

player1.on('open', function open() {
  console.log('✅ プレイヤー1（ホスト）接続成功');
  
  const joinMessage = {
    t: 'join',
    p: {
      roomId: roomId,
      nick: 'ホストプレイヤー',
      installId: 'host-' + Date.now()
    }
  };
  
  console.log('📤 プレイヤー1参加メッセージ送信');
  player1.send(JSON.stringify(joinMessage));
});

player1.on('message', function message(data) {
  try {
    const msg = JSON.parse(data.toString());
    
    if (msg.t === 'you') {
      player1Id = msg.p.playerId;
      console.log('✅ プレイヤー1 ID受信:', player1Id);
    }
    
    if (msg.t === 'state') {
      console.log('📊 ルーム状態更新:', {
        phase: msg.p.phase,
        players: msg.p.players.length,
        hostId: msg.p.hostId,
        mode: msg.p.mode
      });
      
      // 3人揃ったらゲーム開始
      if (msg.p.players.length >= 3 && msg.p.phase === 'LOBBY') {
        console.log('🎮 3人揃いました！ゲーム開始します');
        setTimeout(() => {
          const startMessage = { t: 'start', p: {} };
          console.log('📤 ゲーム開始メッセージ送信');
          player1.send(JSON.stringify(startMessage));
        }, 1000);
      }
    }
    
    if (msg.t === 'phase') {
      console.log('🔄 フェーズ変更:', {
        phase: msg.p.phase,
        endsAt: new Date(msg.p.endsAt).toISOString()
      });
    }
    
  } catch (error) {
    console.error('❌ プレイヤー1 メッセージ解析エラー:', error);
  }
});

// プレイヤー2
setTimeout(() => {
  const player2 = new WebSocket(wsUrl);
  
  player2.on('open', function open() {
    console.log('✅ プレイヤー2接続成功');
    
    const joinMessage = {
      t: 'join',
      p: {
        roomId: roomId,
        nick: 'プレイヤー2',
        installId: 'player2-' + Date.now()
      }
    };
    
    console.log('📤 プレイヤー2参加メッセージ送信');
    player2.send(JSON.stringify(joinMessage));
  });
  
  player2.on('message', function message(data) {
    try {
      const msg = JSON.parse(data.toString());
      
      if (msg.t === 'you') {
        console.log('✅ プレイヤー2 ID受信:', msg.p.playerId);
      }
      
      if (msg.t === 'state') {
        console.log('📊 プレイヤー2 ルーム状態更新:', {
          phase: msg.p.phase,
          players: msg.p.players.length
        });
      }
      
    } catch (error) {
      console.error('❌ プレイヤー2 メッセージ解析エラー:', error);
    }
  });
  
}, 2000);

// プレイヤー3
setTimeout(() => {
  const player3 = new WebSocket(wsUrl);
  
  player3.on('open', function open() {
    console.log('✅ プレイヤー3接続成功');
    
    const joinMessage = {
      t: 'join',
      p: {
        roomId: roomId,
        nick: 'プレイヤー3',
        installId: 'player3-' + Date.now()
      }
    };
    
    console.log('📤 プレイヤー3参加メッセージ送信');
    player3.send(JSON.stringify(joinMessage));
  });
  
  player3.on('message', function message(data) {
    try {
      const msg = JSON.parse(data.toString());
      
      if (msg.t === 'you') {
        console.log('✅ プレイヤー3 ID受信:', msg.p.playerId);
      }
      
      if (msg.t === 'state') {
        console.log('📊 プレイヤー3 ルーム状態更新:', {
          phase: msg.p.phase,
          players: msg.p.players.length
        });
      }
      
    } catch (error) {
      console.error('❌ プレイヤー3 メッセージ解析エラー:', error);
    }
  });
  
}, 4000);

// 30秒後にテスト終了
setTimeout(() => {
  console.log('⏰ テスト終了');
  process.exit(0);
}, 30000);

