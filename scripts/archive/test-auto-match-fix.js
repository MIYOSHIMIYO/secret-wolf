#!/usr/bin/env node

/**
 * 自動マッチングのパラメータ修正テスト
 */

const https = require('https');

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

async function testAutoMatchParams() {
  console.log('🔍 自動マッチングパラメータテスト');
  
  // テスト1: 正しいパラメータ
  console.log('\nテスト1: 正しいパラメータ');
  const test1 = await makeRequest('/auto', 'POST', { 
    mode: 'STRANGER', 
    nick: 'テストプレイヤー', 
    installId: 'test-install-id' 
  });
  console.log('結果:', test1);
  
  // テスト2: modeなし
  console.log('\nテスト2: modeなし');
  const test2 = await makeRequest('/auto', 'POST', { 
    nick: 'テストプレイヤー', 
    installId: 'test-install-id' 
  });
  console.log('結果:', test2);
  
  // テスト3: nickなし
  console.log('\nテスト3: nickなし');
  const test3 = await makeRequest('/auto', 'POST', { 
    mode: 'STRANGER', 
    installId: 'test-install-id' 
  });
  console.log('結果:', test3);
  
  // テスト4: installIdなし
  console.log('\nテスト4: installIdなし');
  const test4 = await makeRequest('/auto', 'POST', { 
    mode: 'STRANGER', 
    nick: 'テストプレイヤー' 
  });
  console.log('結果:', test4);
}

testAutoMatchParams().catch(console.error);
