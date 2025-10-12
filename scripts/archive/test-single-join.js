#!/usr/bin/env node

/**
 * 単一参加テスト
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

async function testSingleJoin() {
  console.log('🔍 単一参加テスト');
  
  try {
    // 知り合いモードでルーム作成
    console.log('\n📊 知り合いモードでルーム作成');
    
    const roomResponse = await makeRequest('/rooms', 'POST', { mode: 'NONE' });
    console.log('📝 ルーム作成:', roomResponse.data);
    const roomId = roomResponse.data.roomId;
    
    // 1人参加
    console.log('\n👤 プレイヤー1 参加試行');
    
    const ws = await createWebSocket(roomId);
    const joinMessage = {
      t: "join",
      p: { roomId, nick: `プレイヤー1`, installId: generateId() }
    };
    ws.send(JSON.stringify(joinMessage));
    
    // メッセージを監視
    ws.on('message', (data) => {
      const msg = JSON.parse(data);
      console.log('📨 受信メッセージ:', JSON.stringify(msg, null, 2));
    });
    
    ws.on('close', (code, reason) => {
      console.log(`📨 接続終了: ${code} - ${reason}`);
    });
    
    await delay(5000);
    
    ws.close();
    
    console.log('\n🎯 単一参加テスト完了');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

testSingleJoin().catch(console.error);
