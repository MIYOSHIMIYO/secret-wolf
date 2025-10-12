#!/usr/bin/env node

/**
 * 知らない誰かと遊ぶモードのテスト
 */

const WebSocket = require('ws');
const https = require('https');

const PROD_WS_URL = 'wss://secret-werewolf-prod.qmdg2pmnw6.workers.dev';

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateId() {
  return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

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

async function testStrangerMode() {
  console.log('🎮 知らない誰かと遊ぶモードのテスト');
  
  try {
    // 自動マッチングでルーム取得
    const autoResponse = await makeRequest('/auto', 'POST', { 
      mode: 'STRANGER', 
      nick: 'テストプレイヤー', 
      installId: 'test-install-id' 
    });
    console.log('📝 自動マッチング:', autoResponse.data);
    const roomId = autoResponse.data.roomId;
    
    // 3人のプレイヤーで接続
    const players = [];
    for (let i = 0; i < 3; i++) {
      const ws = await createWebSocket(roomId);
      const joinMessage = {
        t: "join",
        p: { roomId, nick: `プレイヤー${i+1}`, installId: generateId() }
      };
      ws.send(JSON.stringify(joinMessage));
      
      // 参加確認を待機
      const playerId = await new Promise((resolve, reject) => {
        ws.once('message', (data) => {
          const msg = JSON.parse(data);
          if (msg.t === 'you') {
            resolve(msg.p.playerId);
          } else {
            reject(new Error('Unexpected message: ' + msg.t));
          }
        });
        setTimeout(() => reject(new Error('Join timeout')), 3000);
      });
      
      players.push({ ws, playerId, nick: `プレイヤー${i+1}` });
      console.log(`👤 プレイヤー${i+1} 参加: ${playerId}`);
      
      // メッセージリスナーを設定
      ws.on('message', (data) => {
        const msg = JSON.parse(data);
        console.log(`📨 プレイヤー${i+1} 受信:`, msg.t, msg.p?.phase || '');
      });
    }
    
    // 自動ゲーム開始を待機（3人揃い次第自動開始）
    console.log('⏰ 自動ゲーム開始を待機中...');
    await delay(10000);
    
    // 接続を閉じる
    players.forEach(player => player.ws.close());
    console.log('🔌 全接続終了');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

testStrangerMode().catch(console.error);
