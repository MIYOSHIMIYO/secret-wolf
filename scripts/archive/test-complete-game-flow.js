// 本番環境でのゲームフロー全体テスト
const WebSocket = require('ws');

const PROD_WS_URL = 'wss://secret-werewolf-prod.qmdg2pmnw6.workers.dev';

console.log('🎮 本番環境ゲームフロー全体テスト開始...');

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
        nick: 'ゲームフローテスト',
        installId: 'gameflow-test-' + Date.now()
      })
    });
    
    const data = await response.json();
    return data.roomId;
  } catch (error) {
    console.error('❌ 自動マッチングAPI エラー:', error);
    return null;
  }
}

// プレイヤー1（ホスト）
getAutoRoom().then(roomId => {
  if (!roomId) return;
  
  console.log('🎯 ルームID:', roomId);
  const player1 = new WebSocket(`${PROD_WS_URL}/ws/room/${roomId}`);
  let gamePhase = 'LOBBY';
  
  player1.on('open', function open() {
    console.log('✅ プレイヤー1接続成功');
    
    const joinMessage = {
      t: 'auto',
      p: {
        mode: 'LOVE',
        nick: 'ゲームフロープレイヤー1',
        installId: 'gameflow1-' + Date.now()
      }
    };
    
    console.log('📤 プレイヤー1参加メッセージ送信');
    player1.send(JSON.stringify(joinMessage));
  });
  
  player1.on('message', function message(data) {
    try {
      const msg = JSON.parse(data.toString());
      
      if (msg.t === 'you') {
        console.log('✅ プレイヤー1 ID受信:', msg.p.playerId);
      }
      
      if (msg.t === 'state') {
        const newPhase = msg.p.phase;
        if (newPhase !== gamePhase) {
          console.log(`🔄 フェーズ変更: ${gamePhase} → ${newPhase}`);
          gamePhase = newPhase;
        }
        
        console.log('📊 ルーム状態更新:', {
          phase: msg.p.phase,
          players: msg.p.players.length,
          isAutoRoom: msg.p.isAutoRoom,
          mode: msg.p.mode,
          roundId: msg.p.roundId
        });
      }
      
      if (msg.t === 'phase') {
        console.log('🔄 フェーズ変更通知:', {
          phase: msg.p.phase,
          endsAt: new Date(msg.p.endsAt).toISOString(),
          roundId: msg.p.roundId,
          phaseSeq: msg.p.phaseSeq
        });
        
        // 各フェーズでの動作テスト
        if (msg.p.phase === 'INPUT') {
          console.log('📝 INPUTフェーズ: 秘密入力テスト');
          setTimeout(() => {
            const secretMessage = {
              t: 'submitSecret',
              p: {
                text: 'これはテスト用の秘密です'
              }
            };
            console.log('📤 秘密提出メッセージ送信');
            player1.send(JSON.stringify(secretMessage));
          }, 2000);
        }
        
        if (msg.p.phase === 'DISCUSS') {
          console.log('💬 DISCUSSフェーズ: チャットテスト');
          setTimeout(() => {
            const chatMessage = {
              t: 'chat',
              p: {
                text: 'これはテスト用のチャットメッセージです'
              }
            };
            console.log('📤 チャットメッセージ送信');
            player1.send(JSON.stringify(chatMessage));
          }, 1000);
          
          setTimeout(() => {
            const endDiscussMessage = {
              t: 'endDiscuss',
              p: {}
            };
            console.log('📤 議論終了メッセージ送信');
            player1.send(JSON.stringify(endDiscussMessage));
          }, 3000);
        }
        
        if (msg.p.phase === 'VOTE') {
          console.log('🗳️ VOTEフェーズ: 投票テスト');
          setTimeout(() => {
            const voteMessage = {
              t: 'vote',
              p: {
                targetId: 'NONE' // 投票なしでテスト
              }
            };
            console.log('📤 投票メッセージ送信');
            player1.send(JSON.stringify(voteMessage));
          }, 2000);
        }
      }
      
      if (msg.t === 'abort') {
        console.log('⚠️ ゲーム中断:', msg.p.reason);
      }
      
    } catch (error) {
      console.error('❌ メッセージ解析エラー:', error);
    }
  });
  
  // プレイヤー2を追加（2秒後）
  setTimeout(() => {
    const player2 = new WebSocket(`${PROD_WS_URL}/ws/room/${roomId}`);
    
    player2.on('open', function open() {
      console.log('✅ プレイヤー2接続成功');
      
      const joinMessage = {
        t: 'auto',
        p: {
          mode: 'LOVE',
          nick: 'ゲームフロープレイヤー2',
          installId: 'gameflow2-' + Date.now()
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
    
    // プレイヤー3を追加（2秒後）
    setTimeout(() => {
      const player3 = new WebSocket(`${PROD_WS_URL}/ws/room/${roomId}`);
      
      player3.on('open', function open() {
        console.log('✅ プレイヤー3接続成功');
        
        const joinMessage = {
          t: 'auto',
          p: {
            mode: 'LOVE',
            nick: 'ゲームフロープレイヤー3',
            installId: 'gameflow3-' + Date.now()
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
      
    }, 2000);
    
  }, 2000);
  
});

// 60秒後にテスト終了
setTimeout(() => {
  console.log('⏰ ゲームフローテスト終了');
  process.exit(0);
}, 60000);

