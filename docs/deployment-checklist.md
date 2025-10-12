# デプロイ準備チェックリスト

## 📋 概要
このドキュメントは、秘密人狼ゲームの本番デプロイに向けた準備項目を整理したチェックリストです。

## 🔧 環境設定

### 1. Cloudflare Workers設定

#### 1.1 環境変数
- [ ] `ENVIRONMENT = "production"`
- [ ] `ORIGIN_ALLOWLIST = "capacitor://localhost"`
- [ ] `RATE_AUTO_PER_MIN = "30"`
- [ ] `RATE_REPORT_PER_5MIN = "60"`
- [ ] `LOG_LEVEL = "warn"`
- [ ] `ENABLE_RATE_LIMIT = "true"`

#### 1.2 シークレット
- [ ] `PEPPER_SECRET` を本番環境に設定
  ```bash
  wrangler secret put PEPPER_SECRET --env prod
  ```

#### 1.3 KV Namespace
- [ ] 本番用KV Namespace IDを設定
- [ ] 現在の設定: `f280c513a4e949928667be409844d782`
- [ ] 必要に応じて新しいNamespaceを作成

#### 1.4 Durable Objects
- [ ] `DO_ROOMS` バインディングが正しく設定されている
- [ ] マイグレーション `v001_roomdo_prod` が適用されている

### 2. クライアント設定

#### 2.1 環境変数（.env.production）
- [ ] `VITE_RC_PUBLIC_API_KEY_PROD` - 本番用RevenueCat APIキー
- [ ] `VITE_RC_PUBLIC_API_KEY_DEV` - 開発用RevenueCat APIキー（フォールバック用）
- [ ] `VITE_IAP_ENABLED=true`
- [ ] `VITE_WORKER_WS=https://secret-werewolf-prod.qmdg2pmnw6.workers.dev`
- [ ] `VITE_DEBUG=false`
- [ ] `VITE_LOG_LEVEL=info`

#### 2.2 RevenueCat設定
- [ ] 本番用APIキーが正しく設定されている
- [ ] 商品IDが正しく設定されている
  - `no_video_ads` (¥300)
  - `ad_free_all` (¥700)
  - `upgrade_ad_free` (¥400)
- [ ] 応援商品が設定されている
  - `tip_160` (¥160)
  - `tip_320` (¥320)
  - `tip_650` (¥650)
  - `tip_1600` (¥1,600)
  - `tip_3200` (¥3,200)

#### 2.3 AdMob設定
- [ ] 本番用App IDが設定されている（審査直前までテストIDでOK）
- [ ] iOS: `ca-app-pub-XXXXXXXXX~XXXXXXXXX`
- [ ] Android: `ca-app-pub-XXXXXXXXX~XXXXXXXXX`

### 3. Capacitor設定

#### 3.1 アプリ設定
- [ ] `appId: "com.yuudai.secretwolf.game"`
- [ ] `appName: "秘密人狼"`
- [ ] iOS最小バージョン: 16.0+
- [ ] Android最小SDK: 28+

#### 3.2 プラグイン設定
- [ ] RevenueCatプラグインが正しく設定されている
- [ ] SplashScreen設定が適切
- [ ] セキュリティ設定（本番環境）
  - `allowMixedContent: false`
  - `webContentsDebuggingEnabled: false`

## 🚀 デプロイ手順

### 1. Workerデプロイ
```bash
# 1. ビルド
pnpm --filter packages/worker build

# 2. 本番デプロイ
pnpm --filter packages/worker wrangler publish --env prod

# 3. ヘルスチェック
curl https://secret-werewolf-prod.qmdg2pmnw6.workers.dev/healthz
```

### 2. クライアントビルド
```bash
# 1. 本番用ビルド
pnpm --filter packages/client build:production

# 2. Capacitor同期
npx cap sync --prod

# 3. ネイティブビルド
# iOS
npx cap open ios
# Android
npx cap open android
```

## 🧪 テスト項目

### 1. 機能テスト
- [ ] WebSocket接続が正常に確立される
- [ ] ルーム作成・参加が正常に動作する
- [ ] ゲームフローが正常に進行する
- [ ] チャット機能が正常に動作する
- [ ] 投票機能が正常に動作する
- [ ] 結果表示が正常に動作する

### 2. 課金テスト
- [ ] RevenueCat初期化が正常に動作する
- [ ] 商品情報取得が正常に動作する
- [ ] 購入フローが正常に動作する（テスト環境）
- [ ] 応援機能が正常に動作する

### 3. 広告テスト
- [ ] バナー広告が適切な場所に表示される
- [ ] インタースティシャル広告が適切に表示される
- [ ] 広告非表示機能が正常に動作する

### 4. エラーハンドリングテスト
- [ ] ネットワーク切断時の再接続が正常に動作する
- [ ] サーバーエラー時の適切なメッセージ表示
- [ ] レート制限時の適切なメッセージ表示

## 📱 ストア申請準備

### 1. アプリ情報
- [ ] アプリ名: "秘密人狼"
- [ ] バージョン: 1.0.0
- [ ] カテゴリ: ゲーム
- [ ] 年齢制限: 12+

### 2. スクリーンショット
- [ ] iPhone用スクリーンショット（6.7インチ、6.1インチ、5.5インチ）
- [ ] iPad用スクリーンショット（12.9インチ、11インチ）
- [ ] Android用スクリーンショット（各種画面サイズ）

### 3. 説明文
- [ ] アプリ説明文（日本語）
- [ ] キーワード設定
- [ ] プライバシーポリシーURL
- [ ] 利用規約URL

### 4. 審査準備
- [ ] テスト用アカウント情報
- [ ] デモ動画（必要に応じて）
- [ ] 審査用説明文

## 🔍 本番環境確認

### 1. パフォーマンス
- [ ] ページ読み込み時間 < 3秒
- [ ] WebSocket接続時間 < 2秒
- [ ] メモリ使用量が適切
- [ ] バッテリー消費が適切

### 2. セキュリティ
- [ ] HTTPS通信が正常に動作する
- [ ] CORS設定が適切
- [ ] レート制限が正常に動作する
- [ ] 入力検証が適切に動作する

### 3. 可用性
- [ ] サーバー稼働率 > 99%
- [ ] エラー率 < 1%
- [ ] レスポンス時間 < 500ms

## 📊 監視設定

### 1. Cloudflare監視
- [ ] エラー率アラート設定
- [ ] レスポンス時間アラート設定
- [ ] 使用量アラート設定

### 2. アプリ監視
- [ ] クラッシュレポート設定
- [ ] パフォーマンス監視設定
- [ ] ユーザー行動分析設定

## 🚨 ロールバック準備

### 1. バックアップ
- [ ] 現在の設定のバックアップ
- [ ] データベースのバックアップ
- [ ] コードのバックアップ

### 2. ロールバック手順
- [ ] Workerのロールバック手順
- [ ] クライアントのロールバック手順
- [ ] 設定のロールバック手順

## 📝 最終確認

### 1. チェックリスト完了確認
- [ ] 上記すべての項目が完了している
- [ ] テストがすべて成功している
- [ ] ドキュメントが最新である

### 2. 関係者確認
- [ ] 開発者による最終確認
- [ ] テスト担当者による確認
- [ ] プロダクトマネージャーによる確認

### 3. デプロイ承認
- [ ] デプロイの承認を得ている
- [ ] ロールバック計画が準備されている
- [ ] 緊急連絡先が設定されている

---

## 📞 緊急時連絡先
- 開発者: [連絡先]
- インフラ担当: [連絡先]
- プロダクトマネージャー: [連絡先]

## 🔗 関連リンク
- [Cloudflare Dashboard](https://dash.cloudflare.com)
- [RevenueCat Dashboard](https://app.revenuecat.com)
- [AdMob Dashboard](https://apps.admob.com)
- [Apple App Store Connect](https://appstoreconnect.apple.com)
- [Google Play Console](https://play.google.com/console)
