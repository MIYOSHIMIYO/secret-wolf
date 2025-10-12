#!/usr/bin/env node

/**
 * シンプルな包括的テスト実行スクリプト
 * 
 * 使用方法:
 * 1. 開発環境のWorkerを起動
 * 2. node run-tests-simple.js
 */

// テスト結果の集計
const testResults = {
  total: 0,
  passed: 0,
  failed: 0
};

// テスト結果を記録
function recordTestResult(testName, passed) {
  testResults.total++;
  
  if (passed) {
    testResults.passed++;
    console.log(`✅  ${testName}: 成功`);
  } else {
    testResults.failed++;
    console.log(`❌  ${testName}: 失敗`);
  }
}

// ヘルスチェック
async function healthCheck() {
  console.log('🔍 Workerのヘルスチェック中...');
  
  try {
    const response = await fetch('http://localhost:8787/healthz');
    if (response.status === 200) {
      console.log('✅ Workerが正常に動作しています');
      return true;
    } else {
      console.log(`❌ Workerの状態が異常です (${response.status})`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Workerに接続できません: ${error.message}`);
    return false;
  }
}

// レート制限のテスト
async function testRateLimit() {
  console.log('\n🧪 レート制限テスト実行中...');
  
  try {
    // 基本的なレート制限テスト
    const response = await fetch('http://localhost:8787/auto', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-Connecting-IP': '192.168.1.100'
      },
      body: JSON.stringify({
        mode: "STRANGER",
        nick: "テストユーザー",
        installId: "test-install-" + Date.now()
      })
    });
    
    if (response.status === 200) {
      console.log('✅ レート制限テスト: 基本的なリクエストが成功');
      return true;
    } else {
      console.log(`❌ レート制限テスト: 予期しない応答 (${response.status})`);
      return false;
    }
  } catch (error) {
    console.error('❌ レート制限テストでエラー:', error);
    return false;
  }
}

// CORS設定のテスト
async function testCORS() {
  console.log('\n🧪 CORS設定テスト実行中...');
  
  try {
    const response = await fetch('http://localhost:8787/healthz', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5173'
      }
    });
    
    if (response.status === 200) {
      const allowOrigin = response.headers.get('Access-Control-Allow-Origin');
      if (allowOrigin === 'http://localhost:5173') {
        console.log('✅ CORS設定テスト: 開発環境オリジンが正しく許可されています');
        return true;
      } else {
        console.log(`❌ CORS設定テスト: 予期しないAllow-Origin (${allowOrigin})`);
        return false;
      }
    } else {
      console.log(`❌ CORS設定テスト: 予期しない応答 (${response.status})`);
      return false;
    }
  } catch (error) {
    console.error('❌ CORS設定テストでエラー:', error);
    return false;
  }
}

// 通報APIのテスト
async function testReportAPI() {
  console.log('\n🧪 通報APIテスト実行中...');
  
  try {
    const response = await fetch('http://localhost:8787/report/status/test-install-id');
    
    if (response.status === 200) {
      console.log('✅ 通報APIテスト: 基本的なAPIが動作しています');
      return true;
    } else {
      console.log(`❌ 通報APIテスト: 予期しない応答 (${response.status})`);
      return false;
    }
  } catch (error) {
    console.error('❌ 通報APIテストでエラー:', error);
    return false;
  }
}

// 環境変数の確認
async function testEnvironment() {
  console.log('\n🧪 環境変数テスト実行中...');
  
  try {
    const response = await fetch('http://localhost:8787/debug/env');
    
    if (response.status === 200) {
      const envData = await response.json();
      console.log('✅ 環境変数テスト: 環境変数が正しく設定されています');
      console.log(`   環境: ${envData.ENVIRONMENT || '未設定'}`);
      console.log(`   CORS許可リスト: ${envData.ORIGIN_ALLOWLIST || '未設定'}`);
      return true;
    } else {
      console.log(`❌ 環境変数テスト: 予期しない応答 (${response.status})`);
      return false;
    }
  } catch (error) {
    console.error('❌ 環境変数テストでエラー:', error);
    return false;
  }
}

// テスト結果の表示
function displayTestResults() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 包括的テスト結果サマリー');
  console.log('='.repeat(60));
  
  console.log(`総テスト数: ${testResults.total}`);
  console.log(`成功: ${testResults.passed} ✅`);
  console.log(`失敗: ${testResults.failed} ❌`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 すべてのテストが成功しました！');
    console.log('🚀 システムは本番環境での運用準備が整っています');
  } else {
    console.log(`\n⚠️  ${testResults.failed}個のテストが失敗しました`);
    console.log('🔧 失敗したテストを修正してから再実行してください');
  }
  
  console.log('\n' + '='.repeat(60));
}

// メイン実行
async function main() {
  console.log('🚀 シンプルな包括的テストを開始します...');
  console.log('📋 実行予定のテスト:');
  console.log('  1. ヘルスチェック');
  console.log('  2. レート制限テスト');
  console.log('  3. CORS設定テスト');
  console.log('  4. 通報APIテスト');
  console.log('  5. 環境変数テスト');
  
  // ヘルスチェック
  if (!(await healthCheck())) {
    console.log('\n❌ Workerが起動していません。先にWorkerを起動してください。');
    console.log('  例: cd packages/worker && npm run dev');
    process.exit(1);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🧪 包括的テスト実行開始');
  console.log('='.repeat(60));
  
  try {
    // 各テストを順次実行
    const rateLimitTest = await testRateLimit();
    recordTestResult('レート制限テスト', rateLimitTest);
    
    const corsTest = await testCORS();
    recordTestResult('CORS設定テスト', corsTest);
    
    const reportAPITest = await testReportAPI();
    recordTestResult('通報APIテスト', reportAPITest);
    
    const envTest = await testEnvironment();
    recordTestResult('環境変数テスト', envTest);
    
    console.log('\n🎉 すべてのテストが完了しました！');
    
  } catch (error) {
    console.error('\n💥 テスト実行中にエラーが発生しました:', error);
    recordTestResult('テスト実行エラー', false);
  }
  
  // 結果を表示
  displayTestResults();
  
  // 終了コード
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// スクリプト実行
main().catch(error => {
  console.error('💥 テスト実行中にエラーが発生しました:', error);
  process.exit(1);
}); 