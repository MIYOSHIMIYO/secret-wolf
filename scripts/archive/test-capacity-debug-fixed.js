#!/usr/bin/env node

/**
 * 修正後の人数制限デバッグテスト
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

async function testCapacityDebug() {
  console.log('🔍 修正後の人数制限デバッグテスト');
  
  try {
    // 知り合いモードで8人参加
    console.log('\n📊 知り合いモードで8人参加');
    
    const roomResponse = await makeRequest('/rooms', 'POST', { mode: 'NONE' });
    console.log('📝 ルーム作成:', roomResponse.data);
    const roomId = roomResponse.data.roomId;
    
    const players = [];
    
    // 8人参加
    for (let i = 0; i < 8; i++) {
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
      console.log(`✅ プレイヤー${i+1} 参加成功: ${playerId}`);
    }
    
    console.log(`📊 8人参加完了`);
    
    // 9人目の参加を試行
    console.log('\n📊 9人目の参加を試行');
    
    const ws9 = await createWebSocket(roomId);
    const joinMessage9 = {
      t: "join",
      p: { roomId, nick: `プレイヤー9`, installId: generateId() }
    };
    ws9.send(JSON.stringify(joinMessage9));
    
    // メッセージを監視
    ws9.on('message', (data) => {
      const msg = JSON.parse(data);
      console.log('📨 9人目受信メッセージ:', JSON.stringify(msg, null, 2));
    });
    
    ws9.on('close', (code, reason) => {
      console.log(`📨 9人目接続終了: ${code} - ${reason}`);
    });
    
    await delay(3000);
    
    // 接続を閉じる
    players.forEach(player => player.ws.close());
    ws9.close();
    
    console.log('\n🎯 デバッグテスト完了');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

testCapacityDebug().catch(console.error);
