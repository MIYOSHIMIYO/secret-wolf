#!/usr/bin/env node

/**
 * 修正後の人数制限テスト
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

async function testCapacityLimits() {
  console.log('🎮 修正後の人数制限テスト');
  
  try {
    // テスト1: 知り合いモード（8人制限）
    console.log('\n📊 テスト1: 知り合いモード（8人制限）');
    
    const roomResponse = await makeRequest('/rooms', 'POST', { mode: 'NONE' });
    console.log('📝 ルーム作成:', roomResponse.data);
    const roomId = roomResponse.data.roomId;
    
    const players = [];
    
    // 8人まで参加を試行
    for (let i = 0; i < 8; i++) {
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
        
      } catch (error) {
        if (error.message === 'ROOM_FULL') {
          console.log(`❌ プレイヤー${i+1} 参加拒否: ルーム満員`);
          break;
        } else {
          console.log(`❌ プレイヤー${i+1} 参加エラー: ${error.message}`);
        }
      }
    }
    
    console.log(`📊 知り合いモード: ${players.length}人参加`);
    
    // 9人目の参加を試行（拒否されるはず）
    try {
      const ws = await createWebSocket(roomId);
      const joinMessage = {
        t: "join",
        p: { roomId, nick: `プレイヤー9`, installId: generateId() }
      };
      ws.send(JSON.stringify(joinMessage));
      
      await new Promise((resolve, reject) => {
        ws.once('message', (data) => {
          const msg = JSON.parse(data);
          if (msg.t === 'warn' && msg.p.code === 'ROOM_FULL') {
            console.log('✅ 9人目の参加が正しく拒否されました');
            resolve();
          } else {
            reject(new Error('Unexpected message: ' + msg.t));
          }
        });
        setTimeout(() => reject(new Error('Timeout')), 3000);
      });
      
      ws.close();
    } catch (error) {
      console.log(`❌ 9人目参加テストエラー: ${error.message}`);
    }
    
    // 接続を閉じる
    players.forEach(player => player.ws.close());
    
    await delay(2000);
    
    // テスト2: 知らない誰かと遊ぶ（3人制限）
    console.log('\n📊 テスト2: 知らない誰かと遊ぶ（3人制限）');
    
    const autoResponse = await makeRequest('/auto', 'POST', { 
      mode: 'STRANGER', 
      nick: 'テストプレイヤー', 
      installId: 'test-install-id' 
    });
    console.log('📝 自動マッチング:', autoResponse.data);
    const autoRoomId = autoResponse.data.roomId;
    
    const autoPlayers = [];
    
    // 3人まで参加を試行
    for (let i = 0; i < 3; i++) {
      try {
        const ws = await createWebSocket(autoRoomId);
        const joinMessage = {
          t: "join",
          p: { roomId: autoRoomId, nick: `プレイヤー${i+1}`, installId: generateId() }
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
        
        autoPlayers.push({ ws, playerId, nick: `プレイヤー${i+1}` });
        console.log(`✅ プレイヤー${i+1} 参加成功: ${playerId}`);
        
      } catch (error) {
        if (error.message === 'ROOM_FULL') {
          console.log(`❌ プレイヤー${i+1} 参加拒否: ルーム満員`);
          break;
        } else {
          console.log(`❌ プレイヤー${i+1} 参加エラー: ${error.message}`);
        }
      }
    }
    
    console.log(`📊 知らない誰かと遊ぶ: ${autoPlayers.length}人参加`);
    
    // 4人目の参加を試行（拒否されるはず）
    try {
      const ws = await createWebSocket(autoRoomId);
      const joinMessage = {
        t: "join",
        p: { roomId: autoRoomId, nick: `プレイヤー4`, installId: generateId() }
      };
      ws.send(JSON.stringify(joinMessage));
      
      await new Promise((resolve, reject) => {
        ws.once('message', (data) => {
          const msg = JSON.parse(data);
          if (msg.t === 'warn' && msg.p.code === 'ROOM_FULL') {
            console.log('✅ 4人目の参加が正しく拒否されました');
            resolve();
          } else {
            reject(new Error('Unexpected message: ' + msg.t));
          }
        });
        setTimeout(() => reject(new Error('Timeout')), 3000);
      });
      
      ws.close();
    } catch (error) {
      console.log(`❌ 4人目参加テストエラー: ${error.message}`);
    }
    
    // 接続を閉じる
    autoPlayers.forEach(player => player.ws.close());
    
    console.log('\n🎯 人数制限テスト完了');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

testCapacityLimits().catch(console.error);
