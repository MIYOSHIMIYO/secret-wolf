#!/usr/bin/env node

/**
 * ドキュメント自動同期スクリプト
 * コードの変更を検出してドキュメントを自動更新
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

// 設定
const CONFIG = {
  watchPaths: [
    'packages/shared/src',
    'packages/worker/src',
    'packages/client/src'
  ],
  docPaths: [
    'docs/requirements.md',
    'docs/deployment-checklist.md',
    'docs/testing-guide.md'
  ],
  outputDir: 'docs/generated'
};

// ファイル変更検出
function getFileHash(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return require('crypto').createHash('md5').update(content).digest('hex');
  } catch (error) {
    return null;
  }
}

// 型定義の抽出
function extractTypeDefinitions() {
  const typeFile = 'packages/shared/src/gameTypes.ts';
  
  if (!fs.existsSync(typeFile)) {
    return null;
  }
  
  const content = fs.readFileSync(typeFile, 'utf8');
  
  // Mode型の抽出
  const modeMatch = content.match(/export type Mode = "([^"]+)"(?:\s*\|\s*"([^"]+)")*/);
  const modes = modeMatch ? modeMatch[0].match(/"([^"]+)"/g).map(m => m.replace(/"/g, '')) : [];
  
  // Phase型の抽出
  const phaseMatch = content.match(/export type Phase = "([^"]+)"(?:\s*\|\s*"([^"]+)")*/);
  const phases = phaseMatch ? phaseMatch[0].match(/"([^"]+)"/g).map(m => m.replace(/"/g, '')) : [];
  
  return { modes, phases };
}

// プロンプトの抽出
function extractPrompts() {
  const promptFile = 'packages/shared/src/prompts.ts';
  
  if (!fs.existsSync(promptFile)) {
    return null;
  }
  
  const content = fs.readFileSync(promptFile, 'utf8');
  
  // PROMPTSオブジェクトの抽出
  const promptMatch = content.match(/export const PROMPTS = \{([\s\S]*?)\} as const;/);
  if (!promptMatch) {
    return null;
  }
  
  const prompts = {};
  const modeMatches = promptMatch[1].match(/(\w+):\s*\[([\s\S]*?)\]/g);
  
  if (modeMatches) {
    modeMatches.forEach(match => {
      const modeMatch = match.match(/(\w+):\s*\[([\s\S]*?)\]/);
      if (modeMatch) {
        const mode = modeMatch[1];
        const items = modeMatch[2].match(/"([^"]+)"/g);
        prompts[mode] = items ? items.map(item => item.replace(/"/g, '')) : [];
      }
    });
  }
  
  return prompts;
}

// 環境設定の抽出
function extractEnvironmentConfig() {
  const configs = {
    client: {},
    worker: {}
  };
  
  // クライアント設定
  const clientConfigFile = 'packages/client/capacitor.config.ts';
  if (fs.existsSync(clientConfigFile)) {
    const content = fs.readFileSync(clientConfigFile, 'utf8');
    
    // appIdの抽出
    const appIdMatch = content.match(/appId:\s*"([^"]+)"/);
    if (appIdMatch) {
      configs.client.appId = appIdMatch[1];
    }
    
    // appNameの抽出
    const appNameMatch = content.match(/appName:\s*"([^"]+)"/);
    if (appNameMatch) {
      configs.client.appName = appNameMatch[1];
    }
  }
  
  // ワーカー設定
  const workerConfigFile = 'packages/worker/wrangler.toml';
  if (fs.existsSync(workerConfigFile)) {
    const content = fs.readFileSync(workerConfigFile, 'utf8');
    
    // 名前の抽出
    const nameMatch = content.match(/name = "([^"]+)"/);
    if (nameMatch) {
      configs.worker.name = nameMatch[1];
    }
    
    // 環境変数の抽出
    const envVars = {};
    const varMatches = content.match(/\[vars\]\s*([\s\S]*?)(?=\[|$)/);
    if (varMatches) {
      const varContent = varMatches[1];
      const varLines = varContent.split('\n');
      varLines.forEach(line => {
        const varMatch = line.match(/(\w+)\s*=\s*"([^"]+)"/);
        if (varMatch) {
          envVars[varMatch[1]] = varMatch[2];
        }
      });
    }
    configs.worker.vars = envVars;
  }
  
  return configs;
}

// API仕様の抽出
function extractApiSpecs() {
  const apiSpecs = {
    endpoints: [],
    websocket: {
      clientToServer: [],
      serverToClient: []
    }
  };
  
  // ワーカーのエンドポイント抽出
  const workerIndexFile = 'packages/worker/src/index.ts';
  if (fs.existsSync(workerIndexFile)) {
    const content = fs.readFileSync(workerIndexFile, 'utf8');
    
    // ルート定義の抽出
    const routeMatches = content.match(/router\.(get|post|put|delete)\(['"`]([^'"`]+)['"`]/g);
    if (routeMatches) {
      routeMatches.forEach(match => {
        const methodMatch = match.match(/router\.(get|post|put|delete)\(['"`]([^'"`]+)['"`]/);
        if (methodMatch) {
          apiSpecs.endpoints.push({
            method: methodMatch[1].toUpperCase(),
            path: methodMatch[2]
          });
        }
      });
    }
  }
  
  // WebSocketメッセージの抽出
  const gameTypesFile = 'packages/shared/src/gameTypes.ts';
  if (fs.existsSync(gameTypesFile)) {
    const content = fs.readFileSync(gameTypesFile, 'utf8');
    
    // C2Sメッセージの抽出
    const c2sMatches = content.match(/export const C_\w+ = z\.object\(\{[\s\S]*?\}\);/g);
    if (c2sMatches) {
      c2sMatches.forEach(match => {
        const typeMatch = match.match(/export const C_(\w+) =/);
        if (typeMatch) {
          apiSpecs.websocket.clientToServer.push(typeMatch[1]);
        }
      });
    }
    
    // S2Cメッセージの抽出
    const s2cMatches = content.match(/export const S_\w+ = z\.object\(\{[\s\S]*?\}\);/g);
    if (s2cMatches) {
      s2cMatches.forEach(match => {
        const typeMatch = match.match(/export const S_(\w+) =/);
        if (typeMatch) {
          apiSpecs.websocket.serverToClient.push(typeMatch[1]);
        }
      });
    }
  }
  
  return apiSpecs;
}

// ドキュメント生成
function generateDocumentation() {
  log('📝 ドキュメント生成中...', 'blue');
  
  // 出力ディレクトリの作成
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
  
  // 型定義の抽出
  const typeDefs = extractTypeDefinitions();
  if (typeDefs) {
    const typeDoc = `# 型定義

## Mode
${typeDefs.modes.map(mode => `- \`${mode}\``).join('\n')}

## Phase
${typeDefs.phases.map(phase => `- \`${phase}\``).join('\n')}

*このドキュメントは自動生成されています。*
`;
    
    fs.writeFileSync(path.join(CONFIG.outputDir, 'types.md'), typeDoc);
    log('✅ 型定義ドキュメント生成完了', 'green');
  }
  
  // プロンプトの抽出
  const prompts = extractPrompts();
  if (prompts) {
    let promptDoc = `# プロンプト一覧

`;
    
    Object.entries(prompts).forEach(([mode, items]) => {
      promptDoc += `## ${mode}\n`;
      items.forEach((item, index) => {
        promptDoc += `${index + 1}. ${item}\n`;
      });
      promptDoc += '\n';
    });
    
    promptDoc += '*このドキュメントは自動生成されています。*';
    
    fs.writeFileSync(path.join(CONFIG.outputDir, 'prompts.md'), promptDoc);
    log('✅ プロンプトドキュメント生成完了', 'green');
  }
  
  // 環境設定の抽出
  const envConfig = extractEnvironmentConfig();
  const envDoc = `# 環境設定

## クライアント設定
- App ID: \`${envConfig.client.appId || 'N/A'}\`
- App Name: \`${envConfig.client.appName || 'N/A'}\`

## ワーカー設定
- Name: \`${envConfig.worker.name || 'N/A'}\`
- Environment Variables:
${Object.entries(envConfig.worker.vars || {}).map(([key, value]) => `  - \`${key}\`: \`${value}\``).join('\n')}

*このドキュメントは自動生成されています。*
`;
  
  fs.writeFileSync(path.join(CONFIG.outputDir, 'environment.md'), envDoc);
  log('✅ 環境設定ドキュメント生成完了', 'green');
  
  // API仕様の抽出
  const apiSpecs = extractApiSpecs();
  const apiDoc = `# API仕様

## HTTPエンドポイント
${apiSpecs.endpoints.map(ep => `- \`${ep.method} ${ep.path}\``).join('\n')}

## WebSocketメッセージ

### クライアント → サーバー
${apiSpecs.websocket.clientToServer.map(msg => `- \`${msg}\``).join('\n')}

### サーバー → クライアント
${apiSpecs.websocket.serverToClient.map(msg => `- \`${msg}\``).join('\n')}

*このドキュメントは自動生成されています。*
`;
  
  fs.writeFileSync(path.join(CONFIG.outputDir, 'api.md'), apiDoc);
  log('✅ API仕様ドキュメント生成完了', 'green');
  
  // インデックスファイルの生成
  const indexDoc = `# 自動生成ドキュメント

このディレクトリには、コードから自動生成されたドキュメントが含まれています。

## ドキュメント一覧

- [型定義](types.md) - TypeScript型定義の一覧
- [プロンプト一覧](prompts.md) - ゲーム内で使用されるプロンプト
- [環境設定](environment.md) - アプリケーションの設定情報
- [API仕様](api.md) - HTTPエンドポイントとWebSocketメッセージ

## 更新方法

これらのドキュメントは以下のコマンドで更新できます：

\`\`\`bash
node scripts/doc-sync.js
\`\`\`

または、ファイル監視モードで自動更新：

\`\`\`bash
node scripts/doc-sync.js --watch
\`\`\`

*最終更新: ${new Date().toISOString()}*
`;
  
  fs.writeFileSync(path.join(CONFIG.outputDir, 'README.md'), indexDoc);
  log('✅ インデックスドキュメント生成完了', 'green');
}

// ファイル監視
function watchFiles() {
  log('👀 ファイル監視開始...', 'blue');
  
  const chokidar = require('chokidar');
  
  const watcher = chokidar.watch(CONFIG.watchPaths, {
    ignored: /(^|[\/\\])\../, // ドットファイルを無視
    persistent: true
  });
  
  watcher.on('change', (filePath) => {
    log(`📝 ファイル変更検出: ${filePath}`, 'yellow');
    generateDocumentation();
  });
  
  watcher.on('error', (error) => {
    log(`❌ 監視エラー: ${error}`, 'red');
  });
  
  // 終了処理
  process.on('SIGINT', () => {
    log('🛑 ファイル監視を停止します...', 'yellow');
    watcher.close();
    process.exit(0);
  });
}

// メイン実行
function main() {
  const args = process.argv.slice(2);
  const watchMode = args.includes('--watch');
  
  log('🚀 ドキュメント自動同期開始', 'magenta');
  log('=' .repeat(50), 'magenta');
  
  // 初回生成
  generateDocumentation();
  
  if (watchMode) {
    // ファイル監視モード
    watchFiles();
  } else {
    // 一回限りの実行
    log('✅ ドキュメント生成完了', 'green');
  }
}

// スクリプト実行
if (require.main === module) {
  main();
}

module.exports = { generateDocumentation, extractTypeDefinitions, extractPrompts, extractEnvironmentConfig, extractApiSpecs };
