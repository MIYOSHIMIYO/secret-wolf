#!/usr/bin/env node

/**
 * 通報APIの独立テストスクリプト
 * 
 * 使用方法:
 * 1. 開発環境のWorkerを起動
 * 2. node test-report-api.js
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

// 通報APIの基本テスト
async function testReportAPI() {
  const results = {
    allPassed: true,
    tests: []
  };
  
  console.log('📊 通報APIの基本機能テスト');
  
  try {
    // 1. 通報状況の確認
    console.log('\n🔍 テスト1: 通報状況確認API');
    const statusResponse = await fetch('http://localhost:8787/report/status/test-install-id');
    if (statusResponse.status === 200) {
      console.log('✅ 通報状況確認API: 成功');
      results.tests.push({ name: '通報状況確認', passed: true });
    } else {
      console.log(`❌ 通報状況確認API: 失敗 (${statusResponse.status})`);
      results.tests.push({ name: '通報状況確認', passed: false });
      results.allPassed = false;
    }
    
    // 2. 通報送信（正常なケース）
    console.log('\n📝 テスト2: 通報送信API（正常）');
    const uniqueId1 = 'test-install-id-' + Date.now();
    const reportResponse = await fetch('http://localhost:8787/report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-Connecting-IP': '192.168.1.200', // 異なるIPアドレスを使用
        'Origin': 'http://localhost:5173'
      },
      body: JSON.stringify({
        installId: uniqueId1,
        targetPlayerId: 'target-player-id',
        roomId: 'TEST12',
        phase: 'DISCUSS'
      })
    });
    
    if (reportResponse.status === 200) {
      console.log('✅ 通報送信API（正常）: 成功');
      results.tests.push({ name: '通報送信（正常）', passed: true });
    } else {
      console.log(`❌ 通報送信API（正常）: 失敗 (${reportResponse.status})`);
      const responseText = await reportResponse.text();
      console.log(`   エラー詳細: ${responseText}`);
      results.tests.push({ name: '通報送信（正常）', passed: false });
      results.allPassed = false;
    }
    
    // 3. 通報送信（議論フェーズ以外）
    console.log('\n🚫 テスト3: 通報送信API（無効フェーズ）');
    const uniqueId2 = 'test-install-id-2-' + Date.now();
    const invalidPhaseResponse = await fetch('http://localhost:8787/report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-Connecting-IP': '192.168.1.200', // 異なるIPアドレスを使用
        'Origin': 'http://localhost:5173'
      },
      body: JSON.stringify({
        installId: uniqueId2,
        targetPlayerId: 'target-player-id',
        roomId: 'TEST12',
        phase: 'LOBBY'
      })
    });
    
    if (invalidPhaseResponse.status === 400) {
      console.log('✅ 通報送信API（無効フェーズ）: 正しく拒否');
      results.tests.push({ name: '通報送信（無効フェーズ）', passed: true });
    } else {
      console.log(`❌ 通報送信API（無効フェーズ）: 予期しない応答 (${invalidPhaseResponse.status})`);
      const responseText = await invalidPhaseResponse.text();
      console.log(`   エラー詳細: ${responseText}`);
      results.tests.push({ name: '通報送信（無効フェーズ）', passed: false });
      results.allPassed = false;
    }
    
    // 4. 自己通報の拒否
    console.log('\n🚫 テスト4: 自己通報の拒否');
    const uniqueId3 = 'test-install-id-3-' + Date.now();
    const selfReportResponse = await fetch('http://localhost:8787/report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-Connecting-IP': '192.168.1.200',
        'Origin': 'http://localhost:5173'
      },
      body: JSON.stringify({
        installId: uniqueId3,
        targetPlayerId: uniqueId3, // 自分自身を通報
        roomId: 'TEST12',
        phase: 'DISCUSS'
      })
    });
    
    if (selfReportResponse.status === 400) {
      console.log('✅ 自己通報: 正しく拒否');
      results.tests.push({ name: '自己通報の拒否', passed: true });
    } else {
      console.log(`❌ 自己通報: 予期しない応答 (${selfReportResponse.status})`);
      const responseText = await selfReportResponse.text();
      console.log(`   エラー詳細: ${responseText}`);
      results.tests.push({ name: '自己通報の拒否', passed: false });
      results.allPassed = false;
    }
    
  } catch (error) {
    console.error('💥 通報APIテストでエラーが発生しました:', error);
    results.allPassed = false;
  }
  
  return results;
}

// テスト結果の表示
function displayTestResults() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 通報APIテスト結果サマリー');
  console.log('='.repeat(60));
  
  console.log(`総テスト数: ${testResults.total}`);
  console.log(`成功: ${testResults.passed} ✅`);
  console.log(`失敗: ${testResults.failed} ❌`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 すべての通報APIテストが成功しました！');
  } else {
    console.log(`\n⚠️  ${testResults.failed}個のテストが失敗しました`);
  }
  
  console.log('\n' + '='.repeat(60));
}

// メイン実行
async function main() {
  console.log('🚀 通報APIの独立テストを開始します...');
  
  // ヘルスチェック
  if (!(await healthCheck())) {
    console.log('\n❌ Workerが起動していません。先にWorkerを起動してください。');
    console.log('  例: cd packages/worker && npm run dev');
    process.exit(1);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🧪 通報APIテスト開始');
  console.log('='.repeat(60));
  
  // 通報APIテストを実行
  const testResults = await testReportAPI();
  
  // 結果を記録
  recordTestResult('通報状況確認', testResults.tests[0]?.passed || false);
  recordTestResult('通報送信（正常）', testResults.tests[1]?.passed || false);
  recordTestResult('通報送信（無効フェーズ）', testResults.tests[2]?.passed || false);
  recordTestResult('自己通報の拒否', testResults.tests[3]?.passed || false);
  
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

export { testReportAPI, healthCheck }; 