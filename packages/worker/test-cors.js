#!/usr/bin/env node

/**
 * CORS設定のテストスクリプト
 * 
 * 使用方法:
 * 1. 開発環境のWorkerを起動
 * 2. node test-cors.js
 */

const BASE_URL = 'http://localhost:8787'; // 開発環境のWorker URL

// テスト用のオリジン
const TEST_ORIGINS = [
  'http://localhost:5173',      // 開発環境許可
  'http://127.0.0.1:5173',     // 開発環境許可
  'capacitor://localhost',      // 本番環境許可
  'https://malicious-site.com', // 許可されないオリジン
  'http://localhost:3000',      // 許可されないポート
  undefined                     // Originヘッダーなし
];

// CORS設定のテスト
async function testCORS() {
  console.log('🚀 CORS設定のテストを開始します...\n');

  console.log('📊 各オリジンでのCORS設定テスト');
  console.log('期待値: 開発環境では localhost:5173 を許可、本番環境では capacitor://localhost のみ許可\n');

  for (const origin of TEST_ORIGINS) {
    await testOriginCORS(origin);
    console.log(''); // 空行
  }

  console.log('✅ CORS設定のテストが完了しました');
}

// 特定のオリジンでのCORS設定をテスト
async function testOriginCORS(origin) {
  const originLabel = origin || '(Originヘッダーなし)';
  console.log(`🌐 テストオリジン: ${originLabel}`);

  try {
    // OPTIONS リクエスト（プリフライト）
    const preflightResponse = await fetch(`${BASE_URL}/healthz`, {
      method: 'OPTIONS',
      headers: origin ? { 'Origin': origin } : {}
    });

    const corsOrigin = preflightResponse.headers.get('Access-Control-Allow-Origin');
    const corsMethods = preflightResponse.headers.get('Access-Control-Allow-Methods');
    const varyHeader = preflightResponse.headers.get('Vary');

    console.log(`  📋 プリフライト応答:`);
    console.log(`    Access-Control-Allow-Origin: ${corsOrigin}`);
    console.log(`    Access-Control-Allow-Methods: ${corsMethods}`);
    console.log(`    Vary: ${varyHeader}`);

    // 実際のリクエスト
    const actualResponse = await fetch(`${BASE_URL}/healthz`, {
      method: 'GET',
      headers: origin ? { 'Origin': origin } : {}
    });

    const actualCorsOrigin = actualResponse.headers.get('Access-Control-Allow-Origin');
    console.log(`  📋 実際のリクエスト応答:`);
    console.log(`    Access-Control-Allow-Origin: ${actualCorsOrigin}`);
    console.log(`    Status: ${actualResponse.status}`);

    // 結果の判定
    if (origin === 'http://localhost:5173' || origin === 'http://127.0.0.1:5173') {
      if (corsOrigin === origin) {
        console.log(`  ✅ 開発環境オリジンが正しく許可されています`);
      } else {
        console.log(`  ❌ 開発環境オリジンが許可されていません`);
      }
    } else if (origin === 'capacitor://localhost') {
      if (corsOrigin === origin) {
        console.log(`  ✅ 本番環境オリジンが正しく許可されています`);
      } else {
        console.log(`  ❌ 本番環境オリジンが許可されていません`);
      }
    } else if (origin === undefined) {
      if (corsOrigin === '*' || corsOrigin) {
        console.log(`  ✅ Originヘッダーなしの場合が正しく処理されています`);
      } else {
        console.log(`  ❌ Originヘダーなしの場合の処理に問題があります`);
      }
    } else {
      if (corsOrigin === origin) {
        console.log(`  ⚠️  予期しないオリジンが許可されています: ${origin}`);
      } else {
        console.log(`  ✅ 許可されないオリジンが正しく拒否されています`);
      }
    }

  } catch (error) {
    console.log(`  💥 テスト実行中にエラーが発生しました: ${error.message}`);
  }
}

// 環境変数のテスト
async function testEnvironment() {
  console.log('🔧 環境変数の確認');
  
  try {
    const response = await fetch(`${BASE_URL}/healthz`);
    const corsOrigin = response.headers.get('Access-Control-Allow-Origin');
    
    console.log(`現在のCORS設定: ${corsOrigin}`);
    
    if (corsOrigin === 'http://localhost:5173') {
      console.log('✅ 開発環境モードで動作中');
    } else if (corsOrigin === 'capacitor://localhost') {
      console.log('✅ 本番環境モードで動作中');
    } else {
      console.log(`⚠️  予期しない環境設定: ${corsOrigin}`);
    }
    
  } catch (error) {
    console.log(`❌ 環境確認中にエラーが発生しました: ${error.message}`);
  }
}

// ヘルスチェック
async function healthCheck() {
  try {
    const response = await fetch(`${BASE_URL}/healthz`);
    if (response.status === 200) {
      console.log('✅ Workerが起動しています');
      return true;
    } else {
      console.log(`❌ Workerの状態が異常です: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Workerに接続できません: ${error.message}`);
    return false;
  }
}

// メイン実行
async function main() {
  console.log('🔍 Workerのヘルスチェック中...');
  
  if (!(await healthCheck())) {
    console.log('\n❌ Workerが起動していません。先にWorkerを起動してください。');
    console.log('  例: cd packages/worker && npm run dev');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🧪 CORS設定テスト開始');
  console.log('='.repeat(60));

  await testEnvironment();
  console.log('\n' + '-'.repeat(40));
  
  await testCORS();
}

// スクリプト実行
main().catch(error => {
  console.error('💥 テスト実行中にエラーが発生しました:', error);
  process.exit(1);
});

export { testCORS, testEnvironment, healthCheck }; 