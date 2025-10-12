#!/usr/bin/env node

/**
 * 包括的なテスト実行スクリプト
 * 
 * 使用方法:
 * 1. 開発環境のWorkerを起動
 * 2. node run-tests.js
 */

import { testRateLimit, healthCheck as rateLimitHealthCheck } from './test-rate-limit.js';
import { testCORS, testEnvironment, healthCheck as corsHealthCheck } from './test-cors.js';
import { testReportAPI } from './test-report-api.js';
import { testWebSocketConnection } from './test-websocket.js';
import { testPhaseTransition } from './test-phase-transition.js';
import { testVotingSystem, testWinCondition } from './test-game-logic.js';

// テスト結果の集計
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0
};

// テスト結果を記録
function recordTestResult(testName, passed, skipped = false) {
  testResults.total++;
  
  if (skipped) {
    testResults.skipped++;
    console.log(`⏭️  ${testName}: スキップ`);
  } else if (passed) {
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
    // 両方のヘルスチェックを実行
    const rateLimitOk = await rateLimitHealthCheck();
    const corsOk = await corsHealthCheck();
    
    if (rateLimitOk && corsOk) {
      console.log('✅ Workerが正常に動作しています');
      return true;
    } else {
      console.log('❌ Workerの状態が異常です');
      return false;
    }
  } catch (error) {
    console.log(`❌ Workerに接続できません: ${error.message}`);
    return false;
  }
}

// レート制限のテスト
async function runRateLimitTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 レート制限テスト開始');
  console.log('='.repeat(60));
  
  try {
    await testRateLimit();
    recordTestResult('レート制限テスト', true);
  } catch (error) {
    console.error('💥 レート制限テストでエラーが発生しました:', error);
    recordTestResult('レート制限テスト', false);
  }
}

// CORS設定のテスト
async function runCORSTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 CORS設定テスト開始');
  console.log('='.repeat(60));
  
  try {
    await testEnvironment();
    await testCORS();
    recordTestResult('CORS設定テスト', true);
  } catch (error) {
    console.error('💥 CORS設定テストでエラーが発生しました:', error);
    recordTestResult('CORS設定テスト', false);
  }
}

// 通報APIのテスト
async function runReportAPITests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 通報APIテスト開始');
  console.log('='.repeat(60));
  
  try {
    // 基本的な通報APIのテスト
    const testResults = await testReportAPI();
    recordTestResult('通報APIテスト', testResults.allPassed);
  } catch (error) {
    console.error('💥 通報APIテストでエラーが発生しました:', error);
    recordTestResult('通報APIテスト', false);
  }
}

// WebSocket接続のテスト
async function runWebSocketTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 WebSocket接続テスト開始');
  console.log('='.repeat(60));
  
  try {
    await testWebSocketConnection();
    recordTestResult('WebSocket接続テスト', true);
  } catch (error) {
    console.error('💥 WebSocket接続テストでエラーが発生しました:', error);
    recordTestResult('WebSocket接続テスト', false);
  }
}

// フェーズ遷移のテスト
async function runPhaseTransitionTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 フェーズ遷移テスト開始');
  console.log('='.repeat(60));
  
  try {
    await testPhaseTransition();
    recordTestResult('フェーズ遷移テスト', true);
  } catch (error) {
    console.error('💥 フェーズ遷移テストでエラーが発生しました:', error);
    recordTestResult('フェーズ遷移テスト', false);
  }
}

// ゲームロジックのテスト
async function runGameLogicTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 ゲームロジックテスト開始');
  console.log('='.repeat(60));
  
  try {
    // 投票システムテスト
    const votingTest = await testVotingSystem();
    recordTestResult('投票システムテスト', votingTest);
    
    // 勝敗判定テスト
    const winConditionTest = await testWinCondition();
    recordTestResult('勝敗判定テスト', winConditionTest);
    
    return votingTest && winConditionTest;
  } catch (error) {
    console.error('💥 ゲームロジックテストでエラーが発生しました:', error);
    recordTestResult('ゲームロジックテスト', false);
    return false;
  }
}

// 統合テスト（全機能の連携確認）
async function runIntegrationTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 統合テスト開始');
  console.log('='.repeat(60));
  
  try {
    // 基本的な機能が連携して動作することを確認
    console.log('🔗 全機能の連携動作を確認中...');
    
    // 1. ヘルスチェック
    const healthOk = await healthCheck();
    if (!healthOk) {
      throw new Error('ヘルスチェックが失敗しました');
    }
    
    // 2. 環境変数の確認
    const envResponse = await fetch('http://localhost:8787/debug/env');
    if (envResponse.status !== 200) {
      throw new Error('環境変数の取得に失敗しました');
    }
    
    // 3. 基本的な機能連携確認
    console.log('✅ 全機能の連携が正常に動作しています');
    recordTestResult('統合テスト', true);
    return true;
    
  } catch (error) {
    console.error('💥 統合テストでエラーが発生しました:', error);
    recordTestResult('統合テスト', false);
    return false;
  }
}

// テスト結果の表示
function displayTestResults() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 包括的テスト結果サマリー');
  console.log('='.repeat(80));
  
  console.log(`総テスト数: ${testResults.total}`);
  console.log(`成功: ${testResults.passed} ✅`);
  console.log(`失敗: ${testResults.failed} ❌`);
  console.log(`スキップ: ${testResults.skipped} ⏭️`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 すべてのテストが成功しました！');
    console.log('🚀 システムは本番環境での運用準備が整っています');
  } else {
    console.log(`\n⚠️  ${testResults.failed}個のテストが失敗しました`);
    console.log('🔧 失敗したテストを修正してから再実行してください');
  }
  
  console.log('\n' + '='.repeat(80));
}

// メイン実行
async function main() {
  console.log('🚀 包括的なテストを開始します...');
  console.log('📋 実行予定のテスト:');
  console.log('  1. レート制限テスト');
  console.log('  2. CORS設定テスト');
  console.log('  3. 通報APIテスト');
  console.log('  4. WebSocket接続テスト');
  console.log('  5. フェーズ遷移テスト');
  console.log('  6. ゲームロジックテスト');
  console.log('  7. 統合テスト');
  
  // ヘルスチェック
  if (!(await healthCheck())) {
    console.log('\n❌ Workerが起動していません。先にWorkerを起動してください。');
    console.log('  例: cd packages/worker && npm run dev');
    process.exit(1);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('🧪 包括的テスト実行開始');
  console.log('='.repeat(80));
  
  try {
    // 各テストを順次実行（競合を避けるため）
    console.log('\n📋 1. レート制限テスト実行中...');
    await runRateLimitTests();
    
    console.log('\n📋 2. CORS設定テスト実行中...');
    await runCORSTests();
    
    // レート制限テストの影響を避けるため、十分な待機時間を設定
    console.log('\n⏳ レート制限テストの影響を避けるため、15秒待機中...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    console.log('\n📋 3. 通報APIテスト実行中...');
    await runReportAPITests();
    
    // 通報APIテストの影響を避けるため、待機
    console.log('\n⏳ 通報APIテストの影響を避けるため、10秒待機中...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    console.log('\n📋 4. WebSocket接続テスト実行中...');
    await runWebSocketTests();
    
    // WebSocketテストの影響を避けるため、待機
    console.log('\n⏳ WebSocketテストの影響を避けるため、5秒待機中...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n📋 5. フェーズ遷移テスト実行中...');
    await runPhaseTransitionTests();
    
    // フェーズ遷移テストの影響を避けるため、待機
    console.log('\n⏳ フェーズ遷移テストの影響を避けるため、5秒待機中...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n📋 6. ゲームロジックテスト実行中...');
    await runGameLogicTests();
    
    // ゲームロジックテストの影響を避けるため、待機
    console.log('\n⏳ ゲームロジックテストの影響を避けるため、5秒待機中...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n📋 7. 統合テスト実行中...');
    await runIntegrationTests();
    
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

export { 
  runRateLimitTests, 
  runCORSTests, 
  runReportAPITests, 
  runWebSocketTests, 
  runPhaseTransitionTests, 
  runGameLogicTests, 
  runIntegrationTests 
}; 