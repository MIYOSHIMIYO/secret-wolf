#!/bin/bash

# CI/CD用テストスクリプト
# GitHub Actionsやその他のCI環境で使用

set -e  # エラー時に終了

echo "🚀 CI/CDテスト開始"
echo "=================================="

# 環境変数チェック
if [ -z "$NODE_ENV" ]; then
    export NODE_ENV="test"
fi

echo "📋 環境情報:"
echo "  NODE_ENV: $NODE_ENV"
echo "  Node.js: $(node --version)"
echo "  pnpm: $(pnpm --version)"
echo ""

# 依存関係インストール
echo "📦 依存関係インストール中..."
pnpm install --frozen-lockfile

# 型チェック
echo "🔍 型チェック中..."
pnpm typecheck

# リント
echo "🧹 リント実行中..."
pnpm lint

# ビルドテスト
echo "🔨 ビルドテスト中..."
pnpm build

# ネットワークテスト（開発環境のみ）
if [ "$NODE_ENV" = "test" ] || [ "$NODE_ENV" = "development" ]; then
    echo "🌐 ネットワークテスト中..."
    node scripts/network-audit.js dev
fi

# 本番環境テスト（本番環境のみ）
if [ "$NODE_ENV" = "production" ]; then
    echo "🌐 本番環境ネットワークテスト中..."
    node scripts/network-audit.js prod
fi

# 統合テスト
echo "🧪 統合テスト中..."
node scripts/test-runner.js

echo ""
echo "✅ すべてのテストが完了しました"
echo "=================================="
