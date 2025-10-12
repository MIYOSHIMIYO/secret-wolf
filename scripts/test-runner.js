#!/usr/bin/env node

/**
 * テストランナー
 * すべてのテストスクリプトを統合的に実行し、結果をレポートします
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

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

// テスト定義
const tests = [
  {
    name: 'ネットワーク監査',
    script: 'network-audit.js',
    args: ['dev'],
    description: 'WebSocket通信とHTTP接続の動作確認',
    critical: true
  },
  {
    name: '本番WebSocket接続',
    script: 'network-audit.js',
    args: ['prod'],
    description: '本番環境でのWebSocket接続テスト',
    critical: true
  },
  {
    name: 'ゲームフロー全体',
    script: '../test-complete-game-flow.js',
    args: [],
    description: '完全なゲームフローのテスト',
    critical: true
  },
  {
    name: '自動マッチング',
    script: '../test-auto-match.js',
    args: [],
    description: '自動マッチング機能のテスト',
    critical: false
  },
  {
    name: '友達ゲーム',
    script: '../test-friends-game.js',
    args: [],
    description: '友達同士でのゲーム機能テスト',
    critical: false
  },
  {
    name: '機能テスト',
    script: '../test-functionality.js',
    args: [],
    description: '個別機能のテスト',
    critical: false
  },
  {
    name: '繰り返し実行',
    script: '../test-repeat-execution.js',
    args: [],
    description: '繰り返し実行の安定性テスト',
    critical: false
  },
  {
    name: 'WebSocket切断',
    script: '../test-websocket-disband.js',
    args: [],
    description: 'WebSocket切断時の動作テスト',
    critical: false
  }
];

// テスト結果
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  total: 0,
  details: []
};

// テスト実行
async function runTest(test) {
  return new Promise((resolve) => {
    log(`🧪 ${test.name} 開始`, 'blue');
    log(`   ${test.description}`, 'cyan');
    
    const scriptPath = path.join(__dirname, test.script);
    const startTime = Date.now();
    
    // スクリプトが存在するかチェック
    if (!fs.existsSync(scriptPath)) {
      log(`❌ スクリプトが見つかりません: ${test.script}`, 'red');
      results.skipped++;
      results.details.push({
        name: test.name,
        status: 'skipped',
        reason: 'Script not found',
        duration: 0
      });
      resolve();
      return;
    }
    
    const child = spawn('node', [scriptPath, ...test.args], {
      cwd: path.dirname(scriptPath),
      stdio: 'pipe'
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      if (code === 0) {
        log(`✅ ${test.name} 成功 (${duration}ms)`, 'green');
        results.passed++;
        results.details.push({
          name: test.name,
          status: 'passed',
          duration: duration,
          output: stdout
        });
      } else {
        log(`❌ ${test.name} 失敗 (${duration}ms)`, 'red');
        results.failed++;
        results.details.push({
          name: test.name,
          status: 'failed',
          duration: duration,
          output: stdout,
          error: stderr,
          exitCode: code
        });
      }
      
      resolve();
    });
    
    child.on('error', (error) => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      log(`❌ ${test.name} エラー: ${error.message}`, 'red');
      results.failed++;
      results.details.push({
        name: test.name,
        status: 'error',
        duration: duration,
        error: error.message
      });
      
      resolve();
    });
    
    // タイムアウト設定（5分）
    setTimeout(() => {
      child.kill('SIGTERM');
      log(`⏰ ${test.name} タイムアウト`, 'yellow');
      results.failed++;
      results.details.push({
        name: test.name,
        status: 'timeout',
        duration: 300000,
        error: 'Test timeout'
      });
      resolve();
    }, 300000);
  });
}

// 結果レポート
function generateReport() {
  log('\n📊 テスト結果レポート', 'magenta');
  log('=' .repeat(60), 'magenta');
  
  // サマリー
  log('\n📈 サマリー:', 'blue');
  log(`  総テスト数: ${results.total}`, 'reset');
  log(`  成功: ${results.passed}`, 'green');
  log(`  失敗: ${results.failed}`, 'red');
  log(`  スキップ: ${results.skipped}`, 'yellow');
  
  const successRate = results.total > 0 ? (results.passed / results.total) * 100 : 0;
  log(`  成功率: ${successRate.toFixed(1)}%`, successRate > 80 ? 'green' : 'red');
  
  // 詳細結果
  log('\n📋 詳細結果:', 'blue');
  results.details.forEach((detail, index) => {
    const status = detail.status === 'passed' ? '✅' : 
                  detail.status === 'failed' ? '❌' : 
                  detail.status === 'skipped' ? '⏭️ ' : '⚠️ ';
    
    log(`  ${index + 1}. ${status} ${detail.name} (${detail.duration}ms)`, 
        detail.status === 'passed' ? 'green' : 
        detail.status === 'failed' ? 'red' : 'yellow');
    
    if (detail.error) {
      log(`     エラー: ${detail.error}`, 'red');
    }
    
    if (detail.reason) {
      log(`     理由: ${detail.reason}`, 'yellow');
    }
  });
  
  // クリティカルテストの結果
  const criticalTests = results.details.filter(detail => 
    tests.find(test => test.name === detail.name && test.critical)
  );
  
  const criticalPassed = criticalTests.filter(detail => detail.status === 'passed').length;
  const criticalTotal = criticalTests.length;
  
  log('\n🚨 クリティカルテスト:', 'blue');
  log(`  成功: ${criticalPassed}/${criticalTotal}`, 
      criticalPassed === criticalTotal ? 'green' : 'red');
  
  if (criticalPassed < criticalTotal) {
    log('  ⚠️  クリティカルテストが失敗しています。デプロイ前に修正が必要です。', 'red');
  }
  
  // 推奨事項
  log('\n💡 推奨事項:', 'yellow');
  
  if (successRate < 80) {
    log('  - テストの成功率が低いです。失敗したテストを修正してください。', 'red');
  }
  
  if (results.failed > 0) {
    log('  - 失敗したテストの詳細を確認し、問題を修正してください。', 'yellow');
  }
  
  if (results.skipped > 0) {
    log('  - スキップされたテストのスクリプトが存在するか確認してください。', 'yellow');
  }
  
  // 全体的な評価
  if (criticalPassed === criticalTotal && successRate > 90) {
    log('\n🎉 テスト結果: 優秀 - デプロイ準備完了', 'green');
  } else if (criticalPassed === criticalTotal && successRate > 80) {
    log('\n⚠️  テスト結果: 良好 - デプロイ可能（改善推奨）', 'yellow');
  } else if (criticalPassed === criticalTotal) {
    log('\n⚠️  テスト結果: 要改善 - デプロイ前に修正推奨', 'yellow');
  } else {
    log('\n❌ テスト結果: 要修正 - デプロイ不可', 'red');
  }
}

// メイン実行
async function main() {
  const args = process.argv.slice(2);
  const testFilter = args[0]; // 特定のテスト名でフィルタ
  
  log('🚀 テストランナー開始', 'magenta');
  log('=' .repeat(60), 'magenta');
  
  // フィルタ適用
  const testsToRun = testFilter ? 
    tests.filter(test => test.name.toLowerCase().includes(testFilter.toLowerCase())) :
    tests;
  
  if (testsToRun.length === 0) {
    log(`❌ テストが見つかりません: ${testFilter}`, 'red');
    process.exit(1);
  }
  
  results.total = testsToRun.length;
  
  // テスト実行
  for (const test of testsToRun) {
    await runTest(test);
    
    // テスト間の間隔
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 結果レポート
  generateReport();
  
  // 終了コード
  const hasCriticalFailures = results.details.some(detail => 
    tests.find(test => test.name === detail.name && test.critical) && 
    detail.status !== 'passed'
  );
  
  process.exit(hasCriticalFailures ? 1 : 0);
}

// スクリプト実行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runTest, generateReport };
