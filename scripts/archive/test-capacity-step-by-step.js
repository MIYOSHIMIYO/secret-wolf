#!/usr/bin/env node

/**
 * ステップバイステップ人数制限テスト
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

async function testStepByStep() {
  console.log('🔍 ステップバイステップ人数制限テスト');
  
  try {
    // 知り合いモードでルーム作成
    console.log('\n📊 知り合いモードでルーム作成');
    
    const roomResponse = await makeRequest('/rooms', 'POST', { mode: 'NONE' });
    console.log('📝 ルーム作成:', roomResponse.data);
    const roomId = roomResponse.data.roomId;
    
    const players = [];
    
    // 1人ずつ参加させてログを確認
    for (let i = 0; i < 10; i++) {
      console.log(`\n👤 プレイヤー${i+1} 参加試行`);
      
      try {
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
            } else if (msg.t === 'warn' && msg.p.code === 'ROOM_FULL') {
              reject(new Error('ROOM_FULL'));
            } else {
              reject(new Error('Unexpected message: ' + msg.t));
            }
          });
          setTimeout(() => reject(new Error('Join timeout')), 3000);
        });
        
        players.push({ ws, playerId, nick: `プレイヤー${i+1}` });
        console.log(`✅ プレイヤー${i+1} 参加成功: ${playerId}`);
        
        // 状態を確認
        ws.on('message', (data) => {
          const msg = JSON.parse(data);
          if (msg.t === 'state') {
            console.log(`📊 現在の状態: 人数=${msg.p.players.length}, isAutoRoom=${msg.p.isAutoRoom}`);
          }
        });
        
        await delay(1000);
        
      } catch (error) {
        if (error.message === 'ROOM_FULL') {
          console.log(`❌ プレイヤー${i+1} 参加拒否: ルーム満員`);
          break;
        } else {
          console.log(`❌ プレイヤー${i+1} 参加エラー: ${error.message}`);
          break;
        }
      }
    }
    
    console.log(`\n📊 最終結果: ${players.length}人参加`);
    
    // 接続を閉じる
    players.forEach(player => player.ws.close());
    
    console.log('\n🎯 ステップバイステップテスト完了');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

testStepByStep().catch(console.error);
