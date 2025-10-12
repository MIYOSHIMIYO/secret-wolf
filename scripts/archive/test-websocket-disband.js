#!/usr/bin/env node

/**
 * WebSocket解散機能のテストスクリプト
 */

const WebSocket = require('ws');

const WS_URL = 'ws://localhost:8787/ws/room/TEST123';

console.log('🔍 WebSocket解散機能のテストを開始します...');
console.log('接続先:', WS_URL);

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('✅ WebSocket接続成功');
  
  // 1. ルームに参加
  console.log('📝 ルームに参加中...');
  ws.send(JSON.stringify({
    t: 'join',
    p: {
      roomId: 'TEST123',
      nick: 'テストユーザー',
      installId: 'test-install-id'
    }
  }));
  
  // 2. 少し待ってから解散メッセージを送信
  setTimeout(() => {
    console.log('🚪 ルーム解散メッセージを送信中...');
    ws.send(JSON.stringify({
      t: 'disband',
      p: {}
    }));
  }, 2000);
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('📨 メッセージ受信:', message);
    
    if (message.t === 'disband') {
      console.log('✅ 解散メッセージを受信しました');
    }
    
    if (message.t === 'abort') {
      console.log('✅ 中断メッセージを受信しました:', message.p);
    }
  } catch (error) {
    console.error('❌ メッセージ解析エラー:', error);
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocketエラー:', error);
});

ws.on('close', (code, reason) => {
  console.log(`🔌 WebSocket接続終了: code=${code}, reason=${reason}`);
  
  if (code === 4000 && reason === 'disbanded') {
    console.log('✅ 解散による正常な接続終了を確認しました');
  } else {
    console.log('⚠️  予期しない接続終了です');
  }
  
  process.exit(0);
});

// タイムアウト設定
setTimeout(() => {
  console.log('⏰ テストタイムアウト');
  ws.close();
  process.exit(1);
}, 10000);
