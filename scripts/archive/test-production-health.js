#!/usr/bin/env node

/**
 * 本番環境のヘルスチェックとCORS設定テスト
 */

const https = require('https');

function makeRequest(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'secret-werewolf-prod.qmdg2pmnw6.workers.dev',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://secret-werewolf-prod.qmdg2pmnw6.workers.dev',
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({ 
            status: res.statusCode, 
            data: jsonBody,
            headers: res.headers
          });
        } catch (e) {
          resolve({ 
            status: res.statusCode, 
            data: body,
            headers: res.headers
          });
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

async function testProductionHealth() {
  console.log('🎮 本番環境ヘルスチェックテスト');
  
  try {
    // テスト1: ヘルスチェックエンドポイント
    console.log('📊 テスト1: ヘルスチェックエンドポイント');
    try {
      const healthResponse = await makeRequest('/health');
      console.log(`✅ ヘルスチェック: ${healthResponse.status}`, healthResponse.data);
    } catch (error) {
      console.log(`❌ ヘルスチェックエラー: ${error.message}`);
    }
    
    // テスト2: ルーム作成（HTTPS通信）
    console.log('\n📊 テスト2: HTTPS通信 - ルーム作成');
    const roomResponse = await makeRequest('/rooms', 'POST', { mode: 'NONE' });
    console.log(`✅ ルーム作成: ${roomResponse.status}`, roomResponse.data);
    
    // テスト3: CORS設定（プリフライトリクエスト）
    console.log('\n📊 テスト3: CORS設定 - プリフライトリクエスト');
    const corsResponse = await makeRequest('/rooms', 'OPTIONS');
    console.log(`✅ CORS設定: ${corsResponse.status}`);
    console.log('📋 CORSヘッダー:', {
      'Access-Control-Allow-Origin': corsResponse.headers['access-control-allow-origin'],
      'Access-Control-Allow-Methods': corsResponse.headers['access-control-allow-methods'],
      'Access-Control-Allow-Headers': corsResponse.headers['access-control-allow-headers']
    });
    
    // テスト4: 自動マッチング（POST）
    console.log('\n📊 テスト4: 自動マッチング（POST）');
    const autoResponse = await makeRequest('/auto', 'POST', { 
      mode: 'STRANGER', 
      nick: 'テストプレイヤー', 
      installId: 'test-install-id' 
    });
    console.log(`✅ 自動マッチング: ${autoResponse.status}`, autoResponse.data);
    
    // テスト5: 異なるOriginでのCORSテスト
    console.log('\n📊 テスト5: 異なるOriginでのCORSテスト');
    try {
      const corsTestResponse = await makeRequest('/rooms', 'POST', { mode: 'NONE' }, {
        'Origin': 'https://example.com'
      });
      console.log(`📋 異なるOrigin: ${corsTestResponse.status}`);
      console.log('📋 CORSヘッダー:', {
        'Access-Control-Allow-Origin': corsTestResponse.headers['access-control-allow-origin']
      });
    } catch (error) {
      console.log(`❌ 異なるOriginテストエラー: ${error.message}`);
    }
    
    // テスト6: 存在しないエンドポイント
    console.log('\n📊 テスト6: 存在しないエンドポイント');
    const notFoundResponse = await makeRequest('/nonexistent');
    console.log(`✅ 404エラー: ${notFoundResponse.status}`);
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

testProductionHealth().catch(console.error);
