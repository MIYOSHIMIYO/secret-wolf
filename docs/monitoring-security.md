# 監視エンドポイントセキュリティ設定

## 概要

Durable Object監視エンドポイント（`/debug/monitoring`）は、システムの負荷状況やコスト情報を含む機密データを提供します。本番環境では適切なセキュリティ対策が必要です。

## セキュリティ機能

### 1. 認証トークン

- **環境変数**: `MONITORING_AUTH_TOKEN`
- **形式**: Bearer Token
- **設定場所**: Cloudflare Workers ダッシュボード
- **使用方法**: `Authorization: Bearer <token>`

### 2. IP制限

- **環境変数**: `MONITORING_ALLOWED_IPS`
- **形式**: カンマ区切りのIPアドレスリスト
- **適用**: 本番環境のみ
- **例**: `192.168.1.100,10.0.0.50`

### 3. ログ記録

- 認証失敗時のログ記録
- 不正アクセス試行の記録
- IPアドレスの記録

## 設定手順

### 1. 認証トークンの生成

```bash
# 強力なランダムトークンを生成
openssl rand -hex 32
```

### 2. Cloudflare Workers ダッシュボードでの設定

1. **Secrets & Environment Variables** に移動
2. 以下の環境変数を設定：
   - `MONITORING_AUTH_TOKEN`: 生成したトークン
   - `MONITORING_ALLOWED_IPS`: 許可するIPアドレス（本番環境のみ）

### 3. クライアント側の設定

```bash
# .env.local に設定
VITE_MONITORING_AUTH_TOKEN=your_generated_token_here
```

## 使用例

### 認証付きリクエスト

```bash
curl -H "Authorization: Bearer your_token_here" \
     https://secret-werewolf-prod.qmdg2pmnw6.workers.dev/debug/monitoring
```

### JavaScript での使用

```javascript
const response = await fetch('/debug/monitoring', {
  headers: {
    'Authorization': `Bearer ${process.env.VITE_MONITORING_AUTH_TOKEN}`
  }
});
```

## セキュリティベストプラクティス

### 1. トークンの管理

- 定期的なトークンローテーション
- 強力なランダムトークンの使用
- 環境変数での安全な管理

### 2. IP制限

- 本番環境では必ずIP制限を設定
- 許可するIPアドレスを最小限に
- VPN経由でのアクセスを推奨

### 3. ログ監視

- 認証失敗の監視
- 異常なアクセスパターンの検出
- 定期的なログレビュー

### 4. アクセス制御

- 監視エンドポイントへのアクセス権限を限定
- 必要最小限の情報のみを公開
- 定期的なアクセス権限の見直し

## トラブルシューティング

### 認証エラー (401)

- トークンが正しく設定されているか確認
- トークンの形式が `Bearer <token>` になっているか確認

### アクセス拒否 (403)

- IPアドレスが許可リストに含まれているか確認
- 本番環境でのIP制限設定を確認

### 設定未完了 (503)

- `MONITORING_AUTH_TOKEN` が設定されているか確認
- 環境変数の再デプロイが必要

## 注意事項

- 監視エンドポイントは機密情報を含むため、本番環境では必ず認証を設定
- 開発環境では認証を無効化可能（`MONITORING_AUTH_TOKEN` 未設定）
- トークンは定期的に変更し、古いトークンは無効化
- ログには機密情報が含まれる可能性があるため、適切に管理

---

**最終更新**: 2024年12月
**対象バージョン**: v1.0.0

