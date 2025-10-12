#!/usr/bin/env node

/**
 * 本番環境での包括的テストスクリプト
 * 秘密人狼ゲームの全シナリオを検証
 */

const WebSocket = require('ws');
const https = require('https');

// 本番環境の設定
const PROD_BASE_URL = 'https://secret-werewolf-prod.qmdg2pmnw6.workers.dev';
const PROD_WS_URL = 'wss://secret-werewolf-prod.qmdg2pmnw6.workers.dev';

// テスト結果の記録
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// ユーティリティ関数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const generateId = () => `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// テスト結果の記録
function recordTest(name, passed, error = null) {
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${name}`);
  } else {
    testResults.failed++;
    testResults.errors.push({ name, error });
    console.log(`❌ ${name}: ${error}`);
  }
}

// HTTP リクエストのヘルパー
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'secret-werewolf-prod.qmdg2pmnw6.workers.dev',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://secret-werewolf-prod.qmdg2pmnw6.workers.dev'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: jsonBody });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// WebSocket接続のヘルパー
function createWebSocket(roomId) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${PROD_WS_URL}/ws/room/${roomId}`);
    
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
    
    // タイムアウト
    setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
  });
}

// プレイヤー参加のヘルパー
function joinRoom(ws, roomId, nick, installId) {
  return new Promise((resolve, reject) => {
    const message = {
      t: "join",
      p: { roomId, nick, installId }
    };
    
    ws.send(JSON.stringify(message));
    
    ws.once('message', (data) => {
      try {
        const msg = JSON.parse(data);
        if (msg.t === 'you') {
          resolve(msg.p.playerId);
        } else {
          reject(new Error('Unexpected message type: ' + msg.t));
        }
      } catch (e) {
        reject(e);
      }
    });
    
    setTimeout(() => reject(new Error('Join timeout')), 3000);
  });
}

// テスト1: 基本ゲームフロー - 知り合いと遊ぶ（3人）
async function testFriendsGameFlow() {
  console.log('\n🎮 テスト1: 知り合いと遊ぶ（3人）の基本ゲームフロー');
  
  try {
    // ルーム作成
    const roomResponse = await makeRequest('/rooms', 'POST', { mode: 'NONE' });
    if (roomResponse.status !== 200) {
      throw new Error(`Room creation failed: ${roomResponse.status}`);
    }
    const roomId = roomResponse.data.roomId;
    console.log(`📝 ルーム作成成功: ${roomId}`);
    
    // 3人のプレイヤーで接続
    const players = [];
    for (let i = 0; i < 3; i++) {
      const ws = await createWebSocket(roomId);
      const playerId = await joinRoom(ws, roomId, `プレイヤー${i+1}`, generateId());
      players.push({ ws, playerId, nick: `プレイヤー${i+1}` });
      console.log(`👤 プレイヤー${i+1} 参加: ${playerId}`);
    }
    
    // 状態確認
    let stateReceived = false;
    players[0].ws.on('message', (data) => {
      const msg = JSON.parse(data);
      if (msg.t === 'state' && msg.p.phase === 'LOBBY') {
        stateReceived = true;
        console.log(`📊 ルーム状態: プレイヤー数=${msg.p.players.length}, フェーズ=${msg.p.phase}`);
      }
    });
    
    await delay(1000);
    recordTest('知り合いモード - ルーム作成と3人参加', stateReceived);
    
    // ゲーム開始（ホストが開始）
    const startMessage = { t: "startGame", p: {} };
    players[0].ws.send(JSON.stringify(startMessage));
    
    // MODE_SELECTフェーズの確認
    await delay(2000);
    let modeSelectReceived = false;
    players.forEach(player => {
      player.ws.on('message', (data) => {
        const msg = JSON.parse(data);
        if (msg.t === 'phase' && msg.p.phase === 'MODE_SELECT') {
          modeSelectReceived = true;
          console.log(`🎯 MODE_SELECTフェーズ開始`);
        }
      });
    });
    
    await delay(1000);
    recordTest('知り合いモード - MODE_SELECTフェーズ遷移', modeSelectReceived);
    
    // 接続を閉じる
    players.forEach(player => player.ws.close());
    
  } catch (error) {
    recordTest('知り合いモード - 基本フロー', false, error.message);
  }
}

// テスト2: 知らない誰かと遊ぶ（3人）
async function testStrangerGameFlow() {
  console.log('\n🎮 テスト2: 知らない誰かと遊ぶ（3人）の基本ゲームフロー');
  
  try {
    // 自動マッチングでルーム取得
    const autoResponse = await makeRequest('/auto', 'POST', { 
      mode: 'STRANGER', 
      nick: 'テストプレイヤー', 
      installId: 'test-install-id' 
    });
    if (autoResponse.status !== 200) {
      throw new Error(`Auto match failed: ${autoResponse.status}`);
    }
    const { roomId, isNewRoom } = autoResponse.data;
    console.log(`📝 自動マッチング: ルーム${roomId} (新規: ${isNewRoom})`);
    
    // 3人のプレイヤーで接続
    const players = [];
    for (let i = 0; i < 3; i++) {
      const ws = await createWebSocket(roomId);
      const playerId = await joinRoom(ws, roomId, `プレイヤー${i+1}`, generateId());
      players.push({ ws, playerId, nick: `プレイヤー${i+1}` });
      console.log(`👤 プレイヤー${i+1} 参加: ${playerId}`);
    }
    
    // READYフェーズの確認
    await delay(2000);
    let readyPhaseReceived = false;
    players.forEach(player => {
      player.ws.on('message', (data) => {
        const msg = JSON.parse(data);
        if (msg.t === 'phase' && msg.p.phase === 'READY') {
          readyPhaseReceived = true;
          console.log(`🎯 READYフェーズ開始`);
        }
      });
    });
    
    await delay(1000);
    recordTest('知らない誰かと遊ぶ - READYフェーズ遷移', readyPhaseReceived);
    
    // 接続を閉じる
    players.forEach(player => player.ws.close());
    
  } catch (error) {
    recordTest('知らない誰かと遊ぶ - 基本フロー', false, error.message);
  }
}

// テスト3: ルーム人数制限（知り合いモード）
async function testRoomCapacityLimit() {
  console.log('\n🎮 テスト3: ルーム人数制限テスト');
  
  try {
    // ルーム作成
    const roomResponse = await makeRequest('/rooms', 'POST', { mode: 'NONE' });
    const roomId = roomResponse.data.roomId;
    console.log(`📝 ルーム作成: ${roomId}`);
    
    // 8人のプレイヤーで接続を試行
    const players = [];
    for (let i = 0; i < 8; i++) {
      try {
        const ws = await createWebSocket(roomId);
        const playerId = await joinRoom(ws, roomId, `プレイヤー${i+1}`, generateId());
        players.push({ ws, playerId, nick: `プレイヤー${i+1}` });
        console.log(`👤 プレイヤー${i+1} 参加成功: ${playerId}`);
      } catch (error) {
        console.log(`❌ プレイヤー${i+1} 参加失敗: ${error.message}`);
        break;
      }
    }
    
    recordTest('ルーム人数制限 - 8人参加制限', players.length < 8);
    
    // 接続を閉じる
    players.forEach(player => player.ws.close());
    
  } catch (error) {
    recordTest('ルーム人数制限テスト', false, error.message);
  }
}

// テスト4: 離脱シナリオ
async function testDisconnectionScenarios() {
  console.log('\n🎮 テスト4: 離脱シナリオテスト');
  
  try {
    // ルーム作成と3人参加
    const roomResponse = await makeRequest('/rooms', 'POST', { mode: 'NONE' });
    const roomId = roomResponse.data.roomId;
    
    const players = [];
    for (let i = 0; i < 3; i++) {
      const ws = await createWebSocket(roomId);
      const playerId = await joinRoom(ws, roomId, `プレイヤー${i+1}`, generateId());
      players.push({ ws, playerId, nick: `プレイヤー${i+1}` });
    }
    
    await delay(1000);
    
    // 1人離脱（LOBBY中）
    console.log('📤 プレイヤー1が離脱...');
    players[0].ws.close();
    
    await delay(1000);
    
    // 残り2人で継続しているか確認
    let stateAfterDisconnect = null;
    players[1].ws.on('message', (data) => {
      const msg = JSON.parse(data);
      if (msg.t === 'state') {
        stateAfterDisconnect = msg.p;
      }
    });
    
    await delay(1000);
    recordTest('LOBBY中離脱 - 2人で継続', stateAfterDisconnect && stateAfterDisconnect.players.length === 2);
    
    // 全員離脱
    players[1].ws.close();
    players[2].ws.close();
    
    await delay(2000);
    
    // ルームが削除されているか確認
    const roomCheck = await makeRequest(`/rooms/${roomId}/exists`);
    recordTest('全員離脱 - ルーム削除', roomCheck.data.exists === false);
    
  } catch (error) {
    recordTest('離脱シナリオテスト', false, error.message);
  }
}

// テスト5: タイムアウトシナリオ
async function testTimeoutScenarios() {
  console.log('\n🎮 テスト5: タイムアウトシナリオテスト');
  
  try {
    // 知らない誰かと遊ぶでゲーム開始
    const autoResponse = await makeRequest('/auto', 'POST', { 
      mode: 'STRANGER', 
      nick: 'テストプレイヤー', 
      installId: 'test-install-id' 
    });
    const roomId = autoResponse.data.roomId;
    
    const players = [];
    for (let i = 0; i < 3; i++) {
      const ws = await createWebSocket(roomId);
      const playerId = await joinRoom(ws, roomId, `プレイヤー${i+1}`, generateId());
      players.push({ ws, playerId, nick: `プレイヤー${i+1}` });
    }
    
    // READY → INPUT の遷移を待機
    await delay(5000);
    
    let inputPhaseReceived = false;
    players.forEach(player => {
      player.ws.on('message', (data) => {
        const msg = JSON.parse(data);
        if (msg.t === 'phase' && msg.p.phase === 'INPUT') {
          inputPhaseReceived = true;
          console.log(`🎯 INPUTフェーズ開始 - 30秒タイマー開始`);
        }
      });
    });
    
    await delay(1000);
    recordTest('タイムアウト - INPUTフェーズ開始', inputPhaseReceived);
    
    // 30秒待機してREVEALフェーズへの自動遷移を確認
    console.log('⏰ 30秒待機中...');
    await delay(35000);
    
    let revealPhaseReceived = false;
    players.forEach(player => {
      player.ws.on('message', (data) => {
        const msg = JSON.parse(data);
        if (msg.t === 'phase' && msg.p.phase === 'REVEAL') {
          revealPhaseReceived = true;
          console.log(`🎯 REVEALフェーズ自動遷移`);
        }
      });
    });
    
    await delay(1000);
    recordTest('タイムアウト - INPUTからREVEAL自動遷移', revealPhaseReceived);
    
    // 接続を閉じる
    players.forEach(player => player.ws.close());
    
  } catch (error) {
    recordTest('タイムアウトシナリオテスト', false, error.message);
  }
}

// メイン実行関数
async function runComprehensiveTests() {
  console.log('🚀 本番環境包括的テスト開始');
  console.log('='.repeat(50));
  
  const startTime = Date.now();
  
  try {
    await testFriendsGameFlow();
    await testStrangerGameFlow();
    await testRoomCapacityLimit();
    await testDisconnectionScenarios();
    await testTimeoutScenarios();
    
  } catch (error) {
    console.error('❌ テスト実行中にエラー:', error);
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 テスト結果サマリー');
  console.log('='.repeat(50));
  console.log(`✅ 成功: ${testResults.passed}`);
  console.log(`❌ 失敗: ${testResults.failed}`);
  console.log(`⏱️  実行時間: ${duration}ms`);
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ エラー詳細:');
    testResults.errors.forEach(error => {
      console.log(`  - ${error.name}: ${error.error}`);
    });
  }
  
  console.log('\n🎯 テスト完了');
}

// テスト実行
runComprehensiveTests().catch(console.error);
