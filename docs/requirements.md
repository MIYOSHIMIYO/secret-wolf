### 目的（モノレポ構成）
- **pnpm モノレポ**
- **packages/shared**: 共有型・ユーティリティ
- **packages/worker**: Cloudflare Workers + Durable Objects（WebSocketサーバ）
- **packages/client**: React + Vite + TypeScript + Tailwind + Capacitor（縦固定）

### 共通設定
- **TypeScript**: `strict` 有効
- **Lint/Format**: ESLint + Prettier
- **Editor**: `.editorconfig`
- ルート `package.json` の scripts
  - **dev**: worker と client を並行起動（Wrangler + Vite）
  - **build**: 依存順ビルド
  - **typecheck**: 各パッケージ `tsc --noEmit`

### 依存関係（指定通り／追加禁止）
- **worker**: `wrangler`, `itty-router`, `zod`, `uuid`
- **client**: `react`, `react-dom`, `react-router-dom`, `zustand`, `tailwindcss`, `@capacitor/core`, `@capacitor/ios`, `@capacitor/android`, `class-variance-authority`, `lucide-react`
  - 注意: `socket.io-client` は使用しない（ネイティブ WebSocket を使用）
- **shared**: `zod`, `grapheme-splitter`
- **dev（共通）**: `vite`, `concurrently`

### Cloudflare 設定（worker 配下）
- `packages/worker` に `wrangler.toml` を生成
- Durable Object: `class RoomDO` / バインディング名 `DO_ROOMS`
- KV: バインディング名 `MOD_KV`（自動通報カウント用）

### このフェーズの成果物（実装はまだ行わない）
- 上記要件のメモ化（本ファイル）
- 未確定事項／質問事項の整理
- 進行計画（メモ）

### 後続フェーズでの成果物（ユーザーから「伝達完了です」の合図後）
- 各 `package.json`
- 各 `tsconfig`
- ESLint 設定
- Prettier 設定
- `.editorconfig`
- `packages/client` の Tailwind 設定
- `packages/worker` の `wrangler.toml` 

### 追加要件（shared の型とプロトコル）

- `packages/shared/src/gameTypes.ts` を作成し、以下を実装する。

- 型定義
  - **Mode**: `"NONE" | "LOVE" | "OGIRI" | "DECLARATION" | "STRANGER"`
  - **Phase**: `"LOBBY" | "MODE_SELECT" | "READY" | "INPUT" | "REVEAL" | "DISCUSS" | "VOTE" | "JUDGE" | "RESULT"`
  - **Player**: `{ id, nick, iconId, connected }`
  - **Votes**: `Record<playerId, targetId | "NONE">`
  - **RoundState**: `{ prompt, submissions, revealedOwnerId?, revealedText?, votes, tally?, lastRevealedOwnerId? }`
  - **RoomState**: `{ roomId, mode, players[], hostId?, phase, endsAt, round }`

- 定数（LIMITS）
  - `secretMaxGraphemes = 20`
  - `nickMaxGraphemes = 8`
  - `chatMax = 120`
  - `reconnectWindowMs = 30000`
  - `inputSec = 30`
  - `revealMs = 8000`
  - `discussPerPlayerSec = 15`
  - `voteSec = 10`
  - `judgeMs = 2000`

- その他の型
  - **BannerPlace**: `"TITLE" | "MENU" | "LOBBY" | "INPUT" | "DISCUSS" | "RESULT"`
  - **graphemeLength(text): number** — 絵文字の合字（グラフェムクラスタ）を 1 としてカウントする関数

- WebSocket JSON プロトコル（型）
  - クライアント→サーバ: `{ t: "join" | "auto" | "start" | "submitSecret" | "endDiscuss" | "vote" | "chat" | "report" | "requestState" | "leave", p: any }`
  - サーバ→クライアント: `{ t: "state" | "phase" | "chat" | "discussProgress" | "abort" | "warn" | "reportAck", p: any }`
  - 各メッセージに対して `zod` によるスキーマを用意し、バリデーションに使用する。 

### 追加要件（お題と固定文言）

- `packages/worker/src/prompts.ts` を作成し、ユーザーが指定したお題をそのまま配列化する（日本語そのまま）。

- モード別お題
  - **お題なしモード**（Mode: `NONE`）
    1. 実は隣にこんな奴います
    2. 実は満腹度、〇〇％です
    3. 実は〇〇を注文したいです
    4. 実は市民が勝ったら〇〇します
    5. 実はこのゲームの議論中に〇〇します
    6. 実はリアルにテンション〇〇％です
    7. 実は〇〇さん、隣に来て欲しいです
    8. 実は〇〇さんに注ぎたいです
    9. 実は財布の中の潤沢度、〇〇％です
    10. 実はこいつが怪しいです

  - **恋愛モード**（Mode: `LOVE`）
    1. 実は好きな人
    2. 実はこんな人がタイプです
    3. 実は一番仲良くなりたい人
    4. 実は告白するならこう言いたい
    5. 実はドキドキしちゃうこと
    6. 実は理想のデート場所
    7. 実は初恋だった人
    8. 実は恋人にされたら嬉しいこと
    9. 実は恋人にされたら嫌なこと
    10. 実は恋愛で後悔していること

  - **大喜利モード**（Mode: `OGIRI`）
    1. 実は私〇〇です
    2. 実は本気出すとこれできます
    3. 実は次に流行る言葉はこれ
    4. 実は明日、こんなキャラでいきます
    5. 実は〇〇で世界一位です
    6. 実はこの世には必要ないと思うもの
    7. 実は無人島に1つだけ持っていくならこれ
    8. 実は前世〇〇なんです
    9. 実は学校にこんな授業を追加したい
    10. 実は今こんな状態です

  - **宣言モード**（Mode: `DECLARATION`）
    1. 実は自分の弱いところ
    2. 実は次の休みの日にやること
    3. 実はこれを機にやめること
    4. 実は今日中に必ず行うこと
    5. 実はこんな秘密を持っています
    6. 実はずっと言いたかったこと
    7. 実は1週間でやり遂げること
    8. 実はこんな夢を持っています
    9. 実は気づいてほしいこと
    10. 実は1ヶ月以内に必ず成し遂げること

  - **知らない誰かとモード**（Mode: `STRANGER`）
    1. 実はおすすめの作品
    2. 実は本気出すとこれできます
    3. 実はおすすめのお店
    4. 実は今日中に必ず行うこと
    5. 実はこんな秘密を持っています
    6. 実はずっと言いたかったこと
    7. 実は1週間でやり遂げること
    8. 実はこの世には必要ないと思うもの
    9. 実は今こんな状態です
    10. 実はおすすめの生活ルーティン

- 固定コピー（日本語文字列定数）
  - タイトル/サブタイトル：「秘密人狼」「誰かの秘密が落ちている」
  - 人数揃い：「3人が揃いました。ゲームを開始します。」
  - 中断：「ゲームが中断されました」
  - 投票同票：「同票のため選択は無効です」
  - 勝敗：「市民の勝利」「人狼の勝利」 

### 追加要件（Durable Object: ルーム権威サーバ）

- `packages/worker/src/room.ts` を作成し、`class RoomDO implements DurableObject` を実装する。
- 接続管理: `clients: Map<clientId, WebSocket>`
- 状態: `roomState`（`RoomState`）。ストレージへスナップショット保存（クラッシュ耐性）
- メッセージ処理: shared の `zod` schema で検証 → ハンドラへ
- タイマー: Alarms で `endsAt` までスケジュールし、フェーズ遷移（`INPUT → REVEAL → DISCUSS → VOTE → JUDGE → RESULT`）
- ランダム公開者: 直前と同一は避ける、それ以外は一様ランダム
- 3人未満になった瞬間: `abort("not_enough_players", elapsedMs)` を全員へ送信
- 再接続: `requestState` で最新 `state/phase` を返す
- 野良マッチ: `/auto` から来た 3 名で `READY` → `INPUT` へ（`LOBBY` はスキップ／モーダル演出はクライアント）

- ハンドラ一覧（受信 `t`）
  - `join { roomId, nick, installId }`: ニックネーム重複時は `#2`, `#3`… を付与。アイコンはルーム内ユニーク割当
  - `auto { mode, nick, installId }`: キューに入れて 3 人揃い次第、同じ `RoomDO` へルーティング
  - `start {}`: 身内ホストのみ許可
  - `submitSecret { text }`: 20 グラフェム上限、未入力は自動文言に置換
  - `endDiscuss {}`: 過半数で `VOTE` へ
  - `vote { targetId | "NONE" }`: 自分投票は reject（サーバ側で防御）
  - `chat { text }`: `DISCUSS` 中のみ受理
  - `report { targetPlayerId, mode: "RANDOM" | "FRIENDS", messageId? }`: 自動通報処理
  - `requestState {}`
  - `leave {}`

- 送信（`t`）
  - `state { RoomState 差分 or 全体 }`
  - `phase { phase, endsAt }`
  - `chat { id, authorId, text, ts }`（シャドウなら `shadow: true`）
  - `discussProgress { yes, needed }`
  - `abort { reason, elapsedMs }`
  - `warn { code, msg }`
  - `reportAck {}` 

### 追加要件（自動通報 / moderation）

- `packages/worker/src/moderation.ts` を作成。目的：運営不在でも安全に回る。Cloudflare KV (`MOD_KV`) を使用。TTLで自然に消える。

- `accountFingerprint = SHA256(pepper + uidOrDevice + installId)`

- レベル1：通報直後に報告者のローカル非表示（サーバは対象のメッセージを報告者へ送らない）
- レベル2：同卓内過半数通報でそのゲーム中のみシャドウミュート（対象の chat は他人には表示しない）
- レベル3：`RANDOM` モードのみ 7 日ローリング集計（ユニーク通報者 `R` / ユニーク対戦相手 `U`）
  - しきい値：`(R≥10 & R/U≥0.03 → 24h)` / `(R≥15 & R/U≥0.04 → 72h)` / `(R≥25 & R/U≥0.05 → 7d)`
  - 同一報告者→同一対象は 24h に 1 回まで
  - ユニーク日数 ≥ 2、ユニークルーム ≥ 3 で発火
- `FRIENDS` はグローバル集計対象外（ローカル非表示＋その場ミュートのみ）
- 将来同卓回避：端末側にも `targetFingerprint` を 90 日保持（クライアント実装）。マッチング候補から除外。

- KV キー設計例：
  - `mod:RANDOM:{targetFingerprint}`: `reporters(Set)`, `opponents(Set)`, `lastBanUntil(epoch)` など（実装は JSON を圧縮） 

### 追加要件（HTTP ルータ＆エントリ）

- `packages/worker/src/index.ts` を作成し、itty-router で以下を実装：
  - `GET /healthz` → 200
  - `GET /ws/room/:roomId` → WebSocket upgrade。該当 `RoomDO` へ接続
  - `POST /auto` → `{ mode, nick, installId }` をキューへ入れ、割当てられた `roomId` を返す

- `wrangler.toml` に：
  - `durable_objects.bindings = [{ name="DO_ROOMS", class_name="RoomDO" }]`
  - `kv_namespaces = [{ binding="MOD_KV", id="__DEV__" }]`（dev 用、後で本番 ID に差し替え）

- 重要：ローカル dev でも WebSocket が動くよう `wrangler` の dev/proxy 設定を記述。 

### 追加要件（クライアント実装）

- `packages/client`：React + Vite + Tailwind + Capacitor。ネイティブ WebSocket を使う（Socket.IO は使わない）。

- ルーティング
  - `/` (Title)
  - `/menu`
  - `/mode`
  - `/friends`
  - `/lobby/:id`
  - `/ready`
  - `/input`
  - `/reveal`
  - `/discuss`
  - `/vote`
  - `/judge`
  - `/result`

- Zustand のグローバルストア
  - `me { id, nick, iconId, installId }`
  - `room: RoomState | null`
  - `ws: WebSocket | null`（再接続時は `requestState` を送る）
  - `entitlements { noVideoAds, adFreeAll }`
  - `lastMode, autoRequeueOnAbort`

- 共通 UI
  - 右上「…」メニュー → 通報
  - `TimerCircle`: `props { endsAt }`（円プログレス＋「◯◯秒」）
  - `PlayerList`（スクロール固定）
  - `ChatList` + `ChatInput`（`DISCUSS` のみ、レート制限なし）
  - `BannerSlot(place)`：`TITLE` / `MENU` / `LOBBY` / `INPUT` / `DISCUSS` / `RESULT` で表示（`REVEAL`/`VOTE`/`JUDGE` は非表示）
    - キーボード表示中は自動非表示、blur 後 400ms で復帰

- 中断時
  - モーダル「ゲームが中断されました」→ OK 後、
    - 条件（理由 = `not_enough_players`、経過 60 秒以上、120 秒クールダウン、動画 OFF 未購入）を満たせば動画広告を 1 回表示
    - その後 `/menu` → `autoRequeueOnAbort` が ON なら `join_auto(lastMode)`

- ニックネーム
  - 8 グラフェム上限、重複は `#2`, `#3`… を付与（サーバの応答で最終決定）

- 秘密入力
  - 20 グラフェム・絵文字 OK・改行不可 

### 追加要件（広告 & 課金）

- `packages/client/src/ad/AdProvider.ts` を作成。
  - `showBanner(place)` / `hideBanner()`
  - `canShowInterstitial(reason: "END" | "ABORT")` / `showInterstitial(reason)`
  - `setCooldownMs(120000)`

- 表示ルール
  - バナー：`TITLE` / `MENU` / `LOBBY` / `READY` / `INPUT` / `DISCUSS` / `RESULT`
  - インタースティシャル：
    - 結果画面の「終了」時
    - 中断（`not_enough_players`）時の OK 直後（上記ガード付き）

- 課金（RevenueCat）
  - Entitlements:
    - `no_video_ads`（¥300）…動画のみ非表示
    - `ad_free_all`（¥700）…動画＋バナー全非表示
    - `upgrade_ad_free`（¥400）…差額
  - 応援ボタン文言：
    - A: 「動画広告が非表示になります。バナー広告は残ります。¥300」
    - B: 「動画・バナーすべての広告が非表示になります。¥700」
  - 復元ボタンはニックネーム設定近辺に常設 

### 追加要件（env.sample と実行手順）

- ルートに `.env.sample` を生成。内容：

```
# client
VITE_WORKER_WS=wss://your-worker.your-subdomain.workers.dev
VITE_REVENUECAT_APIKEY_IOS=rc_XXXX_public_sdk_key
VITE_REVENUECAT_APIKEY_ANDROID=rc_YYYY_public_sdk_key
VITE_ADMOB_APP_ID_IOS=ca-app-pub-TEST
VITE_ADMOB_APP_ID_ANDROID=ca-app-pub-TEST

# worker（Wranglerは環境変数を設定）
PEPPER_SECRET=change_me
```

- 起動：
  - `pnpm install`
  - 端末で `wrangler login`（Cloudflare に接続）
  - `pnpm dev`（worker: wrangler dev、client: vite dev）
  - 本番：`wrangler publish` → client を Capacitor でビルド＆配布 

### 追加要件（ゲーム詳細 / 画面フロー）

- 共通ルール（全シーン）
  - 進行はサーバ権威：`phase`/`endsAt` に従って遷移。クライアントは表示のみカウントダウン。
  - `TimerCircle(endsAt, label?)`：円プログレス＋「◯◯秒」表示。
  - バナー広告：`TITLE` / `MENU` / `LOBBY` / `READY` / `INPUT` / `DISCUSS` / `RESULT` で表示。`REVEAL` / `VOTE` / `JUDGE` は非表示。
    - キーボード表示中は一時非表示、`blur` 後 400ms で復帰。
  - インタースティシャル：
    - 結果画面の[終了]後に表示（120s クールダウン／動画 OFF 購入時は非表示）。
    - 中断時は「理由 = `not_enough_players`」かつ経過 60 秒以上かつ 120s クールダウンかつ動画 OFF 未購入の場合のみ、モーダル OK の直後に 1 回表示。
  - 右上「…」：常時通報ボタン。
  - ニックネーム：8 グラフェム上限・絵文字 OK・重複は `#2`, `#3`… 付与。
  - 秘密入力：20 グラフェム・絵文字 OK・改行不可・注意書き「個人情報は書かないでね」。
  - Android 戻る：ゲーム中は「退出すると中断の原因…」確認モーダル。

—

- シーン別 UI ＆ 遷移（完成定義）

1) Title（タイトル）
- UI
  - タイトル「秘密人狼」／サブ「誰かの秘密が落ちている」
  - [スタート]（→`/menu`）
  - `BannerSlot("TITLE")`
- 遷移：ユーザー操作で `/menu`。

—

2) Menu（メニュー）
- UI
  - [知り合いと遊ぶ]（→`/mode?type=friends`）
  - [知らない誰かと遊ぶ]（→`/mode?type=random`）
  - [ニックネーム設定]（未設定時は"遊ぶ"ボタンを disabled）
  - [ルール説明]（モーダル）
  - [応援（課金）]：
    - A「動画広告が非表示になります。バナー広告は残ります。¥300」
    - B「動画・バナーすべての広告が非表示になります。¥700」
    - A 購入済 → 差額アップグレード ¥400
  - `BannerSlot("MENU")`
- 遷移：各ボタン操作。

—

3) ModeSelect（モード選択）
- UI
  - モードカード：お題なし／恋愛／大喜利／宣言
  - [戻る]（→`/menu`）
  - `BannerSlot("MENU")`
- 遷移
  - `type=friends`：選択 → `/friends?mode=...`
  - `type=random`：選択 → `join_auto(mode)` → 割当ルーム接続 → 人数揃いモーダル → サーバ `phase_change(READY)` 受信で `/ready`

—

4) RoomCreateJoin（身内用）
- 仕様（ルーム ID）
  - 英数字 6 桁・大文字（例：AB3K9Z）
  - 生成時は重複チェック。参加入力は自動で大文字化。
  - バリデーション：`^[A-Z0-9]{6}$` に一致しない場合は Join 不可。
- UI
  - 見出し：モード名（例：恋愛）
  - [ルーム作成]（押下 → 新 ID 生成 → ホストとして `/lobby/:id` へ）
  - ルーム ID 入力（プレースホルダ ABC123、6 桁限定／自動大文字）
  - [参加]（6 桁一致時のみ有効 → `/lobby/:id`）
  - [戻る]（→`/mode?type=friends`）
  - `BannerSlot("MENU")`
- 遷移
  - [ルーム作成] → サーバへ作成要求 → 成功で `/lobby/:id`
  - [参加] → 存在確認 OK で `/lobby/:id`、NG はエラートースト

—

5) Lobby（ルーム待機・身内）
- UI
  - ルーム ID（例：AB3K9Z）＋[コピー]
  - 参加者一覧（アイコン＋ニックネーム）※枠固定・スクロール
  - ホストのみ：[開始] [解散]／参加者：[戻る]
  - `BannerSlot("LOBBY")`
- 遷移
  - [開始] → `start` 送信 → サーバ `phase_change(MODE_SELECT)` → `/mode`
  - [解散]/[戻る] → `/menu`

—

6) Ready（準備・知らない誰かと）
- UI
  - 「3人が揃いました。ゲームを開始します。」
  - `TimerCircle(endsAt)`（3秒）
  - `BannerSlot("READY")`
- 遷移
  - 3秒後 → サーバ `phase_change(INPUT)` → `/input`

—

7) Input（秘密入力）
- UI
  - お題（モードに応じたランダム）
  - テキスト入力（20 グラフェム）＋[決定]（押したらボタン非表示）
  - `TimerCircle(endsAt)`
  - `BannerSlot("INPUT")`（キーボード中は自動で隠す）
- 遷移
  - 全員提出または `endsAt` 到達 → サーバ `phase_change(REVEAL)` → `/reveal`
  - 未提出は自動で「時間切れで入力できず、ごめんなさい」

—

8) Reveal（秘密発表）
- UI
  - フェードイン 3 段：
    1. 「おやおや、こんな所に誰かの秘密がおちている」
    2. 「〇〇（秘密）」
    3. 「これは一体誰の秘密だろう」
  - バナー非表示
- 遷移：演出後、サーバ `phase_change(DISCUSS)` → `/discuss`

—

9) Discuss（議論）
- UI
  - 公開された秘密（大字）
  - チャット（`DISCUSS` 中のみ送信可、120 字・改行不可）
  - [議論終了]（押下 → 自分の終了票送信 → 押したら非表示）
  - `TimerCircle(endsAt)`
  - `BannerSlot("DISCUSS")`
- 遷移
  - 過半数（`ceil(players/2)`）が終了押下 または `endsAt` 到達 → サーバ `phase_change(VOTE)` → `/vote`

—

10) Vote（投票）
- UI
  - 公開秘密
  - 自分以外のプレイヤー一覧（スクロール）→ 1 人選択 → [決定]
  - `TimerCircle(endsAt)`
  - バナー非表示
- 遷移
  - 全員投票 or `endsAt` 到達 → サーバ `phase_change(JUDGE)` → `/judge`
  - 未提出は `"NONE"`

—

11) Judge（判定演出）
- UI（追加反映済み）
  - 小ラベル「判定は…」
  - 公開された秘密（大字）
  - 最多投票者の表示：
    - 1 位が 1 人 → そのプレイヤーのアイコン＋ニック
    - 同票（1 位が複数 or 票 0） → 「同票のため選択無効」
  - バナー非表示
  - 時間：~2 秒
- 遷移：演出完了 → サーバ `phase_change(RESULT)` → `/result`

—

12) Result（結果発表）
- UI
  - 公開された秘密
  - 勝敗ラベル：
    - 同票（選択無効）だった場合 → 「人狼の勝利」
    - 1 位が存在し、かつ公開者 ID に一致 → 「市民の勝利」
    - それ以外 → 「人狼の勝利」
  - 投票一覧（スクロール）：
    - （アイコン）プレイヤー名　X 票 を各プレイヤー分表示（`tally.counts`）
    - 「投票なし　{noneCount} 票」を最後に表示
    - 例：投票なし 2、プレイヤー 1 に 1 票 →
      - （アイコン）プレイヤー 1　1 票
      - 投票なし　2 票
  - [もう一度]（アイコン以外をリセットして新ラウンドへ）
  - [終了]（押下 → インタースティシャル条件付き → `/menu`）
  - `BannerSlot("RESULT")`
- 遷移
  - 全員が [もう一度] → サーバ `phase_change(INPUT)` → `/input`
  - 誰か 1 人でも [終了] → 全員 `/menu`

—

- 中断（Abort）共通フロー
  - 人数が 2 人以下になった瞬間、サーバから `abort({reason:"not_enough_players", elapsedMs})`。
  - クライアント：
    1. モーダル「ゲームが中断されました」
    2. OK 後、条件を満たせば動画広告（reason 一致 ＆ elapsed ≥ 60s ＆ CD 120s ＆ 動画 OFF 未購入）
    3. `/menu` へ。自動再検索 ON なら `join_auto(lastMode)`

—

- Room ID 実装メモ（AI 向け）
  - 生成：A-Z0-9 の 6 桁（必要なら O/0, I/1 を避けてもよいが今回は含めて OK）。
  - 入力：`onChange` で英字を即時大文字化、`^[A-Z0-9]{6}$` で [参加] 活性化。
  - 既存確認：存在しない ID はエラートースト「ルームが見つかりません」。 

### 確定事項（ストア / ネイティブ設定）
- Bundle ID (iOS)：`com.yuudai.secretwolf.app`
- Application ID (Android)：`com.yuudai.secretwolf.app`（仮のまま進行可）
- 最小 OS：iOS 16+ / Android 9+ (API 28)
- アプリ名：日本語「秘密人狼」／英語 "Secret Werewolf"
- プライバシーポリシー：未準備 → GitHub Pages で雛形を生成・公開し、その URL を使用（後で差し替え可）
- Cloudflare：Workers + Durable Objects + KV、有料プラン開始、使用量アラート設定
- ドメイン：当面 `*.workers.dev`（将来カスタム可）

### 確定事項（収益 / 広告・課金）
- AdMob：開発中はテスト ID のみ → リリース直前に実 ID へ差替
- RevenueCat：SDK キーはプレースホルダで進行 → 本番で差替
- Entitlements：
  - `no_video_ads`（¥300, 動画のみ OFF）
  - `ad_free_all`（¥700, 動画 + バナー OFF）
  - `upgrade_ad_free`（¥400 差額）
- 応援 UI 文言は既定どおり

### 確定事項（UX / ルール）
- 議論の過半数：接続中プレイヤー数を母数に `ceil`（例 5 人 → 3）
- `installId`：初回起動時に UUIDv4 を生成し Capacitor Preferences に保存（再インストールで更新）
- ブランド色：Tailwind `violet` 系をプライマリ
- プレイヤーアイコン：20 種類（プロジェクト内のアイコンファイルを使用）。`iconId` は 0〜19 を割当（ルーム内ユニーク）
- Sentry：導入しない（NO）

### 確定事項（ツールバージョン / 開発基盤）
- Node 20.x (LTS)、pnpm 9 系、Wrangler v3
- ESLint：`@typescript-eslint/recommended` + import 並び替え、Prettier 連携
- Prettier：`semi: true`, `singleQuote: false`, `printWidth: 100`, `trailingComma: "all"`、Tailwind plugin 使用
- Vite：ポート 5173、React SWC、`base: "/"`

### 確定事項（CI/CD 最小）
- GitHub Actions：
  - `main` へ push → dev 環境に `wrangler publish`
  - タグ `v*` push → prod 環境に `wrangler publish`
  - 秘密：`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` を設定
- モバイル（Capacitor）は手動ビルド/配布（TestFlight / Play 内部テスト） 

### 追加要件（Capacitor 設定）

```ts
import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.yuudai.secretwolf.app",
  appName: "秘密人狼",
  webDir: "dist",
  bundledWebRuntime: false,
  ios: { minVersion: "16.0" },
  android: { minSdkVersion: 28 },
  plugins: {
    SplashScreen: { launchShowDuration: 0 },
  },
};
export default config;
```

### 追加要件（installId ユーティリティ）

```ts
import { Preferences } from "@capacitor/preferences";

const KEY = "installId";
const gen = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 15) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

export async function getInstallId(): Promise<string> {
  const { value } = await Preferences.get({ key: KEY });
  if (value) return value;
  const id = gen();
  await Preferences.set({ key: KEY, value: id });
  return id;
}
```

### 追加要件（プレイヤーアイコン 20種）

```ts
export const AVATARS: string[] = Array.from({ length: 20 }, (_, i) =>
  new URL(`./${String(i).padStart(2, "0")}.png`, import.meta.url).toString()
);
// iconId は 0..19 を想定
export const avatarById = (id: number) => AVATARS[id % AVATARS.length];
``` 

### 追加要件（Tailwind テーマ / プライマリ violet）

```ts
import type { Config } from "tailwindcss";
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "rgb(139 92 246)", // violet-500
          50: "rgb(245 243 255)", 100: "rgb(237 233 254)", 200: "rgb(221 214 254)",
          300: "rgb(196 181 253)", 400: "rgb(167 139 250)", 500: "rgb(139 92 246)",
          600: "rgb(124 58 237)", 700: "rgb(109 40 217)", 800: "rgb(91 33 182)", 900: "rgb(76 29 149)"
        }
      }
    }
  },
  plugins: [],
} satisfies Config;
```

### 追加要件（WS 心拍 30s ping/pong と自動再接続）

```ts
let ws: WebSocket | null = null;
let hb: any, reconnectTimer: any, backoff = 1000;

export function connect(url: string, onMsg: (m:any)=>void) {
  if (ws) ws.close();
  ws = new WebSocket(url);
  ws.onopen = () => {
    backoff = 1000;
    clearInterval(hb);
    hb = setInterval(() => ws?.send(JSON.stringify({ t:"ping", p: Date.now() })), 30000);
  };
  ws.onmessage = e => { try { onMsg(JSON.parse(e.data)); } catch {} };
  ws.onclose = () => {
    clearInterval(hb);
    reconnectTimer = setTimeout(() => connect(url, onMsg), backoff);
    backoff = Math.min(backoff * 2, 15000);
  };
  ws.onerror = () => ws?.close();
}
export const send = (t: string, p: any) => ws?.readyState === 1 && ws.send(JSON.stringify({ t, p }));
```

### 追加要件（GitHub Actions: Workers デプロイ）

```yaml
name: deploy-worker
on:
  push:
    branches: [ main ]
    tags: [ 'v*' ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: pnpm install --frozen-lockfile
      - name: Publish (dev on main / prod on tags)
        run: |
          if [[ "${GITHUB_REF}" == refs/heads/main ]]; then
            pnpm --filter packages/worker wrangler publish --env dev
          else
            pnpm --filter packages/worker wrangler publish --env prod
          fi
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
``` 

### 追加要件（Wrangler バインディング dev/prod 例）

```toml
name = "secret-werewolf"
main = "src/index.ts"
compatibility_date = "2025-01-01"

[durable_objects]
bindings = [{ name = "DO_ROOMS", class_name = "RoomDO" }]

[[migrations]]
tag = "v001_roomdo"
new_classes = ["RoomDO"]

[[kv_namespaces]]
binding = "MOD_KV"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"    # dev
preview_id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

[env.prod]
vars = { }
[env.prod.kv_namespaces]
bindings = [{ binding = "MOD_KV", id = "yyyyyyyyyyyyyyyyyyyyyyyyyyyyyy" }]
```

### 追加要件（.env.sample クライアント）

```env
# client
VITE_WORKER_WS=wss://<your-subdomain>.workers.dev
VITE_REVENUECAT_APIKEY_IOS=rc_XXXX_public_sdk_key
VITE_REVENUECAT_APIKEY_ANDROID=rc_YYYY_public_sdk_key
VITE_ADMOB_APP_ID_IOS=ca-app-pub-TEST
VITE_ADMOB_APP_ID_ANDROID=ca-app-pub-TEST
``` 

### 追加の確定事項（前提・再掲）
- `endsAt`: UNIX ms (number)
- 文字数判定: `graphemeLength` は NFC 正規化後にカウント
- タイマー表示: 切り上げ (ceil)
- 6 桁ルーム ID: `^[A-Z0-9]{6}$`（入力は即時大文字化）
- Ping/Pong: 30s ごとに `t:"ping"` → サーバは `t:"pong"` で応答
- `RoundState.tally`: `{ topIds: string[]; counts: Record<string, number>; noneCount: number }`
- `RoundState.submissions`: `Record<ownerId, string>`
- お題/固定コピーの正本: `worker/src/prompts.ts`（サーバのみ保持）
- Chat レート制限: なし（`DISCUSS` のみ受理）
- Shadow（レベル 2 ミュート）: 本人には表示し、`shadow: true` フラグを付与
- 議論の過半数: 接続中プレイヤー数を母数に `ceil`
- 野良キュー: 専用 DO、45 秒でタイムアウト、モード別キュー
- ルーム作成: `HTTP POST /rooms` で ID 払い出し（英数字 6 桁）
- dev 接続: wrangler のリモート dev URL を使用（CORS: dev=`*`, prod=自ドメイン）

### 追加要件（WebSocket プロトコル定義 / 型）

```ts
// Client -> Server
type C2S =
  | { t: "join";         p: { roomId: string; nick: string; installId: string } }
  | { t: "auto";         p: { mode: Mode; nick: string; installId: string } }
  | { t: "start";        p: {} }
  | { t: "submitSecret"; p: { text: string } }
  | { t: "endDiscuss";   p: {} }
  | { t: "vote";         p: { targetId: string | "NONE" } }
  | { t: "chat";         p: { text: string } }
  | { t: "report";       p: { targetPlayerId: string; mode: "RANDOM" | "FRIENDS"; messageId?: string } }
  | { t: "requestState"; p: {} }
  | { t: "leave";        p: {} }
  | { t: "ping";         p: number }; // client timestamp

// Server -> Client（state は常に全体送信）
type S2C =
  | { t: "state";           p: RoomState }
  | { t: "phase";           p: { phase: Phase; endsAt: number } }
  | { t: "chat";            p: { id: string; authorId: string; text: string; ts: number; shadow?: true } }
  | { t: "discussProgress"; p: { yes: number; needed: number } }
  | { t: "abort";           p: { reason: "not_enough_players"; elapsedMs: number } }
  | { t: "warn";            p: { code: WarnCode; msg: string } }
  | { t: "reportAck";       p: { ok: true } }
  | { t: "pong";            p: number }; // echo timestamp

// WarnCode
type WarnCode =
  | "INVALID_OP"
  | "NOT_IN_PHASE"
  | "ROOM_NOT_FOUND"
  | "BAD_ROOM_ID"
  | "NICK_REQUIRED"
  | "ALREADY_SUBMITTED"
  | "SELF_VOTE_FORBIDDEN"
  | "NOT_HOST"
  | "CHAT_DISABLED"
  | "RATE_LIMIT"
  | "TARGET_NOT_FOUND";
```

- 制約（バリデーション）
  - `nick`: NFC 正規化後に ≤ 8 グラフェム、非空
  - `submitSecret.text`: NFC → ≤ 20 グラフェム、改行禁止。未提出はサーバ側で固定文言を自動セット（「時間切れで入力できず、ごめんなさい」）
  - `chat.text`: `DISCUSS` 中のみ受理、NFC → ≤ 120 グラフェム、改行禁止
  - `vote.targetId`: 自分自身は不可／`"NONE"` は常に許可
  - `roomId`: `^[A-Z0-9]{6}$`
  - 心拍: クライアントが 30s ごとに `ping`、サーバは `pong` で同値返却

### 追加要件（フェーズ遷移ロジック要点）
- `INPUT` → 全員提出 or `endsAt` 到達。未提出者は自動文言
- `REVEAL` → 直前の公開者を除外し一様ランダム。演出 ~8s
- `DISCUSS` → 秒数 = 接続中人数 × 15s。過半数（`ceil`）が `endDiscuss` 押下 もしくは締切で `VOTE`
- `VOTE` → 10s。未提出は `"NONE"`。自分投票はサーバで拒否
- `JUDGE` → `tally`: `"NONE"` は最多比較から除外。最多同票なら `topIds.length !== 1` → 選択無効
- 勝敗:
  - invalid（同票/全 `NONE`）→ 人狼の勝利
  - `topId === revealedOwnerId` → 市民の勝利
  - それ以外 → 人狼の勝利
- `RESULT` → [もう一度] 全員 OK で `INPUT`、[終了] 1 人でも OK で全員メニュー（インタースティシャル条件付き）
- 2 人未満になった瞬間 `abort("not_enough_players")`。クライアントは中断モーダル → OK →（条件合致時）動画 → メニュー 

### 追加要件（Worker / Durable Object 詳細）
- 配信粒度
  - `state`: 常に `RoomState` 全体（差分なし・堅牢優先）
  - `phase`: 開始時に `phase/endsAt` を別送（UI のタイマー用途）
- 公開者候補
  - 直前公開者（`lastRevealedOwnerId`）のみ除外。それ以外は一様ランダム
  - `INPUT` 終了時点で未提出者はいない（自動文言で補完済み）ため、全員が候補
- 野良マッチキュー
  - 専用 DO がモード別キューを FIFO で保持
  - 45 秒でタイムアウト（本人に「続けますか？」トースト推奨）
  - 3 名揃い次第、同一の `RoomDO` を割当 → `INPUT` から開始（`LOBBY` スキップ）
  - HTTP: `POST /auto`（CORS: dev=`*`、prod=アプリ Origin のみ、IP あたり軽リミット）
- ルーム作成 API
  - `POST /rooms` → 新規 6 桁 ID 払い出し（重複チェック）
  - `RoomCreateJoin` はこれを叩いた後、WS で `/ws/room/:id` に接続
- スナップショット
  - フェーズ遷移時に `RoomState` を DO storage へ保存（障害復帰用の最小限）

### 追加要件（Moderation 詳細）
- `PEPPER_SECRET`: wrangler secret（dev/prod 各環境）
- 指紋ハッシュ: SHA-256 hex
- レベル 1: 通報直後に 報告者側ローカル非表示 ＋ 将来の同卓回避（クライアント 90 日保持）
- レベル 2: 同卓 過半数（接続中 `ceil`）で シャドウミュート（そのゲームのみ）
- レベル 3（`RANDOM` のみ・7 日ローリング）
  - `uniqueReporters` / `uniqueOpponents` 集合を KV 管理（24h 同一報告者→同一対象は 1 回まで、ユニーク日数 ≥ 2、ユニークルーム ≥ 3）
  - しきい値:
    - `R≥10 & R/U≥3% → 24h ban`
    - `R≥15 & R/U≥4% → 72h ban`
    - `R≥25 & R/U≥5% → 7d ban`
- `report.messageId`: サーバ採番（UUID）
- `FRIENDS` はグローバル集計対象外（レベル 1/2 のみ適用）
- 本文は保存しない（メタデータのみ）

### 追加要件（HTTP / CORS / dev 運用）
- dev: `/auto`, `/rooms` は CORS `*`、WS は wrangler のリモート dev URL を利用
- prod: CORS はアプリの WebView Origin のみに限定、`/auto` に簡易レート制限（例: IP 30 req/min）
- `/healthz`: 200 のみで OK（KV 接続などはワーカー起動で検証済みとみなす）

### 追加要件（クライアント実装・確定点）
- 再接続: バックオフ 1s → 2s → 4s → 8s → 15s（上限）、無限リトライ。復帰直後に `requestState`
- `TimerCircle`: `displaySeconds = ceil((endsAt - now)/1000)`。0 表示は直前のみ
- 人数揃いモーダル（random）: 文言「3人が揃いました。ゲームを開始します。」、`phase_change(INPUT)` 受信で即クローズ
- Android 戻るキー:
  - 「ゲームから退出しますか？人数が減ると中断になることがあります。」
  - [キャンセル] / [退出]
- Banner: 入力/議論ではキーボード表示中に一時非表示 → `blur` 後 400ms で復帰 

### 追加要件（Zod スキーマ｜実装用そのまま貼付可）

```ts
import { z } from "zod";

// helpers
const roomId = z.string().regex(/^[A-Z0-9]{6}$/);
export const ModeZ = z.enum(["NONE","LOVE","OGIRI","DECLARATION"]);
export const PhaseZ = z.enum(["LOBBY","INPUT","REVEAL","DISCUSS","VOTE","JUDGE","RESULT"]);

const Nick = z.string().min(1).max(64);   // 実カウントはgraphemeLength<=8で別途検証
const Text20 = z.string().min(1).max(200);// 実カウントはgraphemeLength<=20/NFCで検証
const Chat120 = z.string().min(1).max(600);// 実カウントはgraphemeLength<=120/NFCで検証

// C->S
export const C_join = z.object({ t: z.literal("join"), p: z.object({
  roomId, nick: Nick, installId: z.string().min(8),
})});
export const C_auto = z.object({ t: z.literal("auto"), p: z.object({
  mode: ModeZ, nick: Nick, installId: z.string().min(8),
})});
export const C_start = z.object({ t: z.literal("start"), p: z.object({}) });
export const C_submitSecret = z.object({ t: z.literal("submitSecret"), p: z.object({
  text: Text20, // NFC+grapheme<=20 を別途
})});
export const C_endDiscuss = z.object({ t: z.literal("endDiscuss"), p: z.object({}) });
export const C_vote = z.object({ t: z.literal("vote"), p: z.object({
  targetId: z.union([z.literal("NONE"), z.string().min(1)]),
})});
export const C_chat = z.object({ t: z.literal("chat"), p: z.object({
  text: Chat120, // DISCUSSのみ受理
})});
export const C_report = z.object({ t: z.literal("report"), p: z.object({
  targetPlayerId: z.string().min(1),
  mode: z.enum(["RANDOM","FRIENDS"]),
  messageId: z.string().optional(),
})});
export const C_requestState = z.object({ t: z.literal("requestState"), p: z.object({}) });
export const C_leave = z.object({ t: z.literal("leave"), p: z.object({}) });
export const C_ping = z.object({ t: z.literal("ping"), p: z.number() });

export const C2S = z.discriminatedUnion("t", [
  C_join, C_auto, C_start, C_submitSecret, C_endDiscuss,
  C_vote, C_chat, C_report, C_requestState, C_leave, C_ping
]);

// S->C
export const PlayerZ = z.object({
  id: z.string(), nick: z.string(), iconId: z.number().int(), connected: z.boolean()
});
export const RoomStateZ = z.object({
  roomId, mode: ModeZ,
  players: z.array(PlayerZ),
  hostId: z.string().optional(),
  phase: PhaseZ, endsAt: z.number(),
  round: z.object({
    prompt: z.string(),
    submissions: z.record(z.string(), z.string()),
    revealedOwnerId: z.string().optional(),
    revealedText: z.string().optional(),
    votes: z.record(z.string(), z.union([z.literal("NONE"), z.string()])),
    tally: z.object({
      topIds: z.array(z.string()),
      counts: z.record(z.string(), z.number().int().nonnegative()),
      noneCount: z.number().int().nonnegative(),
    }).optional(),
    lastRevealedOwnerId: z.string().optional(),
  })
});

export const S_state = z.object({ t: z.literal("state"), p: RoomStateZ });
export const S_phase = z.object({ t: z.literal("phase"), p: z.object({
  phase: PhaseZ, endsAt: z.number()
})});
export const S_chat = z.object({ t: z.literal("chat"), p: z.object({
  id: z.string(), authorId: z.string(), text: z.string(), ts: z.number(), shadow: z.boolean().optional()
})});
export const S_discussProgress = z.object({ t: z.literal("discussProgress"), p: z.object({
  yes: z.number().int().nonnegative(), needed: z.number().int().positive()
})});
export const S_abort = z.object({ t: z.literal("abort"), p: z.object({
  reason: z.literal("not_enough_players"), elapsedMs: z.number().nonnegative()
})});
export const S_warn = z.object({ t: z.literal("warn"), p: z.object({
  code: z.enum([
    "INVALID_OP","NOT_IN_PHASE","ROOM_NOT_FOUND","BAD_ROOM_ID","NICK_REQUIRED",
    "ALREADY_SUBMITTED","SELF_VOTE_FORBIDDEN","NOT_HOST","CHAT_DISABLED",
    "RATE_LIMIT","TARGET_NOT_FOUND"
  ]), msg: z.string()
})});
export const S_reportAck = z.object({ t: z.literal("reportAck"), p: z.object({ ok: z.literal(true) }) });
export const S_pong = z.object({ t: z.literal("pong"), p: z.number() });

export const S2C = z.discriminatedUnion("t", [
  S_state, S_phase, S_chat, S_discussProgress, S_abort, S_warn, S_reportAck, S_pong
]);
```

### 画面仕様への反映（確認）
- Judge（判定）：公開秘密＋最多投票者 or 「同票のため選択無効」表示
- Result（結果）：同票は「人狼の勝利」。投票一覧に「投票なし {noneCount}票」を必ず表示
- RoomCreateJoin：6 桁英数字・大文字化・戻るボタンあり 

### 追加要件（ニックネーム重複と表示名確定）
- ユーザーが入力するのはベース名：最大 8 グラフェム（絵文字 OK）
- ルーム内に同じベース名が既にいれば、ベース名 + `#2` / `#3` … を付与（ベースは切り詰めない）
- 表示用の最終ニックネーム（例：田中シオン#2）は 8 文字を超えても OK
- 衝突判定はベース名で行う（表示名ではない）
- `RoomState.players[].nick` は表示名を入れる。`nickBase` はサーバ内部で保持（クライアントへは送らない）

- Zod 注釈（型は変更なし）
```ts
// C_join / C_auto の p.nick は「ベース名」。
// バリデーションは NFC 正規化後、graphemeLength <= 8 を満たすこと（実装でチェック）。
```

- サーバ（DO）実装メモ：重複時のサフィックス付与（切り詰めなし）
```ts
function nextDisplayNick(base: string, existingDisplayNicks: string[]): string {
  if (!existingDisplayNicks.includes(base)) return base;
  for (let n = 2; n <= 99; n++) {
    const cand = `${base}#${n}`;
    if (!existingDisplayNicks.includes(cand)) return cand;
  }
  return `${base}#X`;
}

// join/auto 受信時（ベース名チェック → 表示名確定）
const base = normalizeNFC(trimToGraphemes(p.nick, 8)); // ベース名上限8
if (!base) return warn("NICK_REQUIRED", "ニックネームを入力してください。");
const used = room.players.map(pl => pl.nick);          // 表示名の集合
const display = nextDisplayNick(base, used);
room.players.push({ id, nick: display, iconId, connected: true /* ... */ });
```

### 追加要件（Avatar コンポーネント）
```tsx
// client/src/components/Avatar.tsx
import { avatarById } from "@/assets/avatars";

type Props = { iconId: number; size?: number; ring?: boolean; alt?: string };

export default function Avatar({ iconId, size = 48, ring = true, alt = "avatar" }: Props) {
  return (
    <div
      className={`rounded-full overflow-hidden ${ring ? "ring-1 ring-white/20 shadow-sm" : ""}`}
      style={{ width: size, height: size }}
    >
      <img
        src={avatarById(iconId)}
        alt={alt}
        className="w-full h-full object-cover block"
        decoding="async"
        loading="lazy"
      />
    </div>
  );
}
```

- 利用例（プレイヤー一覧）
```tsx
import Avatar from "@/components/Avatar";

{players.map(p => (
  <div key={p.id} className="flex items-center gap-2 py-1">
    <Avatar iconId={p.iconId} size={40} />
    <div className="truncate">{p.nick}</div>
  </div>
))}
```
- 画像は `packages/client/src/assets/avatars/00.png`〜`19.png`（512×512 PNG）を利用。表示は `rounded-full + overflow-hidden`、`object-cover`。

### 補足確定事項（運用・挙動）
- PostCSS: `tailwindcss` と `autoprefixer` のみ
- CORS(prod): `Access-Control-Allow-Origin: "capacitor://localhost"` を明示許可（Web 配信は想定しない）。dev は `*` を許可
- Discuss 中の接続変動: `needed = ceil(現在の接続人数 / 2)` をリアルタイム更新
- 投票中に離脱: 既投票は有効のまま保持。未投票で離脱は締切後に `"NONE"`
- レベル 1 のローカル非表示: 過去メッセージも遡及して非表示＋以降の配信も抑止。`reportAck` 受信時にクライアントでチャット一覧を再フィルタ
- `/auto` のレート制限（prod）: IP あたり 30 req/min
- RevenueCat のプロダクト ID: 現状は仮 ID（`no_video_ads`, `ad_free_all`, `upgrade_ad_free`）をコードに置き、本番 SKU で後差し替え
- 画面内文言の言語: アプリ内は日本語のみ（i18n なし）。ストア表示名のみ日英あり 

### 追加要件（入室/定員・ホスト・アイコン・お題バッグ・履歴・CORS/429）
- プレイヤー数と入室
  - 定員：
    - 知らない誰か（auto）＝3 人固定。`LOBBY` は使わず、3 人揃い次第開始
    - 知り合い（friends）＝3〜8 人（`LOBBY` で最大 8 人まで許可）
  - 途中参加：常に不可。ただし再接続（30 秒以内）は同席復帰を許可
- アイコン割当
  - 未使用からランダム（ルーム内で被りなし。最小番号優先はしない）
  - [もう一度]：同一ルーム内では各自の `iconId` を維持。新規ルームでは再抽選
- ホスト
  - friends：ルーム作成者＝host 固定（開始/解散権限）
  - auto：host 概念なし（権限チェック不要）
  - [もう一度]：host 維持
- お題の重複回避
  - 同一ルーム×モードごとにシャッフルバッグ方式：未出題を優先し、尽きたら全補充して再シャッフル
  - 「お題なし」は固定文言なので対象外
- Moderation（KV 保持/ban 更新）
  - `reporters`/`opponents` の TTL：7 日（UTC 基準のローリング）
  - ban 延長：既に ban 中に閾値再到達 → `banUntil = max(banUntil, newCalculatedUntil)` で更新
- 警告文言（`warn.msg`）
  - 日本語の定型文をサーバ側で付与（コード→文言のマップを実装）
- チャット履歴
  - `RESULT` 遷移時にクリア。次ラウンドへは持ち越さない
- `/auto` レート制限応答（prod）
  - 超過時：HTTP 429＋日本語メッセージ（例：「アクセスが集中しています。しばらくしてからもう一度お試しください。」）
  - `Retry-After` ヘッダを残り秒数で付与（60 秒窓・IP あたり 30 req/min）
  - JSON 本文 `{ error: string, retryAfter: number }`
- CORS（本番）
  - 許可オリジン：`capacitor://localhost` のみ（Web 配信は想定しない）。将来 Web 配信時は許可配列に追記
- ルーム終了と DO 状態
  - `LOBBY` で全員離脱 または `RESULT` 後に全員退出 → メモリ状態を初期化し、DO は自然終了（GC）に任せる
- 投票一覧の表示順
  - 票数降順 → 同数は参加順（そのルームでの join 順）で安定表示 

### 追加要件（状態リセットと同期の非交渉ルール・厳守）
- サーバ権威: 画面遷移は必ず S2C の `phase` 通知受信後に行う。クライアントのカウントダウンが 0 でも画面は変えない
- 識別子で整合性を担保: 各ラウンド `roundId`（連番/UUID）、各フェーズ通知に `phaseSeq` を付与。クライアントは `(phase, roundId, phaseSeq)` が進んだ場合のみ UI 更新（古い信号は破棄）
- UI は受信した状態だけを反映: `hasSubmittedSecret` などはサーバ状態から再構築（ローカル推測禁止）

### DO（サーバ）識別子の付与
- `room.state` に以下を追加し、フェーズ遷移とともに管理
  - `roundId: string`（ラウンド毎に新規採番、UUID 可）
  - `phaseSeq: number`（フェーズ毎に +1）
- ラウンド開始（`goInput`）時に `roundId = uuid()`、`phaseSeq = 1`

### S2C: `phase` ペイロードの拡張（重要）
- これまでの `{ phase, endsAt }` に加えて、以下を必ず送る

```ts
// 送信例
{ t: "phase", p: { phase, endsAt, roundId, phaseSeq } }
```

- Zod 追記（実装時に適用）
```ts
// 追補: S_phase の p に roundId と phaseSeq を追加
// export const S_phase = z.object({ t: z.literal("phase"), p: z.object({
//   phase: PhaseZ, endsAt: z.number(), roundId: z.string(), phaseSeq: z.number().int().positive()
// })});
```

- 任意（必要であれば）`RoomState` にも `roundId`/`phaseSeq` を保持可能（復元容易化のため）

### クライアント: 揮発 UI 状態の分離とリセット API

```ts
// client/src/state/uiReset.ts
export type UiEphemeral = {
  hasSubmittedSecret: boolean;
  hasPressedEndDiscuss: boolean;
  hasSubmittedVote: boolean;
  chatDraft: string;
  bannerHiddenByKeyboard: boolean;
  localTimers: { id?: number }; // setInterval/Timeout の把握
};

export function uiResetForNewRound(): UiEphemeral {
  return {
    hasSubmittedSecret: false,
    hasPressedEndDiscuss: false,
    hasSubmittedVote: false,
    chatDraft: "",
    bannerHiddenByKeyboard: false,
    localTimers: {},
  };
}

export function uiResetForPhaseChange(s: UiEphemeral) {
  // フェーズ跨ぎで必ずタイマー/残骸を掃除
  if (s.localTimers.id) {
    clearInterval(s.localTimers.id);
    s.localTimers.id = undefined;
  }
}

export function uiResetOnLeaveOrAbort(): UiEphemeral {
  return uiResetForNewRound();
}
```

- 呼び出し規約
  - `onPhaseMessage(phase, endsAt, roundId, phaseSeq)` を受信したら:
    1) 古い信号なら return（`roundId/phaseSeq` 比較）
    2) `uiResetForPhaseChange(state.ui)` を先に実行
    3) その後に画面遷移と `TimerCircle` 起動（`endsAt` 基準）
  - ルーム退出/中断/戻る時は `uiResetOnLeaveOrAbort()` を呼んでから `/menu` へ遷移

### 追加要件（サーバ DO: シーン別リセット関数・必須）

```ts
// worker/src/room.ts（概念）
// ラウンド開始時
function resetRoundState(room) {
  room.state.roundId = uuid();
  room.state.phase = "INPUT";
  room.state.phaseSeq = 1;
  room.state.round = {
    prompt: pickPrompt(room),
    submissions: {}, votes: {},
    revealedOwnerId: undefined, revealedText: undefined,
    tally: undefined, lastRevealedOwnerId: room.state.round?.revealedOwnerId
  };
  room.state.chat = []; // 履歴はラウンド単位でクリア
  setEndsAt(LIMITS.inputSec);
}

// 中断・解散時
function resetRoomOnAbort(room) {
  // ルーム存続は可。ロビーステートに戻すか、全員退室なら初期化。
  room.state.phase = "LOBBY";
  room.state.phaseSeq++;
  room.state.round = emptyRound();
  room.state.chat = [];
  clearAlarms();
}

// もう一度
function resetForRematch(room) {
  resetRoundState(room);    // アイコンは維持、プレイヤー構成は現状維持
}
```

- リセット・マトリクス（何をリセット/維持するか）は別紙のとおり（本プロジェクト資料の画像参照）

### 追加要件（タイマー & ナビゲーションの厳格ガード）
- `TimerCircle` は `endsAt` を必須入力。フェーズ受信前は絶対に起動しない
- `displaySeconds = ceil((endsAt - Date.now())/1000)`
- フェーズ受信 → UI 描画 → タイマー開始 の順（逆順禁止）
- 画面アンマウント/フェーズ跨ぎ時は必ず `clearInterval`/`clearTimeout`

### 追加要件（"押したのに反映が重複/遅延"バグ防止）
- 送信ボタンは一度きり：送信直後にボタンを隠し、サーバ応答（state 反映）で最終確定
- 連打はフロントで抑止し、サーバでも idempotent 処理
  - `submitSecret`: すでに `submissions[myId]` があれば `ALREADY_SUBMITTED`
  - `vote`: 再送は上書き可だが、締切後は `NOT_IN_PHASE`
  - 再接続: サーバの状態に合わせて `hasSubmitted*` を再計算

### 追加要件（画面イベントでのリセット順序テンプレ）
- 終了/戻るボタン:
  1) `uiResetOnLeaveOrAbort()`
  2) `ws.send({ t: "leave" })` or そのまま切断
  3) 広告表示（条件成立時）
  4) `/menu` へ
- [もう一度] 全員 OK:
  - サーバ → `phase(INPUT, newRoundId, phaseSeq=1)` 受信
  - → `uiResetForNewRound()` → `/input` 遷移

### 追加要件（受入テスト・自動化必須）
1) 未提出でシーン遷移しない
- 2 人提出/1 人未提出で `endsAt` 到達 → サーバが自動文言をセット → `REVEAL` → 未提出者のボタンは次ラウンドで復活
2) もう一度
- `RESULT` → 全員 [もう一度] → `INPUT`: `hasSubmitted*` 全 `false`、`chat` 空、`roundId` 更新を確認
3) 退出→メニュー
- [終了] or 戻る → `uiResetOnLeaveOrAbort()` が呼ばれ、`chat/タイマー/フラグ` 全クリア
4) 中断
- `abort` 受信後に OK 押下 →（条件成立で広告）→ `/menu`、復帰後 `join_auto` でも古いフラグを一切引きずらない
5) 再接続
- `DISCUSS` で切断 → 15 秒で復帰 → `requestState` → `hasSubmitted*` がサーバ状態に同期

### 追加要件（デバッグ・ロギング：開発時のみ）
- すべての `phase` 受信で `console.debug("[phase]", phase, roundId, phaseSeq, new Date(endsAt).toISOString())`
- リセット関数呼び出し時に `console.debug("[uiReset]", kind)`
- リリースビルドではこのログをビルドフラグで無効化

### 追加実装メモ（任意）
- `stateVersion` を `phaseSeq` とは別に部屋全体のエポックとして用意（解散/中断/全退出のたびに ++）
- クライアントは `stateVersion` が変わったら UI 全クリアを強制実行（保険）

### 本番切替ポリシー（固定）
- 環境は dev / prod の2系統のみ（stagingなし）
- 切替は 設定差替えで行い、コード差替えはしない
- 切替順序は Worker → Client → Mobile。ロールバックは逆順

### スイッチ一覧（dev → prod に何を変えるか）
- Worker URL: client `.env` `VITE_WORKER_WS`
  - `wss://<dev>.workers.dev` → `wss://<prod>.workers.dev`
- KV Namespace: `wrangler.toml`
  - dev ID → prod ID（`[env.prod.kv_namespaces]` に `MOD_KV` 本番ID）
- Secret: Workers Secret
  - `PEPPER_SECRET` を prod に投入
- CORS: Worker コード
  - `*` → `capacitor://localhost`
- Rate Limit: Worker コード
  - なし/緩め → IP 30 req/min（429 + `Retry-After`）
- RevenueCat: client `.env`
  - `sandbox` → production keys
- AdMob: client `.env`
  - テスト ID → 本番 ID（審査直前）
- Remote Config: KV `config:global`
  - dev 値 → 本番値（例: `ads.cooldownMs=120000`、interstitial on/off、moderation 閾値 等）

### 1. 先にやること（Worker / Cloudflare）
1) `wrangler.toml`（prod）
- `[env.prod]` があること
- KV 本番IDを `MOD_KV` に設定
- DO migrations は変更なし（例: `v001_roomdo` のまま）
2) Secrets（prod）
- `wrangler secret put PEPPER_SECRET --env prod`
3) Remote Config（KV）
- `config:global` を投入（例: `ads.cooldownMs=120000`、interstitial on/off、moderation 閾値 など）
4) CORS / レート制限（prod）
- `Access-Control-Allow-Origin: "capacitor://localhost"`
- `/auto` は IP 30 req/min 超過時 HTTP 429 + `Retry-After`
5) Publish（prod）
```sh
pnpm --filter packages/worker build
pnpm --filter packages/worker wrangler publish --env prod
```

### 2. クライアント（WebView側）
1) `.env`（client）
- `VITE_WORKER_WS = wss://<prod>.workers.dev`
- RevenueCat API Key（iOS/Android）を prod に
- AdMob App ID は 審査直前に本番IDへ（それまではテストID）
2) ビルド
```sh
pnpm --filter packages/client build
```

### 3. モバイル（Capacitor）
1) `capacitor.config.ts`
- `appId: "com.yuudai.secretwolf.app"`
- iOS 16+ / Android 9+
2) 同期 & 実機ビルド
```sh
npx cap sync
# iOS: Xcode Archive → TestFlight
# Android: 署名リリース → Play 内部テスト
```
3) プライバシーポリシーURL
- GitHub Pages で公開しストアに登録

### 5. 本番直前チェックリスト
- Worker を prod で publish 済み
- `MOD_KV` 本番ID / `PEPPER_SECRET`(prod) 設定済み
- CORS が `capacitor://localhost` に限定
- `/auto` の 429 + `Retry-After` 動作確認
- client の `.env` が prod URL / prod keys
- AdMob は審査直前に実IDへ差替
- プライバシーポリシーURL 登録
- ビルド後、iOS/Android 実機で3端末一周テスト

### 6. 5分テスト台本（本番URLで最終確認）
1) 野良3端末 → 「揃いました」→ `INPUT`
2) 1人未提出のまま締切 → 自動文言 → `REVEAL`
3) `DISCUSS` 過半数終了 → `VOTE`
4) 投票 → 同票にして `JUDGE` → `RESULT`（「人狼の勝利」「投票なしX票」表示）
5) `[もう一度]` 全員 → `INPUT`（フラグ/履歴が完全リセット）
6) 1人退出 → 中断モーダル →（条件合致で）動画広告 → `/menu`

### 7. ロールバック（事故時）
1) Worker を dev に切戻し（または直前タグへ）
2) 必要なら client `.env` の URL を dev に戻して再ビルド（基本不要）
3) KV `config:global` を安全側に（広告 OFF、閾値強化 等）

### 8. 典型ミスの回避（最後に再確認）
- 遷移は S2C `phase` 受信後のみ（タイマーは表示だけ）
- 状態リセット関数を遷移前に必ず実行
- CORS を `capacitor://localhost` にし忘れない
- AdMob 実IDの切替は審査直前
- `/auto` のレート制限は IP 30 req/min + `Retry-After`

# ホスト設計・運用（確定）

目的: ホストは friends モードの LOBBY のみで役割を持ち、ゲーム開始後は消滅。auto ではホストは存在しない。

## 1) 定義（Invariant）
- friends の LOBBY 中のみ `hostId` を持つ。`phase` が LOBBY を抜けた瞬間に `hostId` は `null/undefined`。
- auto では `hostId` は最初から存在しない。LOBBY 画面もスキップ。
- ゲーム中（INPUT〜RESULT）は全員同権。ホスト権限は一切なし。

判定関数（実装目安）
- `hostActive = (state.phase === "LOBBY" && hostId != null)`

## 2) 権限チェック（サーバDO）
- start: `friends × LOBBY × sender===hostId` のときのみ受理。それ以外は `warn{ code:"NOT_HOST" }`。
- auto: start は常に `warn{ code:"INVALID_OP" }`。
- leave: だれでも可。LOBBY 中に host が leave したら、残存メンバーがいれば join 順最古へ自動委譲（ホスト不在で開始できない事態を防止）。

## 3) UI 表示ルール
- friends/LOBBY
  - `me.id===hostId` → `[開始][解散]` を表示
  - それ以外 → `[戻る]` のみ（`leave` 送信）
- auto → LOBBY 画面は出さない（3 人揃いで即 INPUT）

## 4) 結果画面の意思決定
- [もう一度]: 全員が押したら新ラウンドへ（ホスト不要・同権）
- [終了]: 1 人でも押せば全員メニューへ（`S_abort{reason:"end"}`）。

## 5) 状態の持ち方
- `RoomState.hostId` は friends × LOBBY 中のみ非 null。LOBBY を出たら `null` にする。

## 6) 端ケース（LOBBY のみ）
- host が切断/離脱: 即時、残存者の join 順最古へ自動委譲
- 全員離脱: DO は自然終了（次アクセス時に初期化）
- 解散: ホストの `[解散]` で `S_abort{reason:"disbanded"}` を全員へ送信してメニューへ
- 任意拡張: `C_disband{}` を追加してもよい

## 7) 受入テスト
1. friends: ホスト以外に [開始] が見えない。ホストが開始→`hostId=null` になっている
2. friends: ホストが LOBBY で離脱→残りの最古参加者に [開始] が出る
3. auto: 3 人揃いで自動開始。`hostId` は常に `null`
4. RESULT: ホストがいなくても、全員 [もう一度] で再戦／誰か 1 人 [終了] で全員終了

## 受入テストチェックリスト（現状）
- WebSocket 接続: ロビー入室で `you/state/phase` が届く
- LOBBY: ホストのみ [開始][解散]、非ホストは [戻る]
- LOBBY→開始で `hostId=null` へ遷移（stateに保持されない）
- auto: /auto で 3 人揃うと自動で INPUT へ（hostId は常に null）
- INPUT: 20 グラフェム/NFC バリデーション、二重送信不可
- REVEAL: 時間で DISCUSS へ
- DISCUSS: チャット送受信、shadow は本人のみに表示、通報でトースト
- VOTE: 自分の投票がハイライト、全員投票で結果へ
- RESULT: 全員が [もう一度] で再戦、誰かが [全員終了] で全員メニューへ、自分だけ [終了] で離脱
- LOBBY（friends）でホスト離脱→最古へ委譲
- 解散: ホストの [解散] で全員に abort(disbanded)

## 手動E2Eテスト手順（最小）

前提
- 端末A/B/Cのブラウザ（Chrome推奨）を使用
- Worker: `pnpm -C packages/worker dev -- --port 8787`
- Client: `pnpm -C packages/client dev`（Vite 5173）
- `.env` で `VITE_WORKER_WS=ws://localhost:8787`

### A. friends（ホスト制御あり）
1. 端末A: `/menu → 知り合いと遊ぶ → モード選択 → ルーム作成` → `lobby/:id` 表示
2. 端末B/C: `/friends` で `id` を入力 → 参加 → `lobby/:id`
3. LOBBY
   - Aのみに `[開始][解散]` が表示、B/Cは `[戻る]` のみ
   - Aが `[開始]` → `phase: INPUT` へ。`hostId` は null（state検証）
4. INPUT
   - 3端末で秘密を20グラフェム以内で送信
   - 二重送信不可（ボタンが「送信済み」）
   - タイムアップで REVEAL へ
5. REVEAL → DISCUSS → VOTE
   - DISCUSS: チャット送受信（shadowは本人のみ）/ 通報→トースト
   - VOTE: 自分の投票先がハイライト、全員投票で RESULT へ
6. RESULT
   - 「全員がもう一度」で再戦開始
   - Bが「全員終了」を押す → 全員メニューへ（abort: end）
7. LOBBY端ケース
   - A（ホスト）が LOBBY で離脱 → Bに `[開始]` が表示（最古参加者へ委譲）
   - Aが `[解散]` → 全員メニューへ（abort: disbanded）

### B. auto（同権・自動開始）
1. A/B/C: `/mode?type=random → ランダムでマッチ開始`
2. 3人揃うと自動で INPUT へ。`hostId` は常に null
3. 以後は friends と同じ進行（RESULT の意思決定も同権）

### C. ネガティブ/バリデーション
- LOBBYでホスト以外が `start` 送信 → `warn: NOT_HOST`
- LOBBYで `hostId=null`（auto/開始後）に `start` 送信 → `warn: INVALID_OP`
- INPUTで21グラフェムを送信 → `warn: TEXT_RANGE`
- DISCUSSで121グラフェムを送信 → `warn: CHAT_RANGE`
- `POST /rooms/:id/exists` 404 で `Friends` 参加時にアラート

### D. cURL 確認
- ヘルス: `curl -i http://localhost:8787/healthz`
- ルーム作成: `curl -s http://localhost:8787/rooms -X POST`
- ルーム存在: `curl -i http://localhost:8787/rooms/ABC123/exists`
- ランダム: `curl -s http://localhost:8787/auto -X POST`

# デザイン強化・実装指示（UI仕様 v5）

## 0) 共通デザイン指針
- 画面: 縦固定／セーフエリア対応（iOS/Android のノッチ/ホームインジケータを尊重）
- 背景: `bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,.35),transparent_50%),linear-gradient(180deg,#0b0f1a_0%,#111827_100%)]`
- カラー（Tailwind）: primary=violet、勝敗用 success=emerald / danger=rose、文字 slate-50~300
- 角丸: `rounded-2xl`（カード/ボタン）
- 影: `shadow-[0_8px_30px_rgba(0,0,0,.25)]`（カード）
- フォント階層（相対 / モバイル想定）: H1 28/36, H2 22/30, H3 18/26, Body 16/24, Caption 12/16
- アニメ: Framer Motion（`spring: { stiffness: 260, damping: 24 }`）
  - フェード/スライド、押下時 `scale=0.98`、トランジションは 180–240ms
- セーフタップ: 主要ボタンの高さ 48px、左右 16px 以上の余白
- BannerSlot: 高さ 56px（可変でも OK）、キーボード表示時は自動で非表示、blur 後 400ms で復帰
- 購入による非表示ロジック（`no_video_ads`=動画のみ非表示 / `ad_free_all`=全 OFF）を尊重
- タイマー: 切り上げ(ceil) 表示。TimerCircle（円弧プログレス＋中央に秒）を標準
- アバター: 用意済み 20 種を円形クリップ（44/56/72 の 3 サイズ）
- 通信中: 全画面 Modal に「通信中…」＋スピナー。完全同期まで遷移させない

## 1) 再利用コンポーネント（クラス方針）
- Screen: 背景＋セーフエリアラッパ（上下 `pb-[BannerHeight]` を自動調整）
- Panel: カード領域 `rounded-2xl bg-white/5 backdrop-blur-[6px] border border-white/10`
- HeaderBar: H1/H2＋TimerCircle（必要シーンのみ右寄せ表示）
- PrimaryBtn: `bg-primary-600 hover:bg-primary-500 text-white font-semibold rounded-2xl h-12`
- SecondaryBtn: `bg-white/10 hover:bg-white/15 text-white rounded-2xl h-12`
- DangerBtn: `bg-rose-600 hover:bg-rose-500 text-white rounded-2xl h-12`
- ListItem（選択可能）
  - 既定: `bg-white/5 border border-white/10 rounded-xl`
  - 選択時: `ring-2 ring-primary-400 bg-primary-400/10`
- Avatar: 円形 `rounded-full overflow-hidden object-cover`（既存の実装を使用）
- TimerCircle: CSS conic-gradient で円弧／中央に残り秒／下にラベル（例: 残り時間）
- Toast: 下部センター、3 秒。影・角丸統一。

## 2) 画面別 UI・レイアウト（表示順・ヒエラルキー）

### 2.1 Title（タイトル）
- 上: アプリ名（H1・グラデ文字）／サブ（Caption）
- 中央: PrimaryBtn「スタート」（すぐメニューへ）
- 下: BannerSlot("TITLE")
- モーション: 最初にロゴフェードイン → ボタンが上方向に 12px スライドイン

### 2.2 Menu（メニュー）
- H1「メニュー」
- グリッドカード（2 列 or 1 列）
  - 知り合いと遊ぶ（サブ: 8 人まで）
  - 知らない誰かと（サブ: 3 人で自動開始）
- 下段: ニックネーム設定（未設定なら赤いバッジ「未設定」＋遊ぶボタンは disabled）
- ユーティリティ: ルール説明（モーダル/スクロール可）、応援（課金）カード
- BannerSlot("MENU")

### 2.3 ModeSelect（モード）
- H1「モード選択」
- 4 カード（ListItem・アイコン＋説明 1 行）
- フッター: 戻る（Secondary）
- BannerSlot("MENU")

### 2.4 RoomCreateJoin（身内用）
- H1: 選択モード名
- 2 カラム縦積み
  - PrimaryBtn「ルーム作成」
  - ID 入力（6 桁英数字／自動大文字 / 正規表現 OK で参加ボタン活性）＋ SecondaryBtn「参加」
- 下: BannerSlot("MENU")
- エラーはトースト（「ルームが見つかりません」）

### 2.5 Lobby（身内待機）
- 上段: ルーム ID＋[コピー]（小ボタン / トースト「コピーしました」）
- 中段: 参加者リスト（Avatar(44)＋ニック、最大 8 人・スクロール）
- ホストのみ: PrimaryBtn「開始」＋ DangerBtn「解散」
- 参加者のみ: SecondaryBtn「戻る」
- BannerSlot("LOBBY")
- auto ではこの画面は表示しない（別モーダルで人数揃い→自動開始）

### 2.6 Input（秘密入力）
- HeaderBar: H1「秘密入力」＋右に TimerCircle（30s）
- Panel
  - お題（H3、2 行まで）
  - テキストエリア（20 グラフェムカウント、プレースホルダ／改行不可、入力で残字数表示）
  - PrimaryBtn「決定」（送信後は非表示）
  - 注意書き Caption（「個人情報は書かないでね」）
  - 下: 心得ボックス（SecondaryCard）※任意
- BannerSlot("INPUT")（キーボード表示で自動隠し）
- 入力状態の色
  - 空: `border-white/20`
  - 入力あり: `border-primary-400`（フォーカス時）
  - エラー: `border-rose-400`

### 2.7 Reveal（秘密発表）
- 全画面 Panel 内で 3 段フェードイン（1s→5s→2s のテンポに合わせて）
  1. 台詞 1「おやおや…」(Caption)
  2. 秘密（大ラベル・カード風）
  3. 台詞 2「これは一体誰の秘密だろう」（Caption）
- バナー非表示
- 自動で DISCUSS へ（クライアント遷移は phase 受信で）

### 2.8 Discuss（議論）
- HeaderBar: H1「議論」＋右 TimerCircle(人数×15s)
- 上段 Panel: 公開された秘密（H3、2 行まで、省略時は…）
- 中段: チャット
  - 左右吹き出し（自分=右/primary、他人=左/gray）
  - 各行 Avatar(40)＋ニック（Caption）＋本文（Body）
  - スクロールは最下に自動追従（送信直後だけ）
- 下段
  - TextField＋Send（DISCUSS 中のみ活性）
  - DangerBtn「議論終了」（押下→ボタン非表示）
  - 補助文（Caption）: 過半数が押すか制限時間で自動終了
- BannerSlot("DISCUSS")（キーボード時に隠す）

### 2.9 Vote（投票）
- HeaderBar: H1「投票」＋右 TimerCircle(10s)
- 上段 Panel: 公開された秘密
- 下段 Panel: 候補リスト（自分以外）
- ListItem 選択でチェックアイコン表示
- 決定は PrimaryBtn。送信後は非表示
- バナー非表示

### 2.10 Judge（判定演出）
- 中央: 小ラベル「判定は…」
- Panel
  - 公開された秘密
  - 最多投票者（アイコン＋ニック／同票なら「同票のため選択無効」）
- 演出 ~2s、バナー非表示 → RESULT

### 2.11 Result（結果発表）
- 上: 公開された秘密
- 中央
  - 「これは 〇〇 の秘密でした」 or 同票時は表示なし
  - 勝敗バッジ
    - 市民勝ち → `bg-emerald-500 text-white`
    - 人狼勝ち（同票含む）→ `bg-rose-500 text-white`
- 下: 投票結果（スクロール）
  - Avatar(32)＋「ニック　X 票」
  - 最後に必ず「投票なし {noneCount} 票」
- フッター: PrimaryBtn「もう一度」（全員押したら再戦）／DangerBtn「終了」（誰か 1 人で終了）
- BannerSlot("RESULT")

## 3) マイクロインタラクション / アクセシビリティ
- フォーカスリング: `focus-visible:ring-2 ring-primary-400`
- エラー文言は簡潔に日本語／色＋アイコン（⚠️）併用
- ハプティクス（任意）
  - 決定/投票成功: 軽い impactLight
  - 終了/中断: notificationWarning
- スクロール復帰: 各シーン入場時にチャット/リストは最上/最下へ適切に移動
- "押したのに反映されない"防止: 送信直後にボタン隠す（サーバ確定後に UI 再構築）

## 4) レイアウト寸法（目安）
- コンテンツ最大幅: `min(560px, 100vw)`（タブレットでも横伸びしすぎない）
- パネル内パディング: 16–20px
- リストアイテム高さ: 56px
- 入力欄高さ: 120px（単行でもよいが、指タップに十分）

## 5) 表示文言（統一）
- Timer 下ラベル: 「残り時間」
- Discuss 補助: 「過半数が『議論終了』を押すか、制限時間で自動終了します」
- Judge 同票: 「同票のため選択無効」
- Result 勝敗: 「市民の勝ち」 / 「人狼の勝ち」
- コピー成功: 「コピーしました」
- Room 参加エラー: 「ルームが見つかりません」

## 6) QA チェック（デザイン観点）
- タイマーは ceil で 1→0 になる瞬間のみ 0 表示
- 送信後はボタンが消える（多重送信防止）
- BannerSlot がキーボード表示で隠れ、blur 後 400ms で復帰
- auto は LOBBY を表示しない（3 人揃いモーダルのみ）
- Result の投票一覧に必ず「投票なし」がある
- すべてのアバターが円形で切り抜かれている
- `hostId` がゲーム中は null（UI にホスト痕跡なし）
- すべての画面にセーフエリア反映（下部ボタンとバナーが被らない）

## 7) 実装メモ（Cursor 向け）
- すべてサーバの phase 受信後に画面レンダリング／TimerCircle 開始
- 画面切替時は状態リセット API（前ターンで共有した `uiResetForPhaseChange`/`uiResetForNewRound`）を呼ぶ
- チャットは仮想化不要（最大件数低）だが、スクロールは自動で末尾追従
- 画像は `import.meta.url` 経由の `new URL()` で解決（Vite）
- Framer Motion: 大きなカードに `initial={{ y:12, opacity:0 }} animate={{ y:0, opacity:1 }} transition={{ type:"spring", stiffness:260, damping:24 }}`
