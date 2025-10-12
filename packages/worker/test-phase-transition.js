#!/usr/bin/env node

/**
 * フェーズ遷移のテストスクリプト
 * 
 * 使用方法:
 * 1. 開発環境のWorkerを起動
 * 2. node test-phase-transition.js
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

// フェーズ遷移テスト
async function testPhaseTransition() {
  console.log('\n🔄 フェーズ遷移テスト開始');
  
  return new Promise((resolve) => {
    const roomId = 'PHASE' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const wsUrl = `ws://localhost:8787/ws/room/${roomId}`;
    
    console.log(`📍 テストルームID: ${roomId}`);
    console.log(`🌐 WebSocket URL: ${wsUrl}`);
    
    const ws = new WebSocket(wsUrl);
    
    let currentPhase = 'LOBBY';
    let phaseTransitions = [];
    let testCompleted = false;
    
    const timeout = setTimeout(() => {
      console.log('⏰ フェーズ遷移テストタイムアウト');
      ws.close();
      resolve(false);
    }, 30000);
    
    ws.on('open', () => {
      console.log('✅ WebSocket接続が確立されました');
      
      // autoメッセージを送信して自動開始ルームとして設定
      const autoMessage = {
        t: "auto",
        p: {
          mode: "STRANGER",
          nick: "フェーズテストユーザー",
          installId: "test-install-phase-" + Date.now()
        }
      };
      
      console.log('📤 autoメッセージを送信:', autoMessage);
      ws.send(JSON.stringify(autoMessage));
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('📥 メッセージを受信:', message);
        
        if (message.t === "you") {
          console.log('✅ youメッセージを受信（プレイヤーID割り当て完了）');
        }
        
        if (message.t === "state") {
          const newPhase = message.p.phase;
          if (newPhase !== currentPhase) {
            console.log(`🔄 フェーズ遷移: ${currentPhase} → ${newPhase}`);
            phaseTransitions.push({ from: currentPhase, to: newPhase, timestamp: Date.now() });
            currentPhase = newPhase;
          }
          
          // フェーズ遷移の進行状況を確認
          if (currentPhase === 'LOBBY') {
            console.log('🎮 LOBBYフェーズに到達、3人揃うまで待機します');
          }
          
          if (currentPhase === 'READY') {
            console.log('⏳ READYフェーズに到達、3秒後にゲーム開始');
          }
          
          if (currentPhase === 'INPUT') {
            console.log('📝 INPUTフェーズに到達、秘密を送信します');
            
            // 秘密を送信
            const submitMessage = {
              t: "submitSecret",
              p: {
                text: "テスト秘密"
              }
            };
            
            console.log('📤 submitSecretメッセージを送信:', submitMessage);
            ws.send(JSON.stringify(submitMessage));
          }
          
          if (currentPhase === 'REVEAL') {
            console.log('🎭 REVEALフェーズに到達');
          }
          
          if (currentPhase === 'DISCUSS') {
            console.log('💬 DISCUSSフェーズに到達、議論終了を要求します');
            
            // 議論終了を要求
            const endDiscussMessage = {
              t: "endDiscuss",
              p: {}
            };
            
            console.log('📤 endDiscussメッセージを送信:', endDiscussMessage);
            ws.send(JSON.stringify(endDiscussMessage));
          }
          
          if (currentPhase === 'VOTE') {
            console.log('🗳️ VOTEフェーズに到達、投票を実行します');
            
            // 投票を実行
            const voteMessage = {
              t: "vote",
              p: {
                targetId: "NONE"
              }
            };
            
            console.log('📤 voteメッセージを送信:', voteMessage);
            ws.send(JSON.stringify(voteMessage));
          }
          
          if (currentPhase === 'JUDGE') {
            console.log('⚖️ JUDGEフェーズに到達');
            
            // JUDGEフェーズで3秒待機してからRESULTフェーズに移行
            setTimeout(() => {
              const phaseChangeMessage = {
                t: "phaseChange",
                p: {
                  phase: "RESULT"
                }
              };
              
              console.log('📤 phaseChangeメッセージを送信:', phaseChangeMessage);
              ws.send(JSON.stringify(phaseChangeMessage));
            }, 3000);
          }
          
          if (currentPhase === 'RESULT') {
            console.log('🏆 RESULTフェーズに到達、テスト完了');
            testCompleted = true;
            
            clearTimeout(timeout);
            ws.close();
            resolve(true);
          }
        }
        
        if (message.t === "phase") {
          console.log('📡 phaseメッセージを受信:', message.p);
        }
        
      } catch (error) {
        console.error('❌ メッセージの解析に失敗:', error);
      }
    });
    
    ws.on('close', (code, reason) => {
      console.log(`🔌 WebSocket接続が閉じられました: ${code} - ${reason}`);
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocketエラー:', error);
      clearTimeout(timeout);
      resolve(false);
    });
  });
}

// 複数プレイヤーでのフェーズ遷移テスト
async function testMultiPlayerPhaseTransition() {
  console.log('\n👥 複数プレイヤーでのフェーズ遷移テスト開始');
  
  const roomId = 'MULTI' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const playerCount = 3;
  
  console.log(`📍 テストルームID: ${roomId}`);
  console.log(`👥 プレイヤー数: ${playerCount}`);
  
  try {
    // 複数のプレイヤーを同時に接続
    const promises = Array.from({ length: playerCount }, (_, i) => {
      return new Promise((resolve) => {
        const wsUrl = `ws://localhost:8787/ws/room/${roomId}`;
        const ws = new WebSocket(wsUrl);
        
        let currentPhase = 'LOBBY';
        let playerId = null;
        let secretSubmitted = false;
        let discussEnded = false;
        let voted = false;
        
        const timeout = setTimeout(() => {
          console.log(`⏰ プレイヤー ${i + 1} のテストタイムアウト`);
          ws.close();
          resolve(false);
        }, 25000);
        
        ws.on('open', () => {
          console.log(`✅ プレイヤー ${i + 1} の接続が確立されました`);
          
          // autoメッセージを送信して自動開始ルームとして設定
          const autoMessage = {
            t: "auto",
            p: {
              mode: "STRANGER",
              nick: `プレイヤー${i + 1}`,
              installId: `test-install-${i + 1}-${Date.now()}`
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
              
              // 各フェーズでの処理
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
              
              if (currentPhase === 'DISCUSS' && !discussEnded) {
                console.log(`💬 プレイヤー ${i + 1} が議論終了を要求します`);
                
                const endDiscussMessage = {
                  t: "endDiscuss",
                  p: {}
                };
                
                ws.send(JSON.stringify(endDiscussMessage));
                discussEnded = true;
              }
              
              if (currentPhase === 'VOTE' && !voted) {
                console.log(`🗳️ プレイヤー ${i + 1} が投票を実行します`);
                
                const voteMessage = {
                  t: "vote",
                  p: {
                    targetId: "NONE"
                  }
                };
                
                ws.send(JSON.stringify(voteMessage));
                voted = true;
              }
              
              if (currentPhase === 'RESULT') {
                console.log(`🏆 プレイヤー ${i + 1} がRESULTフェーズに到達`);
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
    
    console.log(`📊 複数プレイヤーフェーズ遷移結果: ${successCount}/${playerCount} 成功`);
    
    return successCount === playerCount;
    
  } catch (error) {
    console.error('❌ 複数プレイヤーフェーズ遷移テストでエラー:', error);
    return false;
  }
}

// フェーズ遷移のタイミングテスト
async function testPhaseTiming() {
  console.log('\n⏱️ フェーズ遷移のタイミングテスト開始');
  
  const roomId = 'TIMING' + Math.random().toString(36).substring(2, 8).toUpperCase();
  
  return new Promise((resolve) => {
    const wsUrl = `ws://localhost:8787/ws/room/${roomId}`;
    const ws = new WebSocket(wsUrl);
    
    let phaseStartTime = Date.now();
    let currentPhase = 'LOBBY';
    let phaseDurations = [];
    
    const timeout = setTimeout(() => {
      console.log('⏰ タイミングテストタイムアウト');
      ws.close();
      resolve(false);
    }, 20000);
    
    ws.on('open', () => {
      console.log('✅ WebSocket接続が確立されました');
      
      // autoメッセージを送信して自動開始ルームとして設定
      const autoMessage = {
        t: "auto",
        p: {
          mode: "STRANGER",
          nick: "タイミングテストユーザー",
          installId: "test-install-timing-" + Date.now()
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
            const phaseDuration = Date.now() - phaseStartTime;
            phaseDurations.push({ phase: currentPhase, duration: phaseDuration });
            
            console.log(`⏱️ フェーズ ${currentPhase} の継続時間: ${phaseDuration}ms`);
            
            currentPhase = newPhase;
            phaseStartTime = Date.now();
          }
          
          // 各フェーズでの処理
          if (currentPhase === 'INPUT') {
            // すぐに秘密を送信
            const submitMessage = {
              t: "submitSecret",
              p: {
                text: "タイミングテスト"
              }
            };
            ws.send(JSON.stringify(submitMessage));
          }
          
          if (currentPhase === 'DISCUSS') {
            // すぐに議論終了を要求
            const endDiscussMessage = {
              t: "endDiscuss",
              p: {}
            };
            ws.send(JSON.stringify(endDiscussMessage));
          }
          
          if (currentPhase === 'VOTE') {
            // すぐに投票を実行
            const voteMessage = {
              t: "vote",
              p: {
                targetId: "NONE"
              }
            };
            ws.send(JSON.stringify(voteMessage));
          }
          
          if (currentPhase === 'RESULT') {
            const phaseDuration = Date.now() - phaseStartTime;
            phaseDurations.push({ phase: currentPhase, duration: phaseDuration });
            
            console.log(`⏱️ フェーズ ${currentPhase} の継続時間: ${phaseDuration}ms`);
            console.log('📊 全フェーズの継続時間:', phaseDurations);
            
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

// テスト結果の表示
function displayTestResults() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 フェーズ遷移テスト結果サマリー');
  console.log('='.repeat(60));
  
  console.log(`総テスト数: ${testResults.total}`);
  console.log(`成功: ${testResults.passed} ✅`);
  console.log(`失敗: ${testResults.failed} ❌`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 すべてのフェーズ遷移テストが成功しました！');
  } else {
    console.log(`\n⚠️  ${testResults.failed}個のテストが失敗しました`);
  }
  
  console.log('\n' + '='.repeat(60));
}

// メイン実行
async function main() {
  console.log('🚀 フェーズ遷移のテストを開始します...');
  
  // ヘルスチェック
  if (!(await healthCheck())) {
    console.log('\n❌ Workerが起動していません。先にWorkerを起動してください。');
    console.log('  例: cd packages/worker && npm run dev');
    process.exit(1);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🧪 フェーズ遷移テスト開始');
  console.log('='.repeat(60));
  
  // 各テストを実行
  const phaseTransitionTest = await testPhaseTransition();
  recordTestResult('フェーズ遷移テスト', phaseTransitionTest);
  
  const multiPlayerTest = await testMultiPlayerPhaseTransition();
  recordTestResult('複数プレイヤーフェーズ遷移テスト', multiPlayerTest);
  
  const timingTest = await testPhaseTiming();
  recordTestResult('フェーズ遷移タイミングテスト', timingTest);
  
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

export { testPhaseTransition, testMultiPlayerPhaseTransition, testPhaseTiming }; 