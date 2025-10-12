#!/usr/bin/env node

/**
 * レート制限のテストスクリプト
 * 
 * 使用方法:
 * 1. 開発環境のWorkerを起動
 * 2. node test-rate-limit.js
 */

const BASE_URL = 'http://localhost:8787'; // 開発環境のWorker URL

// テスト用のIPアドレス（シミュレーション）
const TEST_IPS = [
  '192.168.1.100',
  '192.168.1.101',
  '192.168.1.102'
];

// レート制限のテスト
async function testRateLimit() {
  console.log('🚀 レート制限のテストを開始します...\n');

  // 1. /auto エンドポイントのレート制限テスト
  console.log('📊 /auto エンドポイントのレート制限テスト');
  console.log('期待値: 30 req/min (本番環境) / 100 req/min (開発環境)\n');
  
  await testEndpointRateLimit('/auto', 101, 'POST', {
    mode: 'LOVE',
    nick: 'TestUser',
    installId: 'test-install-id'
  });

  console.log('\n' + '='.repeat(60) + '\n');

  // 2. /report エンドポイントのレート制限テスト
  console.log('📊 /report エンドポイントのレート制限テスト');
  console.log('期待値: 60 req/5min (本番環境) / 200 req/5min (開発環境)\n');
  
  await testEndpointRateLimit('/report', 201, 'POST', {
    installId: `test-install-${Date.now()}`, // 毎回異なるinstallId
    targetPlayerId: 'target-player-id',
    roomId: 'TEST12',
    phase: 'DISCUSS'
  });

  console.log('\n✅ レート制限のテストが完了しました');
}

// 特定のエンドポイントのレート制限をテスト
async function testEndpointRateLimit(endpoint, requestCount, method, body) {
  const ip = TEST_IPS[0]; // テスト用IP
  
  console.log(`📍 エンドポイント: ${endpoint}`);
  console.log(`🌐 テストIP: ${ip}`);
  console.log(`📝 リクエスト数: ${requestCount}`);
  console.log(`⏱️  開始時刻: ${new Date().toISOString()}\n`);

  let successCount = 0;
  let rateLimitCount = 0;
  let errorCount = 0;
  const startTime = Date.now();

  // 連続リクエストを送信
  for (let i = 0; i < requestCount; i++) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': ip, // Cloudflare IPヘッダーをシミュレート
          'Origin': 'http://localhost:5173'
        },
        body: JSON.stringify({
          ...body,
          installId: endpoint === '/report' ? `test-install-${Date.now()}-${i}` : body.installId
        })
      });

      if (response.status === 200) {
        successCount++;
        if (i < 5 || i > requestCount - 5) { // 最初と最後の5件のみ表示
          console.log(`✅ リクエスト ${i + 1}: 成功 (200)`);
        }
      } else if (response.status === 429) {
        rateLimitCount++;
        const retryAfter = response.headers.get('Retry-After');
        console.log(`🚫 リクエスト ${i + 1}: レート制限 (429) - Retry-After: ${retryAfter}s`);
        break; // レート制限に達したら停止
      } else {
        errorCount++;
        console.log(`❌ リクエスト ${i + 1}: エラー (${response.status})`);
      }

      // 少し間隔を空ける（ミリ秒単位）
      await new Promise(resolve => setTimeout(resolve, 10));

    } catch (error) {
      errorCount++;
      console.log(`💥 リクエスト ${i + 1}: 例外 - ${error.message}`);
    }
  }

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;

  console.log('\n📊 テスト結果:');
  console.log(`  成功: ${successCount}`);
  console.log(`  レート制限: ${rateLimitCount}`);
  console.log(`  エラー: ${errorCount}`);
  console.log(`  実行時間: ${duration.toFixed(2)}秒`);
  console.log(`  平均RPS: ${(successCount / duration).toFixed(2)} req/s`);

  // 結果の判定
  if (rateLimitCount > 0) {
    console.log('🎯 レート制限が正しく動作しています');
  } else {
    console.log('⚠️  レート制限が動作していない可能性があります');
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
  console.log('🧪 レート制限テスト開始');
  console.log('='.repeat(60));

  await testRateLimit();
}

// スクリプト実行
main().catch(error => {
  console.error('💥 テスト実行中にエラーが発生しました:', error);
  process.exit(1);
});

export { testRateLimit, healthCheck }; 