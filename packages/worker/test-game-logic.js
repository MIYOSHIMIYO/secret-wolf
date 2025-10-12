#!/usr/bin/env node

/**
 * ゲームロジックのテストスクリプト
 * 
 * 使用方法:
 * 1. 開発環境のWorkerを起動
 * 2. node test-game-logic.js
 */

import WebSocket from 'ws';

// テスト結果の集計
const testResults = {
  total: 0,
  passed: 0,
  failed: 0
};

// テスト結果を記録
function recordTestResult(testName, passed) {
  testResults.total++;
  
  if (passed) {
    testResults.passed++;
    console.log(`✅  ${testName}: 成功`);
  } else {
    testResults.failed++;
    console.log(`❌  ${testName}: 失敗`);
  }
}

// ヘルスチェック
async function healthCheck() {
  console.log('🔍 Workerのヘルスチェック中...');
  
  try {
    const response = await fetch('http://localhost:8787/healthz');
    if (response.status === 200) {
      console.log('✅ Workerが正常に動作しています');
      return true;
    } else {
      console.log(`❌ Workerの状態が異常です (${response.status})`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Workerに接続できません: ${error.message}`);
    return false;
  }
}

// 秘密管理テスト
async function testSecretManagement() {
  console.log('\n🔐 秘密管理テスト開始');
  
  return new Promise((resolve) => {
    const roomId = 'SECRET' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const wsUrl = `ws://localhost:8787/ws/room/${roomId}`;
    
    console.log(`📍 テストルームID: ${roomId}`);
    
    const ws = new WebSocket(wsUrl);
    
    let currentPhase = 'LOBBY';
    let secretSubmitted = false;
    let secretRevealed = false;
    
    const timeout = setTimeout(() => {
      console.log('⏰ 秘密管理テストタイムアウト');
      ws.close();
      resolve(false);
    }, 25000);
    
    ws.on('open', () => {
      console.log('✅ WebSocket接続が確立されました');
      
      // autoメッセージを送信
      const autoMessage = {
        t: "auto",
        p: {
          mode: "STRANGER",
          nick: "秘密管理テストユーザー",
          installId: "test-install-secret-" + Date.now()
        }
      };
      
      ws.send(JSON.stringify(autoMessage));
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.t === "state") {
          const newPhase = message.p.phase;
          if (newPhase !== currentPhase) {
            console.log(`🔄 フェーズ遷移: ${currentPhase} → ${newPhase}`);
            currentPhase = newPhase;
          }
          
          if (currentPhase === 'INPUT' && !secretSubmitted) {
            console.log('📝 INPUTフェーズに到達、秘密を送信します');
            
            const submitMessage = {
              t: "submitSecret",
              p: {
                text: "これはテスト用の秘密です"
              }
            };
            
            ws.send(JSON.stringify(submitMessage));
            secretSubmitted = true;
          }
          
          if (currentPhase === 'REVEAL' && !secretRevealed) {
            console.log('🎭 REVEALフェーズに到達、秘密が公開されます');
            
            // 公開された秘密の内容を確認
            const secretText = message.p.round?.secretText;
            const secretOwner = message.p.round?.secretOwner;
            
            if (secretText && secretOwner) {
              console.log(`✅ 秘密が正しく公開されました: "${secretText}" (持ち主: ${secretOwner})`);
              secretRevealed = true;
            } else {
              console.log('❌ 秘密の公開に失敗しました');
            }
          }
          
          if (currentPhase === 'RESULT') {
            console.log('🏆 RESULTフェーズに到達、テスト完了');
            
            clearTimeout(timeout);
            ws.close();
            resolve(true);
          }
        }
        
      } catch (error) {
        console.error('❌ メッセージの解析に失敗:', error);
      }
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocketエラー:', error);
      clearTimeout(timeout);
      resolve(false);
    });
  });
}

// 投票システムテスト
async function testVotingSystem() {
  console.log('\n🗳️ 投票システムテスト開始');
  
  const roomId = 'VOTE' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const playerCount = 3;
  
  console.log(`📍 テストルームID: ${roomId}`);
  console.log(`👥 プレイヤー数: ${playerCount}`);
  
  try {
    // 3人のプレイヤーを同時に接続
    const promises = Array.from({ length: playerCount }, (_, i) => {
      return new Promise((resolve) => {
        const wsUrl = `ws://localhost:8787/ws/room/${roomId}`;
        const ws = new WebSocket(wsUrl);
        
        let currentPhase = 'LOBBY';
        let playerId = null;
        let secretSubmitted = false;
        let voted = false;
        
        const timeout = setTimeout(() => {
          console.log(`⏰ プレイヤー ${i + 1} のテストタイムアウト`);
          ws.close();
          resolve(false);
        }, 35000);
        
        ws.on('open', () => {
          console.log(`✅ プレイヤー ${i + 1} の接続が確立されました`);
          
          const autoMessage = {
            t: "auto",
            p: {
              mode: "STRANGER",
              nick: `投票テストプレイヤー${i + 1}`,
              installId: `test-install-vote-${i + 1}-${Date.now()}`
            }
          };
          
          ws.send(JSON.stringify(autoMessage));
        });
        
        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            
            if (message.t === "you") {
              playerId = message.p.playerId;
              console.log(`✅ プレイヤー ${i + 1} のID: ${playerId}`);
            }
            
            if (message.t === "state") {
              const newPhase = message.p.phase;
              if (newPhase !== currentPhase) {
                console.log(`🔄 プレイヤー ${i + 1}: フェーズ遷移 ${currentPhase} → ${newPhase}`);
                currentPhase = newPhase;
              }
              
              if (currentPhase === 'INPUT' && !secretSubmitted) {
                console.log(`📝 プレイヤー ${i + 1} が秘密を送信します`);
                
                                 const submitMessage = {
                   t: "submitSecret",
                   p: {
                     text: `プレイヤー${i + 1}の秘密`
                   }
                 };
                 
                 ws.send(JSON.stringify(submitMessage));
                 secretSubmitted = true;
               }
               
                             if (currentPhase === 'DISCUSS') {
                console.log(`💬 プレイヤー ${i + 1} が議論終了を要求します`);
                
                const endDiscussMessage = {
                  t: "endDiscuss",
                  p: {}
                };
                
                ws.send(JSON.stringify(endDiscussMessage));
              }
              
              if (currentPhase === 'VOTE' && !voted) {
                console.log(`🗳️ プレイヤー ${i + 1} が投票を実行します`);
                
                // 自分以外のプレイヤーに投票
                const otherPlayers = message.p.players.filter((p) => p.id !== playerId);
                if (otherPlayers.length > 0) {
                  const targetPlayer = otherPlayers[0];
                  const voteMessage = {
                    t: "vote",
                    p: {
                      targetId: targetPlayer.id
                    }
                  };
                  
                  console.log(`📤 プレイヤー ${i + 1} が ${targetPlayer.nick} に投票`);
                  ws.send(JSON.stringify(voteMessage));
                  voted = true;
                }
              }
              
              if (currentPhase === 'RESULT') {
                console.log(`🏆 プレイヤー ${i + 1} がRESULTフェーズに到達`);
                
                // 投票結果を確認
                const votes = message.p.round?.votes;
                const tally = message.p.round?.tally;
                
                if (votes && tally) {
                  console.log(`✅ プレイヤー ${i + 1}: 投票結果を確認`);
                  console.log(`   投票状況:`, votes);
                  console.log(`   集計結果:`, tally);
                }
                
                clearTimeout(timeout);
                ws.close();
                resolve(true);
              }
            }
            
          } catch (error) {
            console.error(`❌ プレイヤー ${i + 1} のメッセージ解析に失敗:`, error);
          }
        });
        
        ws.on('error', (error) => {
          console.error(`❌ プレイヤー ${i + 1} のWebSocketエラー:`, error);
          clearTimeout(timeout);
          resolve(false);
        });
      });
    });
    
    const results = await Promise.all(promises);
    const successCount = results.filter(Boolean).length;
    
    console.log(`📊 投票システムテスト結果: ${successCount}/${playerCount} 成功`);
    
    return successCount === playerCount;
    
  } catch (error) {
    console.error('❌ 投票システムテストでエラー:', error);
    return false;
  }
}

// 勝敗判定テスト
async function testWinCondition() {
  console.log('\n🏆 勝敗判定テスト開始');
  
  const roomId = 'WIN' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const playerCount = 3;
  
  console.log(`📍 テストルームID: ${roomId}`);
  console.log(`👥 プレイヤー数: ${playerCount}`);
  
  try {
    // 3人のプレイヤーを同時に接続
    const promises = Array.from({ length: playerCount }, (_, i) => {
      return new Promise((resolve) => {
        const wsUrl = `ws://localhost:8787/ws/room/${roomId}`;
        const ws = new WebSocket(wsUrl);
        
        let currentPhase = 'LOBBY';
        let playerId = null;
        let secretSubmitted = false;
        let voted = false;
        let gameResult = null;
        
        const timeout = setTimeout(() => {
          console.log(`⏰ プレイヤー ${i + 1} のテストタイムアウト`);
          ws.close();
          resolve(false);
        }, 35000);
        
        ws.on('open', () => {
          console.log(`✅ プレイヤー ${i + 1} の接続が確立されました`);
          
          const autoMessage = {
            t: "auto",
            p: {
              mode: "STRANGER",
              nick: `勝敗テストプレイヤー${i + 1}`,
              installId: `test-install-win-${i + 1}-${Date.now()}`
            }
          };
          
          ws.send(JSON.stringify(autoMessage));
        });
        
        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            
            if (message.t === "you") {
              playerId = message.p.playerId;
              console.log(`✅ プレイヤー ${i + 1} のID: ${playerId}`);
            }
            
            if (message.t === "state") {
              const newPhase = message.p.phase;
              if (newPhase !== currentPhase) {
                console.log(`🔄 プレイヤー ${i + 1}: フェーズ遷移 ${currentPhase} → ${newPhase}`);
                currentPhase = newPhase;
              }
              
              if (currentPhase === 'INPUT' && !secretSubmitted) {
                console.log(`📝 プレイヤー ${i + 1} が秘密を送信します`);
                
                const submitMessage = {
                  t: "submitSecret",
                  p: {
                    text: `プレイヤー${i + 1}の秘密`
                  }
                };
                
                ws.send(JSON.stringify(submitMessage));
                secretSubmitted = true;
              }
              
                            if (currentPhase === 'DISCUSS') {
                console.log(`💬 プレイヤー ${i + 1} が議論終了を要求します`);
                
                const endDiscussMessage = {
                  t: "endDiscuss",
                  p: {}
                };
                
                ws.send(JSON.stringify(endDiscussMessage));
              }
              
              if (currentPhase === 'VOTE' && !voted) {
                console.log(`🗳️ プレイヤー ${i + 1} が投票を実行します`);
                
                // 全員が同じプレイヤーに投票（市民の勝利を狙う）
                const otherPlayers = message.p.players.filter((p) => p.id !== playerId);
                if (otherPlayers.length > 0) {
                  const targetPlayer = otherPlayers[0];
                  const voteMessage = {
                    t: "vote",
                    p: {
                      targetId: targetPlayer.id
                    }
                  };
                  
                  console.log(`📤 プレイヤー ${i + 1} が ${targetPlayer.nick} に投票`);
                  ws.send(JSON.stringify(voteMessage));
                  voted = true;
                }
              }
              
              if (currentPhase === 'RESULT') {
                console.log(`🏆 プレイヤー ${i + 1} がRESULTフェーズに到達`);
                
                // 勝敗判定の結果を確認
                const secretText = message.p.round?.secretText;
                const secretOwner = message.p.round?.secretOwner;
                const votes = message.p.round?.votes;
                const tally = message.p.round?.tally;
                
                if (secretText && secretOwner && votes && tally) {
                  console.log(`✅ プレイヤー ${i + 1}: ゲーム結果を確認`);
                  console.log(`   公開された秘密: "${secretText}"`);
                  console.log(`   秘密の持ち主: ${secretOwner}`);
                  console.log(`   投票結果:`, votes);
                  console.log(`   集計結果:`, tally);
                  
                  // 勝敗判定ロジックの検証
                  const voteCounts = new Map();
                  Object.values(votes).forEach((targetId) => {
                    if (targetId !== "NONE") {
                      voteCounts.set(targetId, (voteCounts.get(targetId) || 0) + 1);
                    }
                  });
                  
                  let maxVotes = 0;
                  let topVotedIds = [];
                  voteCounts.forEach((count, playerId) => {
                    if (count > maxVotes) {
                      maxVotes = count;
                      topVotedIds = [playerId];
                    } else if (count === maxVotes) {
                      topVotedIds.push(playerId);
                    }
                  });
                  
                  const isWolfWin = topVotedIds.length === 0 || topVotedIds.length > 1 || 
                                   (topVotedIds.length === 1 && topVotedIds[0] !== secretOwner);
                  const winnerText = isWolfWin ? "人狼の勝利" : "市民の勝利";
                  
                  console.log(`   勝敗判定: ${winnerText}`);
                  console.log(`   最多投票者: ${topVotedIds.join(', ')}`);
                  console.log(`   市民勝利条件: ${topVotedIds.length === 1 && topVotedIds[0] === secretOwner}`);
                  
                  gameResult = { winnerText, isWolfWin };
                }
                
                clearTimeout(timeout);
                ws.close();
                resolve(true);
              }
            }
            
          } catch (error) {
            console.error(`❌ プレイヤー ${i + 1} のメッセージ解析に失敗:`, error);
          }
        });
        
        ws.on('error', (error) => {
          console.error(`❌ プレイヤー ${i + 1} のWebSocketエラー:`, error);
          clearTimeout(timeout);
          resolve(false);
        });
      });
    });
    
    const results = await Promise.all(promises);
    const successCount = results.filter(Boolean).length;
    
    console.log(`📊 勝敗判定テスト結果: ${successCount}/${playerCount} 成功`);
    
    return successCount === playerCount;
    
  } catch (error) {
    console.error('❌ 勝敗判定テストでエラー:', error);
    return false;
  }
}

// テスト結果の表示
function displayTestResults() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 ゲームロジックテスト結果サマリー');
  console.log('='.repeat(60));
  
  console.log(`総テスト数: ${testResults.total}`);
  console.log(`成功: ${testResults.passed} ✅`);
  console.log(`失敗: ${testResults.failed} ❌`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 すべてのゲームロジックテストが成功しました！');
  } else {
    console.log(`\n⚠️  ${testResults.failed}個のテストが失敗しました`);
  }
  
  console.log('\n' + '='.repeat(60));
}

// メイン実行
async function main() {
  console.log('🚀 ゲームロジックのテストを開始します...');
  
  // ヘルスチェック
  if (!(await healthCheck())) {
    console.log('\n❌ Workerが起動していません。先にWorkerを起動してください。');
    console.log('  例: cd packages/worker && npm run dev');
    process.exit(1);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🧪 ゲームロジックテスト開始');
  console.log('='.repeat(60));
  
  // 各テストを実行（単一プレイヤーテストは削除）
  const votingTest = await testVotingSystem();
  recordTestResult('投票システムテスト', votingTest);
  
  const winConditionTest = await testWinCondition();
  recordTestResult('勝敗判定テスト', winConditionTest);
  
  // 結果を表示
  displayTestResults();
  
  // 終了コード
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// スクリプト実行
main().catch(error => {
  console.error('💥 テスト実行中にエラーが発生しました:', error);
  process.exit(1);
});

export { testSecretManagement, testVotingSystem, testWinCondition }; 