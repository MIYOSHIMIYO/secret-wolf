// 知らない人との遊び機能（自動マッチング）のE2Eテスト
const WebSocket = require('ws');

const PROD_WS_URL = 'wss://secret-werewolf-prod.qmdg2pmnw6.workers.dev';

console.log('🎲 知らない人との遊び機能E2Eテスト開始...');

// 自動マッチングでルームを取得
async function getAutoRoom() {
  try {
    const response = await fetch('https://secret-werewolf-prod.qmdg2pmnw6.workers.dev/auto', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        mode: 'LOVE',
        nick: '自動マッチングテスト',
        installId: 'auto-test-' + Date.now()
      })
    });
    
    const data = await response.json();
    console.log('📡 自動マッチングAPI応答:', data);
    return data.roomId;
  } catch (error) {
    console.error('❌ 自動マッチングAPI エラー:', error);
    return null;
  }
}

// プレイヤー1（自動マッチング）
getAutoRoom().then(roomId1 => {
  if (!roomId1) return;
  
  console.log('🎯 プレイヤー1 ルームID:', roomId1);
  const player1 = new WebSocket(`${PROD_WS_URL}/ws/room/${roomId1}`);
  
  player1.on('open', function open() {
    console.log('✅ プレイヤー1（自動マッチング）接続成功');
    
    const joinMessage = {
      t: 'auto',
      p: {
        mode: 'LOVE',
        nick: '自動マッチングプレイヤー1',
        installId: 'auto1-' + Date.now()
      }
    };
    
    console.log('📤 プレイヤー1自動マッチング参加メッセージ送信');
    player1.send(JSON.stringify(joinMessage));
  });
  
  player1.on('message', function message(data) {
    try {
      const msg = JSON.parse(data.toString());
      
      if (msg.t === 'you') {
        console.log('✅ プレイヤー1 ID受信:', msg.p.playerId);
      }
      
      if (msg.t === 'state') {
        console.log('📊 プレイヤー1 ルーム状態更新:', {
          phase: msg.p.phase,
          players: msg.p.players.length,
          isAutoRoom: msg.p.isAutoRoom,
          mode: msg.p.mode
        });
      }
      
      if (msg.t === 'phase') {
        console.log('🔄 プレイヤー1 フェーズ変更:', {
          phase: msg.p.phase,
          endsAt: new Date(msg.p.endsAt).toISOString()
        });
      }
      
    } catch (error) {
      console.error('❌ プレイヤー1 メッセージ解析エラー:', error);
    }
  });
  
  // 2秒後にプレイヤー2を追加
  setTimeout(() => {
    getAutoRoom().then(roomId2 => {
      if (!roomId2) return;
      
      console.log('🎯 プレイヤー2 ルームID:', roomId2);
      
      // 同じルームIDかチェック
      if (roomId1 === roomId2) {
        console.log('✅ プレイヤー2が同じルームに参加します');
      } else {
        console.log('⚠️ プレイヤー2が異なるルームに参加します（新規ルーム作成）');
      }
      
      const player2 = new WebSocket(`${PROD_WS_URL}/ws/room/${roomId2}`);
      
      player2.on('open', function open() {
        console.log('✅ プレイヤー2（自動マッチング）接続成功');
        
        const joinMessage = {
          t: 'auto',
          p: {
            mode: 'LOVE',
            nick: '自動マッチングプレイヤー2',
            installId: 'auto2-' + Date.now()
          }
        };
        
        console.log('📤 プレイヤー2自動マッチング参加メッセージ送信');
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
              players: msg.p.players.length,
              isAutoRoom: msg.p.isAutoRoom
            });
          }
          
        } catch (error) {
          console.error('❌ プレイヤー2 メッセージ解析エラー:', error);
        }
      });
      
      // 2秒後にプレイヤー3を追加
      setTimeout(() => {
        getAutoRoom().then(roomId3 => {
          if (!roomId3) return;
          
          console.log('🎯 プレイヤー3 ルームID:', roomId3);
          
          const player3 = new WebSocket(`${PROD_WS_URL}/ws/room/${roomId3}`);
          
          player3.on('open', function open() {
            console.log('✅ プレイヤー3（自動マッチング）接続成功');
            
            const joinMessage = {
              t: 'auto',
              p: {
                mode: 'LOVE',
                nick: '自動マッチングプレイヤー3',
                installId: 'auto3-' + Date.now()
              }
            };
            
            console.log('📤 プレイヤー3自動マッチング参加メッセージ送信');
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
                  players: msg.p.players.length,
                  isAutoRoom: msg.p.isAutoRoom
                });
              }
              
            } catch (error) {
              console.error('❌ プレイヤー3 メッセージ解析エラー:', error);
            }
          });
          
        });
      }, 2000);
      
    });
  }, 2000);
  
});

// 30秒後にテスト終了
setTimeout(() => {
  console.log('⏰ テスト終了');
  process.exit(0);
}, 30000);

