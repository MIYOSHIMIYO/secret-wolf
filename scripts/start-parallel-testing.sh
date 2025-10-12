#!/bin/bash

# 並行テスト環境起動スクリプト

set -e

echo "🚀 並行テスト環境を起動します..."

# プロジェクトルートに移動
cd "$(dirname "$0")/.."

# 色付きログ関数
log_info() {
    echo -e "\033[32m[INFO]\033[0m $1"
}

log_warn() {
    echo -e "\033[33m[WARN]\033[0m $1"
}

log_error() {
    echo -e "\033[31m[ERROR]\033[0m $1"
}

# 依存関係の確認
check_dependencies() {
    log_info "依存関係を確認しています..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js がインストールされていません"
        exit 1
    fi
    
    if ! command -v pnpm &> /dev/null; then
        log_error "pnpm がインストールされていません"
        exit 1
    fi
    
    log_info "依存関係の確認完了"
}

# 開発環境の起動
start_development() {
    log_info "開発環境を起動しています..."
    
    # ワーカーサーバーの起動
    log_info "ワーカーサーバーを起動中..."
    cd packages/worker
    pnpm install
    pnpm run dev &
    WORKER_PID=$!
    cd ../..
    
    # クライアントサーバーの起動
    log_info "クライアントサーバーを起動中..."
    cd packages/client
    pnpm install
    pnpm run dev &
    CLIENT_PID=$!
    cd ../..
    
    log_info "開発環境が起動しました"
    log_info "ブラウザで http://localhost:5173 にアクセスしてください"
}

# 本番環境の起動
start_production() {
    log_info "本番環境をビルドしています..."
    
    cd packages/client
    pnpm run build:production
    npx cap sync
    
    log_info "本番環境のビルドが完了しました"
    log_info "以下のコマンドでネイティブアプリを起動してください:"
    log_info "  npx cap open ios    # iOS"
    log_info "  npx cap open android # Android"
    
    cd ../..
}

# クリーンアップ関数
cleanup() {
    log_info "プロセスを終了しています..."
    
    if [ ! -z "$WORKER_PID" ]; then
        kill $WORKER_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$CLIENT_PID" ]; then
        kill $CLIENT_PID 2>/dev/null || true
    fi
    
    log_info "クリーンアップ完了"
}

# シグナルハンドラー
trap cleanup EXIT INT TERM

# メイン処理
main() {
    echo "=========================================="
    echo "  秘密人狼 並行テスト環境"
    echo "=========================================="
    echo ""
    
    check_dependencies
    
    echo ""
    echo "以下のオプションを選択してください:"
    echo "1) 開発環境のみ起動 (ブラウザテスト)"
    echo "2) 本番環境のみビルド (実機テスト)"
    echo "3) 両方の環境を起動 (並行テスト)"
    echo "4) 終了"
    echo ""
    
    read -p "選択してください (1-4): " choice
    
    case $choice in
        1)
            start_development
            log_info "開発環境が起動しました。Ctrl+C で終了してください。"
            wait
            ;;
        2)
            start_production
            ;;
        3)
            start_development
            echo ""
            start_production
            log_info "両方の環境が準備できました。Ctrl+C で終了してください。"
            wait
            ;;
        4)
            log_info "終了します"
            exit 0
            ;;
        *)
            log_error "無効な選択です"
            exit 1
            ;;
    esac
}

# スクリプト実行
main "$@"
