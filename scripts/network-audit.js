#!/usr/bin/env node

/**
 * ネットワーク監査スクリプト
 * WebSocket通信の動作確認とパフォーマンステスト
 */

const WebSocket = require('ws');
const https = require('https');
const http = require('http');

// 設定
const CONFIG = {
  dev: {
    ws: 'ws://localhost:8787',
    http: 'http://localhost:8787'
  },
  prod: {
    ws: 'wss://secret-werewolf-prod.qmdg2pmnw6.workers.dev',
    http: 'https://secret-werewolf-prod.qmdg2pmnw6.workers.dev'
  }
};

// 色付きログ
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  const timestamp = new Date().toISOString().substr(11, 12);
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

// テスト結果
const results = {
  http: { success: 0, fail: 0, errors: [] },
  websocket: { success: 0, fail: 0, errors: [] },
  performance: { connections: [], messages: [], latency: [] }
};

// HTTP接続テスト
async function testHttpConnection(env) {
  log(`🌐 HTTP接続テスト開始 (${env})`, 'blue');
  
  return new Promise((resolve) => {
    const url = CONFIG[env].http;
    const client = url.startsWith('https') ? https : http;
    
    const startTime = Date.now();
    
    const req = client.get(`${url}/healthz`, (res) => {
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      if (res.statusCode === 200) {
        log(`✅ HTTP接続成功 (${latency}ms)`, 'green');
        results.http.success++;
        results.performance.latency.push(latency);
      } else {
        log(`❌ HTTP接続失敗: ${res.statusCode}`, 'red');
        results.http.fail++;
        results.http.errors.push(`HTTP ${res.statusCode}`);
      }
      resolve();
    });
    
    req.on('error', (error) => {
      log(`❌ HTTP接続エラー: ${error.message}`, 'red');
      results.http.fail++;
      results.http.errors.push(error.message);
      resolve();
    });
    
    req.setTimeout(5000, () => {
      log(`❌ HTTP接続タイムアウト`, 'red');
      results.http.fail++;
      results.http.errors.push('Timeout');
      req.destroy();
      resolve();
    });
  });
}

// WebSocket接続テスト
async function testWebSocketConnection(env) {
  log(`🔌 WebSocket接続テスト開始 (${env})`, 'blue');
  
  return new Promise((resolve) => {
    const url = CONFIG[env].ws;
    const startTime = Date.now();
    
    const ws = new WebSocket(url);
    let connected = false;
    
    ws.on('open', () => {
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      log(`✅ WebSocket接続成功 (${latency}ms)`, 'green');
      results.websocket.success++;
      results.performance.connections.push(latency);
      connected = true;
      
      // テストメッセージ送信
      const testMessage = {
        t: 'ping',
        p: Date.now()
      };
      
      ws.send(JSON.stringify(testMessage));
      
      // 3秒後に接続を閉じる
      setTimeout(() => {
        ws.close();
        resolve();
      }, 3000);
    });
    
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        const messageTime = Date.now();
        
        if (msg.t === 'pong') {
          const roundTrip = messageTime - msg.p;
          log(`📡 Pong受信 (RTT: ${roundTrip}ms)`, 'cyan');
          results.performance.messages.push(roundTrip);
        }
      } catch (error) {
        log(`❌ メッセージ解析エラー: ${error.message}`, 'red');
      }
    });
    
    ws.on('error', (error) => {
      log(`❌ WebSocket接続エラー: ${error.message}`, 'red');
      results.websocket.fail++;
      results.websocket.errors.push(error.message);
      resolve();
    });
    
    ws.on('close', (code, reason) => {
      if (connected) {
        log(`🔌 WebSocket接続終了: ${code} ${reason}`, 'yellow');
      } else {
        log(`❌ WebSocket接続失敗: ${code} ${reason}`, 'red');
        results.websocket.fail++;
        results.websocket.errors.push(`Close ${code}: ${reason}`);
      }
      resolve();
    });
    
    // 5秒でタイムアウト
    setTimeout(() => {
      if (!connected) {
        log(`❌ WebSocket接続タイムアウト`, 'red');
        results.websocket.fail++;
        results.websocket.errors.push('Timeout');
        ws.terminate();
        resolve();
      }
    }, 5000);
  });
}

// ルーム作成テスト
async function testRoomCreation(env) {
  log(`🏠 ルーム作成テスト開始 (${env})`, 'blue');
  
  return new Promise((resolve) => {
    const url = CONFIG[env].http;
    const client = url.startsWith('https') ? https : http;
    
    const postData = JSON.stringify({
      mode: 'LOVE',
      nick: 'ネットワーク監査テスト',
      installId: 'network-audit-' + Date.now()
    });
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = client.request(`${url}/auto`, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.roomId) {
            log(`✅ ルーム作成成功: ${result.roomId}`, 'green');
            results.http.success++;
          } else {
            log(`❌ ルーム作成失敗: ${data}`, 'red');
            results.http.fail++;
            results.http.errors.push('Room creation failed');
          }
        } catch (error) {
          log(`❌ レスポンス解析エラー: ${error.message}`, 'red');
          results.http.fail++;
          results.http.errors.push(error.message);
        }
        resolve();
      });
    });
    
    req.on('error', (error) => {
      log(`❌ ルーム作成エラー: ${error.message}`, 'red');
      results.http.fail++;
      results.http.errors.push(error.message);
      resolve();
    });
    
    req.write(postData);
    req.end();
  });
}

// 複数接続テスト
async function testMultipleConnections(env, count = 5) {
  log(`👥 複数接続テスト開始 (${count}接続)`, 'blue');
  
  const promises = [];
  
  for (let i = 0; i < count; i++) {
    promises.push(new Promise((resolve) => {
      const url = CONFIG[env].ws;
      const startTime = Date.now();
      
      const ws = new WebSocket(url);
      
      ws.on('open', () => {
        const endTime = Date.now();
        const latency = endTime - startTime;
        
        log(`✅ 接続${i + 1}成功 (${latency}ms)`, 'green');
        results.websocket.success++;
        results.performance.connections.push(latency);
        
        // 1秒後に接続を閉じる
        setTimeout(() => {
          ws.close();
          resolve();
        }, 1000);
      });
      
      ws.on('error', (error) => {
        log(`❌ 接続${i + 1}エラー: ${error.message}`, 'red');
        results.websocket.fail++;
        results.websocket.errors.push(error.message);
        resolve();
      });
      
      ws.on('close', () => {
        resolve();
      });
    }));
  }
  
  await Promise.all(promises);
}

// パフォーマンス統計
function calculateStats() {
  const stats = {
    http: {
      successRate: (results.http.success / (results.http.success + results.http.fail)) * 100,
      avgLatency: results.performance.latency.length > 0 
        ? results.performance.latency.reduce((a, b) => a + b, 0) / results.performance.latency.length 
        : 0
    },
    websocket: {
      successRate: (results.websocket.success / (results.websocket.success + results.websocket.fail)) * 100,
      avgConnectionTime: results.performance.connections.length > 0 
        ? results.performance.connections.reduce((a, b) => a + b, 0) / results.performance.connections.length 
        : 0,
      avgMessageTime: results.performance.messages.length > 0 
        ? results.performance.messages.reduce((a, b) => a + b, 0) / results.performance.messages.length 
        : 0
    }
  };
  
  return stats;
}

// 結果レポート
function generateReport() {
  log('\n📊 ネットワーク監査結果レポート', 'magenta');
  log('=' .repeat(50), 'magenta');
  
  const stats = calculateStats();
  
  // HTTP結果
  log('\n🌐 HTTP接続結果:', 'blue');
  log(`  成功率: ${stats.http.successRate.toFixed(1)}%`, stats.http.successRate > 95 ? 'green' : 'red');
  log(`  平均レイテンシ: ${stats.http.avgLatency.toFixed(0)}ms`, stats.http.avgLatency < 1000 ? 'green' : 'yellow');
  
  if (results.http.errors.length > 0) {
    log(`  エラー: ${results.http.errors.join(', ')}`, 'red');
  }
  
  // WebSocket結果
  log('\n🔌 WebSocket接続結果:', 'blue');
  log(`  成功率: ${stats.websocket.successRate.toFixed(1)}%`, stats.websocket.successRate > 95 ? 'green' : 'red');
  log(`  平均接続時間: ${stats.websocket.avgConnectionTime.toFixed(0)}ms`, stats.websocket.avgConnectionTime < 2000 ? 'green' : 'yellow');
  log(`  平均メッセージ時間: ${stats.websocket.avgMessageTime.toFixed(0)}ms`, stats.websocket.avgMessageTime < 100 ? 'green' : 'yellow');
  
  if (results.websocket.errors.length > 0) {
    log(`  エラー: ${results.websocket.errors.join(', ')}`, 'red');
  }
  
  // 推奨事項
  log('\n💡 推奨事項:', 'yellow');
  
  if (stats.http.successRate < 95) {
    log('  - HTTP接続の成功率が低いです。サーバーの状態を確認してください。', 'red');
  }
  
  if (stats.websocket.successRate < 95) {
    log('  - WebSocket接続の成功率が低いです。ネットワーク設定を確認してください。', 'red');
  }
  
  if (stats.http.avgLatency > 1000) {
    log('  - HTTPレイテンシが高いです。サーバーの負荷を確認してください。', 'yellow');
  }
  
  if (stats.websocket.avgConnectionTime > 2000) {
    log('  - WebSocket接続時間が長いです。ネットワークの品質を確認してください。', 'yellow');
  }
  
  if (stats.websocket.avgMessageTime > 100) {
    log('  - メッセージの往復時間が長いです。サーバーの処理性能を確認してください。', 'yellow');
  }
  
  // 全体的な評価
  const overallSuccess = (stats.http.successRate + stats.websocket.successRate) / 2;
  if (overallSuccess > 95) {
    log('\n🎉 ネットワーク監査: 優秀', 'green');
  } else if (overallSuccess > 80) {
    log('\n⚠️  ネットワーク監査: 良好（改善の余地あり）', 'yellow');
  } else {
    log('\n❌ ネットワーク監査: 要改善', 'red');
  }
}

// メイン実行
async function main() {
  const env = process.argv[2] || 'dev';
  
  if (!['dev', 'prod'].includes(env)) {
    log('❌ 無効な環境です。dev または prod を指定してください。', 'red');
    process.exit(1);
  }
  
  log(`🚀 ネットワーク監査開始 (環境: ${env})`, 'magenta');
  log('=' .repeat(50), 'magenta');
  
  try {
    // HTTP接続テスト
    await testHttpConnection(env);
    
    // WebSocket接続テスト
    await testWebSocketConnection(env);
    
    // ルーム作成テスト
    await testRoomCreation(env);
    
    // 複数接続テスト
    await testMultipleConnections(env, 3);
    
    // 結果レポート
    generateReport();
    
  } catch (error) {
    log(`❌ 監査中にエラーが発生しました: ${error.message}`, 'red');
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  main();
}

module.exports = { testHttpConnection, testWebSocketConnection, testRoomCreation, testMultipleConnections };
