#!/usr/bin/env node

/**
 * 個別テストデバッグスクリプト
 */

const WebSocket = require('ws');
const https = require('https');

const PROD_BASE_URL = 'https://secret-werewolf-prod.qmdg2pmnw6.workers.dev';
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

// テスト1: 自動マッチングの詳細確認
async function testAutoMatch() {
  console.log('\n🔍 自動マッチングの詳細テスト');
  
  try {
    const autoResponse = await makeRequest('/auto', 'POST', { mode: 'STRANGER' });
    console.log('自動マッチングレスポンス:', autoResponse);
  } catch (error) {
    console.error('自動マッチングエラー:', error);
  }
}

// テスト2: 知り合いモードのゲーム開始詳細確認
async function testFriendsGameStart() {
  console.log('\n🔍 知り合いモードのゲーム開始詳細テスト');
  
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
    
    // メッセージを監視
    players.forEach((player, index) => {
      player.ws.on('message', (data) => {
        const msg = JSON.parse(data);
        console.log(`プレイヤー${index+1} 受信:`, msg.t, msg.p ? Object.keys(msg.p) : '');
      });
    });
    
    await delay(2000);
    
    // ゲーム開始
    console.log('ゲーム開始メッセージ送信...');
    const startMessage = { t: "startGame", p: {} };
    players[0].ws.send(JSON.stringify(startMessage));
    
    await delay(5000);
    
    // 接続を閉じる
    players.forEach(player => player.ws.close());
    
  } catch (error) {
    console.error('知り合いモードテストエラー:', error);
  }
}

// テスト3: ルーム人数制限の詳細確認
async function testRoomCapacity() {
  console.log('\n🔍 ルーム人数制限の詳細テスト');
  
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
    console.error('ルーム人数制限テストエラー:', error);
  }
}

// メイン実行
async function runDebugTests() {
  console.log('🔍 個別デバッグテスト開始');
  
  await testAutoMatch();
  await testFriendsGameStart();
  await testRoomCapacity();
  
  console.log('\n🔍 デバッグテスト完了');
}

runDebugTests().catch(console.error);
