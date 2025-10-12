#!/usr/bin/env node

/**
 * 詳細デバッグテスト
 */

const WebSocket = require('ws');
const https = require('https');

const PROD_WS_URL = 'wss://secret-werewolf-prod.qmdg2pmnw6.workers.dev';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const generateId = () => `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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

function createWebSocket(roomId) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${PROD_WS_URL}/ws/room/${roomId}`);
    
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
    
    setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
  });
}

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

// テスト1: 知り合いモードの詳細テスト
async function testFriendsModeDetailed() {
  console.log('\n🔍 知り合いモード詳細テスト');
  
  try {
    // ルーム作成
    const roomResponse = await makeRequest('/rooms', 'POST', { mode: 'NONE' });
    const roomId = roomResponse.data.roomId;
    console.log(`ルーム作成: ${roomId}`);
    
    // 3人参加
    const players = [];
    for (let i = 0; i < 3; i++) {
      const ws = await createWebSocket(roomId);
      const playerId = await joinRoom(ws, roomId, `プレイヤー${i+1}`, generateId());
      players.push({ ws, playerId, nick: `プレイヤー${i+1}` });
      console.log(`プレイヤー${i+1} 参加: ${playerId}`);
    }
    
    // メッセージ監視設定
    let phaseMessages = [];
    let stateMessages = [];
    
    players.forEach((player, index) => {
      player.ws.on('message', (data) => {
        const msg = JSON.parse(data);
        console.log(`プレイヤー${index+1} 受信:`, msg.t, msg.p ? Object.keys(msg.p) : '');
        
        if (msg.t === 'phase') {
          phaseMessages.push({ player: index+1, phase: msg.p.phase, timestamp: Date.now() });
          console.log(`🎯 フェーズ変更: ${msg.p.phase}`);
        }
        
        if (msg.t === 'state') {
          stateMessages.push({ player: index+1, phase: msg.p.phase, playerCount: msg.p.players.length, timestamp: Date.now() });
        }
      });
    });
    
    await delay(2000);
    
    // ゲーム開始
    console.log('🎮 ゲーム開始メッセージ送信...');
    const startMessage = { t: "startGame", p: {} };
    players[0].ws.send(JSON.stringify(startMessage));
    
    // 10秒待機してメッセージを確認
    await delay(10000);
    
    console.log('\n📊 フェーズメッセージ:', phaseMessages);
    console.log('📊 状態メッセージ:', stateMessages);
    
    // 接続を閉じる
    players.forEach(player => player.ws.close());
    
  } catch (error) {
    console.error('知り合いモードテストエラー:', error);
  }
}

// テスト2: 知らない誰かと遊ぶの詳細テスト
async function testStrangerModeDetailed() {
  console.log('\n🔍 知らない誰かと遊ぶ詳細テスト');
  
  try {
    // 自動マッチング
    const autoResponse = await makeRequest('/auto', 'POST', { 
      mode: 'STRANGER', 
      nick: 'テストプレイヤー', 
      installId: 'test-install-id' 
    });
    const roomId = autoResponse.data.roomId;
    console.log(`自動マッチング: ${roomId}`);
    
    // 3人参加
    const players = [];
    for (let i = 0; i < 3; i++) {
      const ws = await createWebSocket(roomId);
      const playerId = await joinRoom(ws, roomId, `プレイヤー${i+1}`, generateId());
      players.push({ ws, playerId, nick: `プレイヤー${i+1}` });
      console.log(`プレイヤー${i+1} 参加: ${playerId}`);
    }
    
    // メッセージ監視設定
    let phaseMessages = [];
    
    players.forEach((player, index) => {
      player.ws.on('message', (data) => {
        const msg = JSON.parse(data);
        console.log(`プレイヤー${index+1} 受信:`, msg.t, msg.p ? Object.keys(msg.p) : '');
        
        if (msg.t === 'phase') {
          phaseMessages.push({ player: index+1, phase: msg.p.phase, timestamp: Date.now() });
          console.log(`🎯 フェーズ変更: ${msg.p.phase}`);
        }
      });
    });
    
    // 10秒待機してメッセージを確認
    await delay(10000);
    
    console.log('\n📊 フェーズメッセージ:', phaseMessages);
    
    // 接続を閉じる
    players.forEach(player => player.ws.close());
    
  } catch (error) {
    console.error('知らない誰かと遊ぶテストエラー:', error);
  }
}

// テスト3: 人数制限の詳細テスト
async function testCapacityLimitDetailed() {
  console.log('\n🔍 人数制限詳細テスト');
  
  try {
    const roomResponse = await makeRequest('/rooms', 'POST', { mode: 'NONE' });
    const roomId = roomResponse.data.roomId;
    console.log(`ルーム作成: ${roomId}`);
    
    const players = [];
    for (let i = 0; i < 10; i++) {
      try {
        const ws = await createWebSocket(roomId);
        const playerId = await joinRoom(ws, roomId, `プレイヤー${i+1}`, generateId());
        players.push({ ws, playerId, nick: `プレイヤー${i+1}` });
        console.log(`プレイヤー${i+1} 参加成功: ${playerId}`);
        
        // 状態確認
        ws.on('message', (data) => {
          const msg = JSON.parse(data);
          if (msg.t === 'state') {
            console.log(`プレイヤー${i+1} ルーム状態: プレイヤー数=${msg.p.players.length}`);
          }
          if (msg.t === 'warn') {
            console.log(`プレイヤー${i+1} 警告:`, msg.p);
          }
        });
        
        await delay(500);
      } catch (error) {
        console.log(`プレイヤー${i+1} 参加失敗: ${error.message}`);
        break;
      }
    }
    
    console.log(`最終参加人数: ${players.length}`);
    
    await delay(2000);
    
    // 接続を閉じる
    players.forEach(player => player.ws.close());
    
  } catch (error) {
    console.error('人数制限テストエラー:', error);
  }
}

// メイン実行
async function runDetailedTests() {
  console.log('🔍 詳細デバッグテスト開始');
  
  await testFriendsModeDetailed();
  await testStrangerModeDetailed();
  await testCapacityLimitDetailed();
  
  console.log('\n🔍 詳細デバッグテスト完了');
}

runDetailedTests().catch(console.error);
