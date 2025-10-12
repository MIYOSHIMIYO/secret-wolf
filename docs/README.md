# 秘密人狼 - ドキュメント

## 📋 概要
このディレクトリには、秘密人狼ゲームの開発・運用に関するドキュメントが含まれています。

## 📚 ドキュメント一覧

### 設計・仕様
- [要件定義](requirements.md) - ゲームの基本仕様と技術要件
- [デプロイチェックリスト](deployment-checklist.md) - 本番デプロイ前の確認項目
- [テストガイド](testing-guide.md) - テスト戦略と実行方法

### 設定・運用
- [App Store設定](app-store-setup.md) - iOS App Store申請の準備
- [Google Play設定](google-play-setup.md) - Google Play Store申請の準備
- [RevenueCat設定](revenuecat-setup.md) - 課金システムの設定
- [本番デプロイ](production-deployment.md) - 本番環境へのデプロイ手順

### 自動生成ドキュメント
- [生成ドキュメント](generated/) - コードから自動生成されたドキュメント

## 🚀 クイックスタート

### 開発環境のセットアップ
```bash
# 依存関係のインストール
pnpm install

# 開発サーバーの起動
pnpm dev
```

### テストの実行
```bash
# すべてのテストを実行
pnpm test:all

# ネットワークテストのみ
pnpm test:network

# 本番環境のテスト
pnpm test:network:prod
```

### ドキュメントの更新
```bash
# ドキュメントの生成
pnpm doc:sync

# ファイル監視モード
pnpm doc:watch
```

## 🔧 開発ワークフロー

### 1. 機能開発
1. 要件定義を確認
2. ブランチを作成
3. 機能を実装
4. テストを実行
5. プルリクエストを作成

### 2. テスト
1. 単体テストを実行
2. 統合テストを実行
3. ネットワークテストを実行
4. 手動テストを実行

### 3. デプロイ
1. デプロイチェックリストを確認
2. 本番環境でテストを実行
3. デプロイを実行
4. 動作確認

## 📊 品質管理

### コード品質
- TypeScript strict mode
- ESLint + Prettier
- 型チェック
- リント

### テスト品質
- 単体テスト
- 統合テスト
- エンドツーエンドテスト
- パフォーマンステスト

### ドキュメント品質
- 自動生成
- 継続的更新
- バージョン管理
- レビュー

## 🔄 継続的インテグレーション

### 自動実行
- **プッシュ時**: テストとドキュメント更新
- **プルリクエスト時**: 品質チェック
- **スケジュール**: 定期テストとドキュメント更新

### 手動実行
- 特定のテストの実行
- ドキュメントの手動更新
- デプロイの実行

## 📞 サポート

### 問題報告
- GitHub Issues で問題を報告
- 詳細な情報を提供
- 再現手順を明記

### 連絡先
- 開発者: [連絡先]
- プロダクトマネージャー: [連絡先]
- インフラ担当: [連絡先]

## 🔗 関連リンク

### 外部サービス
- [Cloudflare Dashboard](https://dash.cloudflare.com)
- [RevenueCat Dashboard](https://app.revenuecat.com)
- [AdMob Dashboard](https://apps.admob.com)
- [Apple App Store Connect](https://appstoreconnect.apple.com)
- [Google Play Console](https://play.google.com/console)

### 開発ツール
- [GitHub Repository](https://github.com/yuudai/secret-werewolf)
- [GitHub Actions](https://github.com/yuudai/secret-werewolf/actions)
- [GitHub Issues](https://github.com/yuudai/secret-werewolf/issues)

---

*最終更新: 2025年1月*
