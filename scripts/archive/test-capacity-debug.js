#!/usr/bin/env node

/**
 * 人数制限デバッグテスト
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
        } else if (msg.t === 'warn') {
          reject(new Error(`Room full: ${msg.p.code}`));
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

async function testCapacityLimit() {
  console.log('🔍 人数制限デバッグテスト');
  
  try {
    const roomResponse = await makeRequest('/rooms', 'POST', { mode: 'NONE' });
    const roomId = roomResponse.data.roomId;
    console.log(`ルーム作成: ${roomId}`);
    
    const players = [];
    for (let i = 0; i < 12; i++) {
      try {
        console.log(`\nプレイヤー${i+1} 参加試行...`);
        const ws = await createWebSocket(roomId);
        
        // メッセージ監視
        ws.on('message', (data) => {
          const msg = JSON.parse(data);
          console.log(`プレイヤー${i+1} 受信:`, msg.t, msg.p ? Object.keys(msg.p) : '');
          
          if (msg.t === 'state') {
            console.log(`プレイヤー${i+1} ルーム状態: プレイヤー数=${msg.p.players.length}, isAutoRoom=${msg.p.isAutoRoom}`);
          }
          
          if (msg.t === 'warn') {
            console.log(`プレイヤー${i+1} 警告:`, msg.p);
          }
        });
        
        const playerId = await joinRoom(ws, roomId, `プレイヤー${i+1}`, generateId());
        players.push({ ws, playerId, nick: `プレイヤー${i+1}` });
        console.log(`✅ プレイヤー${i+1} 参加成功: ${playerId}`);
        
        await delay(500);
      } catch (error) {
        console.log(`❌ プレイヤー${i+1} 参加失敗: ${error.message}`);
        break;
      }
    }
    
    console.log(`\n最終参加人数: ${players.length}`);
    
    await delay(2000);
    
    // 接続を閉じる
    players.forEach(player => player.ws.close());
    
  } catch (error) {
    console.error('人数制限テストエラー:', error);
  }
}

testCapacityLimit().catch(console.error);
