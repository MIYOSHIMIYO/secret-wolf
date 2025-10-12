#!/usr/bin/env node

/**
 * メッセージ受信のデバッグテスト
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

async function testMessageFlow() {
  console.log('🔍 メッセージフローのデバッグテスト');
  
  try {
    // ルーム作成
    const roomResponse = await makeRequest('/rooms', 'POST', { mode: 'NONE' });
    console.log('📝 ルーム作成:', roomResponse.data);
    const roomId = roomResponse.data.roomId;
    
    // WebSocket接続
    const ws = await createWebSocket(roomId);
    console.log('🔌 WebSocket接続成功');
    
    // メッセージリスナーを設定
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        console.log('📨 受信メッセージ:', JSON.stringify(msg, null, 2));
      } catch (e) {
        console.log('📨 受信データ（JSON解析失敗）:', data.toString());
      }
    });
    
    // プレイヤー参加
    const joinMessage = {
      t: "join",
      p: { roomId, nick: "テストプレイヤー", installId: generateId() }
    };
    console.log('📤 送信メッセージ:', JSON.stringify(joinMessage, null, 2));
    ws.send(JSON.stringify(joinMessage));
    
    // 5秒待機
    await delay(5000);
    
    // ゲーム開始
    const startMessage = { t: "startGame", p: {} };
    console.log('📤 送信メッセージ:', JSON.stringify(startMessage, null, 2));
    ws.send(JSON.stringify(startMessage));
    
    // 5秒待機
    await delay(5000);
    
    ws.close();
    console.log('🔌 WebSocket接続終了');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

testMessageFlow().catch(console.error);
