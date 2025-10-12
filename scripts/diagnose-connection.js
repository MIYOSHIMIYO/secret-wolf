#!/usr/bin/env node

/**
 * WebSocket接続問題の診断スクリプト
 * 開発環境での接続問題を特定し、解決策を提案します
 */

const { execSync } = require('child_process');
const net = require('net');

// 色付きログ
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, () => {
      server.once('close', () => {
        resolve(true);
      });
      server.close();
    });
    
    server.on('error', () => {
      resolve(false);
    });
  });
}

function killProcessOnPort(port) {
  try {
    const pid = execSync(`lsof -ti:${port}`, { encoding: 'utf8' }).trim();
    if (pid) {
      execSync(`kill -9 ${pid}`);
      log(`ポート${port}で動いていたプロセス(${pid})を停止しました`, 'yellow');
      return true;
    }
  } catch (error) {
    // プロセスが見つからない場合は無視
  }
  return false;
}

async function diagnoseConnection() {
  log('🔍 WebSocket接続問題の診断を開始します...', 'blue');
  console.log('');

  // 1. ポート8787の状態チェック
  log('1. ポート8787の状態をチェック中...', 'blue');
  const port8787Available = await checkPort(8787);
  
  if (!port8787Available) {
    log('❌ ポート8787が使用中です', 'red');
    const killed = killProcessOnPort(8787);
    if (killed) {
      log('✅ プロセスを停止しました', 'green');
    } else {
      log('⚠️  プロセスを停止できませんでした', 'yellow');
    }
  } else {
    log('✅ ポート8787は利用可能です', 'green');
  }

  // 2. ポート5173の状態チェック
  log('2. ポート5173の状態をチェック中...', 'blue');
  const port5173Available = await checkPort(5173);
  
  if (!port5173Available) {
    log('❌ ポート5173が使用中です', 'red');
    const killed = killProcessOnPort(5173);
    if (killed) {
      log('✅ プロセスを停止しました', 'green');
    } else {
      log('⚠️  プロセスを停止できませんでした', 'yellow');
    }
  } else {
    log('✅ ポート5173は利用可能です', 'green');
  }

  // 3. プロセス確認
  log('3. 関連プロセスの確認中...', 'blue');
  try {
    const wranglerProcesses = execSync('ps aux | grep wrangler | grep -v grep', { encoding: 'utf8' });
    if (wranglerProcesses.trim()) {
      log('⚠️  Wranglerプロセスが実行中です:', 'yellow');
      console.log(wranglerProcesses);
    } else {
      log('✅ Wranglerプロセスは実行されていません', 'green');
    }
  } catch (error) {
    log('✅ Wranglerプロセスは実行されていません', 'green');
  }

  try {
    const viteProcesses = execSync('ps aux | grep vite | grep -v grep', { encoding: 'utf8' });
    if (viteProcesses.trim()) {
      log('⚠️  Viteプロセスが実行中です:', 'yellow');
      console.log(viteProcesses);
    } else {
      log('✅ Viteプロセスは実行されていません', 'green');
    }
  } catch (error) {
    log('✅ Viteプロセスは実行されていません', 'green');
  }

  // 4. 推奨解決策
  console.log('');
  log('💡 推奨解決策:', 'blue');
  console.log('');
  
  log('1. 既存のプロセスを完全に停止:', 'yellow');
  log('   pkill -f wrangler', 'reset');
  log('   pkill -f vite', 'reset');
  log('   pkill -f "pnpm dev"', 'reset');
  console.log('');

  log('2. プロジェクトディレクトリに移動:', 'yellow');
  log('   cd /Users/miyoshiyuudai/Desktop/秘密人狼', 'reset');
  console.log('');

  log('3. 依存関係を再インストール:', 'yellow');
  log('   pnpm install', 'reset');
  console.log('');

  log('4. サーバーとクライアントを起動:', 'yellow');
  log('   pnpm dev', 'reset');
  console.log('');

  log('5. 接続確認:', 'yellow');
  log('   - クライアント: http://localhost:5173', 'reset');
  log('   - サーバー: http://localhost:8787', 'reset');
  console.log('');

  log('6. 問題が続く場合:', 'yellow');
  log('   - ブラウザのキャッシュをクリア', 'reset');
  log('   - 別のポートを使用: pnpm -C packages/worker dev --port 8788', 'reset');
  log('   - ログを確認: tail -f packages/worker/wrangler.log', 'reset');
  console.log('');

  log('🎯 診断完了！上記の手順に従って接続問題を解決してください。', 'green');
}

// スクリプト実行
diagnoseConnection().catch(console.error);
