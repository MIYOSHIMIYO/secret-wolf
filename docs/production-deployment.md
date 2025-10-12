# 本番環境デプロイメントガイド

## 概要

秘密人狼アプリの本番環境へのデプロイメント手順を説明します。

## 前提条件

- [ ] RevenueCatアカウントとAPIキー
- [ ] App Store Connectアカウント
- [ ] Google Play Consoleアカウント
- [ ] Cloudflare Workersアカウント
- [ ] 本番用ドメイン

## 1. 環境変数の設定

### 1.1 クライアント側環境変数

`.env.production` ファイルを作成し、以下の値を設定：

```bash
# RevenueCat設定
VITE_RC_PUBLIC_API_KEY_PROD=rcv_prod_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_RC_PUBLIC_API_KEY_DEV=rcv_dev_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# IAP有効化フラグ
VITE_IAP_ENABLED=true

# アプリ設定
VITE_APP_NAME=秘密人狼
VITE_APP_VERSION=1.0.0

# サーバー設定
VITE_SERVER_URL=https://your-production-server.com
VITE_WS_URL=wss://your-production-server.com

# デバッグ設定
VITE_DEBUG=false
VITE_LOG_LEVEL=info
```

### 1.2 サーバー側環境変数

Cloudflare Workersの環境変数を設定：

```bash
ENVIRONMENT=production
ORIGIN_ALLOWLIST=capacitor://localhost,https://your-app-domain.com
SECRET_PEPPER=your-secure-production-pepper
RATE_AUTO_PER_MIN=30
RATE_REPORT_PER_5MIN=60
LOG_LEVEL=info
ENABLE_RATE_LIMIT=true
```

## 2. RevenueCat設定

### 2.1 商品の設定

RevenueCat Dashboardで以下の商品を設定：

| Product ID | Type | Price | Description |
|------------|------|-------|-------------|
| tip_160 | Consumable | ¥160 | 160円の応援 |
| tip_320 | Consumable | ¥320 | 320円の応援 |
| tip_650 | Consumable | ¥650 | 650円の応援 |
| tip_1600 | Consumable | ¥1,600 | 1,600円の応援 |
| tip_3200 | Consumable | ¥3,200 | 3,200円の応援 |

### 2.2 オファリング設定

- **Offering名**: `default`
- **Package名**: `tips`
- 上記5つの商品を`tips`パッケージに追加

## 3. ストア設定

### 3.1 App Store Connect

1. **アプリ情報の設定**
   - Bundle ID: `com.yuudai.secretwolf.game`
   - アプリ名: `秘密人狼`
   - カテゴリ: `Games`

2. **アプリ内課金の設定**
   - 上記5つの商品をApp Store Connectで設定
   - 価格と説明を設定
   - 審査に提出

3. **プライバシー情報**
   - プライバシーポリシーURLを設定
   - データ収集の説明を追加

### 3.2 Google Play Console

1. **アプリ情報の設定**
   - パッケージ名: `com.yuudai.secretwolf.game`
   - アプリ名: `秘密人狼`
   - カテゴリ: `Games`

2. **アプリ内課金の設定**
   - 上記5つの商品をGoogle Play Consoleで設定
   - 価格と説明を設定
   - 審査に提出

## 4. ビルドとデプロイ

### 4.1 クライアントのビルド

```bash
# 本番用ビルド
cd packages/client
npm run build:production

# ネイティブアプリのビルド
npm run build:native:production
```

### 4.2 サーバーのデプロイ

```bash
# Cloudflare Workersにデプロイ
cd packages/worker
npx wrangler deploy --env production
```

### 4.3 ネイティブアプリのビルド

#### iOS
```bash
# Xcodeでプロジェクトを開く
npm run build:ios

# または手動で
npx cap open ios
```

#### Android
```bash
# Android Studioでプロジェクトを開く
npm run build:android

# または手動で
npx cap open android
```

## 5. テスト

### 5.1 本番環境でのテスト

1. **課金機能のテスト**
   - サンドボックス環境で購入テスト
   - レシート検証の確認
   - エラーハンドリングの確認

2. **ゲーム機能のテスト**
   - ルーム作成・参加
   - WebSocket接続
   - ゲームフローの確認

3. **パフォーマンステスト**
   - アプリの起動時間
   - メモリ使用量
   - ネットワーク通信

### 5.2 ストア審査

1. **App Store審査**
   - アプリの動作確認
   - 課金機能の確認
   - プライバシーポリシーの確認

2. **Google Play審査**
   - アプリの動作確認
   - 課金機能の確認
   - ポリシー準拠の確認

## 6. 監視とメンテナンス

### 6.1 監視設定

1. **RevenueCat Dashboard**
   - 売上分析
   - エラー監視
   - 顧客分析

2. **Cloudflare Workers**
   - リクエスト監視
   - エラーログ監視
   - パフォーマンス監視

### 6.2 メンテナンス

1. **定期更新**
   - 依存関係の更新
   - セキュリティパッチの適用
   - 機能の改善

2. **問題対応**
   - ユーザーからの報告
   - エラーログの分析
   - 修正の実装とデプロイ

## 7. トラブルシューティング

### 7.1 よくある問題

1. **課金が失敗する**
   - RevenueCat APIキーの確認
   - 商品IDの一致確認
   - ストア連携の確認

2. **WebSocket接続エラー**
   - サーバーURLの確認
   - CORS設定の確認
   - ネットワーク接続の確認

3. **アプリが起動しない**
   - 環境変数の確認
   - ビルド設定の確認
   - デバイス互換性の確認

### 7.2 ログの確認

```bash
# クライアント側のログ
# ブラウザの開発者ツールでコンソールログを確認

# サーバー側のログ
# Cloudflare Workersのログを確認
npx wrangler tail --env production
```

## 8. セキュリティ考慮事項

1. **APIキーの管理**
   - 環境変数での管理
   - 本番環境でのみ使用
   - 定期的なローテーション

2. **データ保護**
   - ユーザーデータの暗号化
   - 通信の暗号化
   - プライバシーポリシーの遵守

3. **レート制限**
   - API呼び出しの制限
   - 不正利用の防止
   - 適切なエラーハンドリング

## 9. パフォーマンス最適化

1. **アプリサイズの最適化**
   - 不要な依存関係の削除
   - 画像の最適化
   - コード分割

2. **ネットワーク最適化**
   - リクエストの最小化
   - キャッシュの活用
   - 圧縮の有効化

3. **メモリ使用量の最適化**
   - メモリリークの防止
   - 適切なリソース管理
   - パフォーマンス監視

## 10. 今後の改善

1. **機能追加**
   - 新しいゲームモード
   - ソーシャル機能
   - 分析機能

2. **技術的改善**
   - フレームワークの更新
   - アーキテクチャの改善
   - パフォーマンスの向上

3. **ユーザー体験の向上**
   - UI/UXの改善
   - アクセシビリティの向上
   - 多言語対応
