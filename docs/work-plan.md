### 進行計画（実装前）

- フェーズ0: 要件確定
  - ユーザーからの設計書・企画書を分割受領し、最終「伝達完了です」を待つ
  - 未確定事項の解消（`docs/open-questions.md`）

- フェーズ1: ひな型の用意（実装解禁後）
  - pnpm ワークスペース初期化とモノレポ構成
  - ルート設定（`package.json` scripts, `.editorconfig`, ESLint/Prettier 基盤）
  - Prettier 設定確定（`semi: true`, `singleQuote: false`, `printWidth: 100`, `trailingComma: "all"`、Tailwind plugin）
  - ESLint ルール（`@typescript-eslint/recommended` + import 並び替え）導入
  - Vite 設定（5173 / React SWC / `base: "/"`）
  - 各 `tsconfig`（共通 + パッケージ別）
  - Capacitor 設定（Bundle ID/Application ID、最小 OS）と表示名（日英）
  - Cloudflare 有料プラン/使用量アラートの確認
  - `.env.sample` 作成と README に実行手順を記載
  - GitHub Actions（`main`→dev publish、`v*`→prod publish、必要シークレット設定）下書き
  - プライバシーポリシー雛形を GitHub Pages で公開（URL を一時使用）
  - Capacitor 設定ファイル `packages/client/capacitor.config.ts` を作成（上記内容）
  - `packages/client/tailwind.config.ts` を作成（プライマリ `violet` 拡張）
  - `.github/workflows/worker-deploy.yml` を配置（Workers のみデプロイ）
  - `packages/worker/wrangler.toml` を作成（`DO_ROOMS`/`RoomDO`、`[[migrations]] tag=v001_roomdo`、`MOD_KV` の dev ID、`[env.prod]` で KV を本番 ID に差替）
  - ルート `.env.sample` にクライアント用環境変数（`VITE_WORKER_WS` ほか）を記載

- フェーズ2: 各パッケージの最小構成（状態同期/リセットの反映）
  - `packages/worker`:
    - `room.state` に `roundId`/`phaseSeq` を追加し、`goInput` 時に `roundId=uuid()`/`phaseSeq=1`、遷移ごとに `phaseSeq++`
    - S2C `phase` のペイロードを `{ phase, endsAt, roundId, phaseSeq }` に拡張
  - `packages/client`:
    - `src/state/uiReset.ts` を作成し、`uiResetForNewRound`/`uiResetForPhaseChange`/`uiResetOnLeaveOrAbort` を導入
    - `onPhaseMessage` で古い信号破棄→`uiResetForPhaseChange`→画面遷移/Timer 起動の順に実行
    - 退出/中断/戻る時に `uiResetOnLeaveOrAbort()` を呼んでから `/menu` 遷移

- フェーズ3: スクリプト・ビルド動作確認
  - `dev`（Wrangler + Vite 並行起動）
  - `build`（依存順）
  - `typecheck`（全パッケージ）

- フェーズ4: ドキュメンテーション
  - Readme と運用手順の整備

（注意）本メモは順序の提示のみで、仕様の追加・実装は行いません。 