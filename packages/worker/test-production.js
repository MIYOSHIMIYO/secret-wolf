#!/usr/bin/env node

/**
 * 本番環境テストスクリプト
 * 
 * 使用方法:
 * node test-production.js
 */

// 本番環境URL
const PROD_URL = 'https://secret-werewolf-prod.qmdg2pmnw6.workers.dev';

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

// SSL証明書を無視するfetch設定
const fetchWithSSLBypass = async (url, options = {}) => {
  try {
    // Node.js環境で SSL 証明書エラーを一時的に無視
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'User-Agent': 'Secret-Werewolf-Test/1.0',
        ...options.headers
      }
    });
    
    // SSL設定を元に戻す
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
    
    return response;
  } catch (error) {
    console.error(`❌ ネットワークエラー: ${error.message}`);
    return null;
  }
};

// ヘルスチェック
async function testHealthCheck() {
  console.log('\n🔍 本番環境ヘルスチェック');
  
  try {
    const response = await fetchWithSSLBypass(`${PROD_URL}/healthz`);
    
    if (!response) {
      return false;
    }
    
    if (response.status === 200) {
      const text = await response.text();
      console.log(`✅ ヘルスチェック成功: ${text}`);
      return true;
    } else {
      console.log(`❌ ヘルスチェック失敗: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ ヘルスチェックエラー: ${error.message}`);
    return false;
  }
}

// 環境変数確認
async function testEnvironmentVariables() {
  console.log('\n⚙️ 本番環境変数確認');
  
  try {
    const response = await fetchWithSSLBypass(`${PROD_URL}/debug/env`);
    
    if (!response) {
      return false;
    }
    
    if (response.status === 200) {
      const envData = await response.json();
      console.log(`✅ 環境: ${envData.ENVIRONMENT}`);
      console.log(`✅ CORS許可リスト: ${envData.ORIGIN_ALLOWLIST}`);
      console.log(`✅ レート制限 (Auto): ${envData.RATE_AUTO_PER_MIN} req/min`);
      console.log(`✅ レート制限 (Report): ${envData.RATE_REPORT_PER_5MIN} req/5min`);
      console.log(`✅ ログレベル: ${envData.LOG_LEVEL}`);
      return true;
    } else {
      console.log(`❌ 環境変数取得失敗: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ 環境変数確認エラー: ${error.message}`);
    return false;
  }
}

// CORS設定確認
async function testCORS() {
  console.log('\n🌐 本番環境CORS設定確認');
  
  try {
    const response = await fetchWithSSLBypass(`${PROD_URL}/healthz`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'capacitor://localhost',
        'Access-Control-Request-Method': 'GET'
      }
    });
    
    if (!response) {
      return false;
    }
    
    if (response.status === 200) {
      const allowOrigin = response.headers.get('Access-Control-Allow-Origin');
      const allowMethods = response.headers.get('Access-Control-Allow-Methods');
      
      console.log(`✅ Allow-Origin: ${allowOrigin}`);
      console.log(`✅ Allow-Methods: ${allowMethods}`);
      
      if (allowOrigin === 'capacitor://localhost') {
        return true;
      } else {
        console.log(`❌ 予期しないAllow-Origin: ${allowOrigin}`);
        return false;
      }
    } else {
      console.log(`❌ CORS確認失敗: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ CORS確認エラー: ${error.message}`);
    return false;
  }
}

// 基本的なAPI動作確認
async function testBasicAPI() {
  console.log('\n📡 基本的なAPI動作確認');
  
  try {
    // 通報状況確認API
    const response = await fetchWithSSLBypass(`${PROD_URL}/report/status/test-prod-install-id`);
    
    if (!response) {
      return false;
    }
    
    if (response.status === 200) {
      const data = await response.json();
      console.log(`✅ 通報APIが正常に動作しています`);
      console.log(`   今日の通報数: ${data.todayCount || 0}`);
      console.log(`   残り通報可能数: ${data.remainingToday || 0}`);
      return true;
    } else {
      console.log(`❌ API動作確認失敗: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ API動作確認エラー: ${error.message}`);
    return false;
  }
}

// テスト結果の表示
function displayTestResults() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 本番環境テスト結果サマリー');
  console.log('='.repeat(60));
  
  console.log(`総テスト数: ${testResults.total}`);
  console.log(`成功: ${testResults.passed} ✅`);
  console.log(`失敗: ${testResults.failed} ❌`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 本番環境のすべてのテストが成功しました！');
    console.log('🚀 本番環境は正常に動作しています');
  } else {
    console.log(`\n⚠️  ${testResults.failed}個のテストが失敗しました`);
    console.log('🔧 失敗したテストを確認してください');
  }
  
  console.log('\n本番環境URL:');
  console.log(`🌐 ${PROD_URL}`);
  
  console.log('\n' + '='.repeat(60));
}

// メイン実行
async function main() {
  console.log('🚀 本番環境テストを開始します...');
  console.log(`📍 対象URL: ${PROD_URL}`);
  
  console.log('\n' + '='.repeat(60));
  console.log('🧪 本番環境テスト実行開始');
  console.log('='.repeat(60));
  
  try {
    // 各テストを実行
    const healthTest = await testHealthCheck();
    recordTestResult('ヘルスチェック', healthTest);
    
    if (healthTest) {
      const envTest = await testEnvironmentVariables();
      recordTestResult('環境変数確認', envTest);
      
      const corsTest = await testCORS();
      recordTestResult('CORS設定確認', corsTest);
      
      const apiTest = await testBasicAPI();
      recordTestResult('基本API動作確認', apiTest);
    } else {
      console.log('\n⚠️ ヘルスチェックが失敗したため、他のテストをスキップします');
    }
    
    console.log('\n🎉 テストが完了しました！');
    
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