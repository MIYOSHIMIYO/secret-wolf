### 未確定事項・質問

- **Node / pnpm のバージョン**: 想定バージョンは？（例: Node LTS / pnpm 9系 など）
- **ESLint ルールセット**: ベース（`@typescript-eslint`系など）や整形ポリシーは？
- **Prettier 設定**: セミコロン・クォート・幅などの好みは？ Tailwind 用プラグインの使用有無？
- **TypeScript の共通設定**: ルートの TS 設定の基本方針（`target`, `module`, `moduleResolution`, 路径 alias 等）は？
- **Vite 設定**: React SWC プラグイン使用可否／基本ポート／`base` 設定は？
- **Capacitor**: iOS/Android の最小対応 OS バージョンやパッケージ ID、アプリアイコンなどネイティブ側設定は？
- **Tailwind**: デザイン体系（カラートークン、フォント、ブレークポイント）、プラグインの使用有無は？
- **ディレクトリ命名・import パス alias**: 例 `@shared/*`, `@client/*`, `@worker/*` のような alias を導入するか？
- **Wrangler バージョン**: 想定する `wrangler` のメジャー（v3 など）と Miniflare 併用有無？
- **Durable Object**: マイグレーション名の命名規約、リージョン、スケーリング方針は？
- **KV のネームスペース**: `MOD_KV` のステージ別（dev/prod）命名、TTL 方針は？
- **環境変数管理**: dev/prod のシークレット、ビルド時注入の扱いは？
- **WebSocket 仕様**: エンドポイント、プロトコル（JSON スキーマ）、再接続戦略、心拍（ping/pong）等の方針は？
- **CI/CD**: 必要性とツール（GitHub Actions など）の希望有無？
- **ライセンス / リポジトリ可視性**: OSS / Private の方針は？

（注）この段階では仕様は追加しません。上記は確認が必要な「未定点」の列挙のみです。 

### 追加の未確定事項（shared 型/プロトコル）

- **Player.iconId**: 取り得る値の範囲や体系は？（整数/プリセット名など）
- **RoomState.endsAt**: 時刻の表現は？（UNIX ms / ISO 文字列）
- **RoundState.submissions**: データ構造の詳細は？（例: `{ [ownerId]: text }` or 配列 or オブジェクト配列）
- **RoundState.tally**: 票集計の型は？（例: `Record<targetId, number>`）
- **Votes のキー/値**: `playerId`/`targetId` の未接続プレイヤーや退出者の扱いは？ `"NONE"` は常に許可？
- **WebSocket payload `p`**: 各メッセージ種別ごとの厳密なスキーマは？（`join`, `auto`, `start`, `submitSecret`, `endDiscuss`, `vote`, `chat`, `report`, `requestState`, `leave` / `state`, `phase`, `chat`, `discussProgress`, `abort`, `warn`, `reportAck`）
- **エラー/警告規約**: `abort`/`warn` の理由コードや文言は定義するか？
- **レート制限/連投抑止**: `chat`/`report` の間隔やサーバ側の制限は？
- **再接続戦略**: `reconnectWindowMs` 内での識別と再入室判定の仕様は？
- **graphemeLength**: 仕様上の正規化（NFC/NFKC）や改行・サロゲート対の扱いは？ 

### 追加の未確定事項（お題/固定コピー）

- **お題の所有場所**: `packages/worker/src/prompts.ts` に配置するが、クライアントや shared へも配布が必要か？（重複回避のための共有場所は？）
- **提示ロジック**: お題の出題順は固定/ランダム/重複回避あり？ 1ラウンドに1つか、複数提示か？
- **モード切替**: `Mode` とお題配列の対応は上記で固定と見做してよいか？ `NONE` は常に「自由に秘密を書いてください」のみか？
- **固定コピーの設置先**: どのパッケージで定義/参照するか？（UI/サーバでの使用箇所）
- **多言語対応**: 将来的な i18n を想定するか？ 文字列キー化の要否？
- **文字列の厳密性**: 表記揺れや句読点、全角/半角スペース・タブを含めて「そのまま」扱いで確定か？ 

### 追加の未確定事項（DO ルーム権威サーバ）

- **roomState のスナップショット頻度**: フェーズ遷移時／イベント毎／一定間隔のいずれか？
- **`state` 送信の粒度**: 差分と全体のどちらを基本とするか？差分の定義は？
- **`endsAt` の単位**: UNIX ms と見做してよいか？タイムゾーンの扱いは？
- **ランダム公開者の選定**: 候補に含める条件（未提出者／直前公開者の除外以外の条件）は？
- **過半数の定義**: `endDiscuss` の過半数判定は小数点切り上げか？対象母数は「接続中のみ」か？
- **`auto` マッチング**: キューのタイムアウト／モード別キュー分割の有無、同時到着の分配ルールは？
- **`installId`**: 生成元・永続性（端末固有か、アプリ再インストールで変化するか）と重複時の扱いは？
- **ホスト判定**: 「身内ホスト」の定義と認可方法（`hostId` との連携）
- **`submitSecret` の自動文言**: 未入力時の置換文字列の具体値は？
- **`vote`**: 同票時の処理（サーバ側の確定ロジック）と `"同票のため選択は無効です"` との連携は？
- **`chat`**: `shadow` フラグの付与条件と可視範囲、レート制限は？
- **`report`**: `RANDOM`/`FRIENDS` の定義、`messageId` の採番規則、`MOD_KV` との連携仕様は？
- **再接続**: `requestState` で返す範囲（全体/差分）と、再接続ウィンドウ超過時の扱いは？
- **3人未満検知**: `leave`／切断のどちらでカウントダウンするか、復帰猶予はあるか？
- **アラーム**: Alarms の再設定条件（フェーズ跨ぎ／延長）と遅延時の補正（elapsedMs の算出方法）は？ 

### 追加の未確定事項（自動通報 / moderation）

- **pepper**: 由来・保管場所（Wrangler シークレット？）とローテーション方針は？
- **uidOrDevice**: 具体的に何を指すか？端末固有 ID / アカウント ID / Install ごとの ID？
- **ハッシュ実装**: `SHA256` の実装手段（Workers での標準 API 利用か）とエンコード方式（hex/base64）は？
- **レベル2の過半数**: 母数は「当該卓の有効プレイヤー数」か？切断者/シャドウ対象を含むか？判定タイミングは？
- **レベル3の集計窓**: 「7日ローリング」の区切り（UTC起点/ローカル）とユニーク日の定義は？
- **ユニーク条件**: 「ユニーク通報者 R」「ユニーク対戦相手 U」の同定方法（`accountFingerprint` 基準でよいか）と重複排除の期間は？
- **24h に 1 回まで**: 同一報告者→同一対象の再通報制限は固定 24h（スライド）か、日単位か？
- **FRIENDS の扱い**: グローバル集計完全除外で確定か？（レベル1/2のみ適用）
- **ローカル非表示/シャドウミュートの範囲**: 過去メッセージに遡及するか？ストリーム配信のみ抑止か？
- **KV 構造**: `Set` 表現の具体（配列 + 去重/ハッシュ化）、圧縮方式、TTL 値（キーごと？項目ごと？）は？
- **`lastBanUntil`**: 単位（epoch ms?）と延長の扱い（上書き/最大化）、既存 Ban 中の再評価は？
- **故障時挙動**: KV 書込/読込失敗時のフォールバック（安全側に倒す/許容）とリトライ方針は？
- **クライアント 90日保持**: `targetFingerprint` の保存先（Secure Storage等）と送信/マッチング除外の具体は？ 

### 追加の未確定事項（HTTP ルータ / wrangler）

- **`POST /auto` のキュー**: 実装場所（`RoomDO` 内／別 DO／KV など）と永続性・スケール方針は？
- **WebSocket upgrade**: `/ws/room/:roomId` のハンドシェイク仕様（サブプロトコル・認証ヘッダ有無）は？
- **CORS / 認証 / 制限**: `POST /auto` の CORS 設定、認証の有無、レート制限は？
- **`/healthz`**: 単純 200 で十分か、依存（KV/DO）疎通チェックも含めるか？
- **wrangler dev/proxy**: 具体の dev 設定（WS 対応、ポート、`--local` の要否）と Vite との同時起動連携は？
- **本番 KV namespace**: 本番 ID の値と dev/prod の切替方法（`--env` 等）は？
- **API パス設計**: base path や将来のバージョニング（例 `/v1`）の要否は？ 

### 追加の未確定事項（クライアント）

- **installId**: 生成元（端末/アプリ）と保存先（Secure Storage 等）、再インストール時の扱いは？
- **ルーティング遷移**: 各フェーズからの遷移ガード（直接 URL 参照の可否）や `/friends` の機能詳細は？
- **再接続戦略**: WebSocket 自動再接続の間隔・最大回数・ジッタ、`requestState` 送信のタイミングは？
- **チャット UI**: `shadow` メッセージの表示ポリシー（本人のみに表示するか）とハイライト有無は？
- **TimerCircle**: `endsAt` の同期ズレ補正（ドリフト許容）や一時停止の扱いは？
- **BannerSlot**: 掲載面の実体（広告/告知）・ロードタイミング・頻度制御は？
- **キーボード検出**: Web/Capacitor 双方での検出方法と 400ms 復帰のトリガ（`blur` 以外の対応）は？
- **動画広告**: プロバイダ、実装箇所、120 秒クールダウンの管理（クライアント/サーバどちらで持つか）、購入権限 `entitlements` の取得方法は？
- **ニックネーム/秘密入力**: グラフェムカウントは `shared` の `graphemeLength` を利用するか？入力時のバリデーションタイミングは？
- **縦固定**: iOS/Android の回転ロック設定（Capacitor 設定）とノッチ/セーフエリア対応は？
- **アイコン**: `iconId` の選択 UI とプリセットの有無（サーバのユニーク割当とどう整合するか）
- **`autoRequeueOnAbort`**: 既定値と UI の配置（トグル）および `lastMode` の保持先は？
- **`/lobby/:id`**: ディープリンクからの直接参加や共有リンクの仕様は？
- **レート制限なしの確認**: `DISCUSS` の `ChatInput` は本当に制限なしで確定か？（誤操作・スパム耐性） 

### 追加の未確定事項（広告 / 課金）

- **AdMob 設定**: iOS/Android の広告ユニット ID、テストモード、COPPA/TFUA の指定は？
- **Banner の配置**: `BannerSlot(place)` と `AdProvider.showBanner(place)` の責務分離（どちらが表示トリガか）とレイアウト（固定位置/安全領域対応）は？
- **キーボード干渉**: バナーの自動非表示と復帰タイミング（`BannerSlot` の規約との整合）は？
- **インタースティシャルのガード**: `setCooldownMs(120000)` の保持先（メモリ/永続化）とアプリ再起動時の扱い、`reason` 別のクールダウン分離有無は？
- **Entitlements の適用範囲**: `no_video_ads` はインタースティシャルのみ抑止で確定か？ `ad_free_all` でバナーも完全非表示で確定か？
- **RevenueCat 設定**: API Key/Project/App 設定、プロダクト ID（`no_video_ads`, `ad_free_all`, `upgrade_ad_free` の SKU）とオファリングの紐付けは？
- **価格表記**: 通貨・地域による価格差の扱い（ローカライズ）と UI 文言の切替は？
- **購入/復元フロー**: どの画面に導線を置くか、復元の成否通知、購入成功後の `entitlements` 反映タイミングは？
- **アップグレード**: 既に `no_video_ads` 保有時の `upgrade_ad_free` の購入導線と重複購入防止は？
- **審査配慮**: ストア審査上の表示（年齢区分/プライバシー/トラッキング同意）と広告表示の頻度基準は？ 

### 追加の未確定事項（env / 実行手順）

- **VITE_WORKER_WS**: dev/prod での値は？ ローカル開発時は `ws://localhost:<port>` か、`wrangler dev` のリモート URL を使用するか？
- **RevenueCat API Key**: iOS/Android のキー管理（.env or Capacitor 設定）と dev/prod 切替は？
- **AdMob App ID**: テスト用/本番用の分離、テストデバイス設定は？
- **PEPPER_SECRET**: `wrangler secret put` 等での設定手順、dev/prod での値の分離は？
- **.env の読込範囲**: Vite 側のみ `.env` を読み、Workers 側は Wrangler の環境に依存する前提で確定か？
- **Capacitor 配布**: iOS/Android それぞれのビルド・署名・配布フロー（必要なコマンドや手順の粒度）は？
- **ドキュメント配置**: 実行手順は README にも重複掲載するか？ どのファイルを正とするか？ 

### 追加の未確定事項（ゲーム詳細）

- **TimerCircle.label**: 表示文言の書式（整数秒切り上げ/切り捨て、小数表示の有無）と `endsAt` 起点の補正は？
- **人数揃いモーダル**: 表示タイミング・文言・自動 Close の有無は？
- **Android 戻る**: 確認モーダルの正確な文言とキャンセル時の挙動（残留/最小化）
- **[もう一度] のリセット範囲**: 「アイコン以外をリセット」で確定だが、`nick`/`id`/`installId`/`entitlements` 等の保持・再生成の境界は？
- **投票一覧の並び順**: `tally.counts` の表示順（降順/参加順）と同票時の並び規則は？
- **チャット入力 120 字**: サーバ側の厳密バリデーション（`chatMax=120`）と超過時の UI フィードバックは？
- **Input 未提出の自動文言**: 文字列「時間切れで入力できず、ごめんなさい」の厳密な固定と i18n の扱いは？
- **Room 作成/存在確認**: API の実体（`/ws/room/:id` 以外に HTTP で用意するか）とエラーコード仕様は？
- **Discuss 終了過半数**: 母数の対象（接続中のみ/全員）と丸め（`ceil`）の最終確定は？
- **Reveal の演出**: 各段の表示時間/スキップ可否は？ 

### 解消済み（今回の回答で確定）
- `installId`：初回起動時に UUIDv4 生成、Capacitor Preferences に保存（再インストールで更新）
- Discuss 過半数：母数は接続中プレイヤー、`ceil` 判定
- `iconId`：0〜19（20 種類のアイコンをプロジェクト同梱／ルーム内ユニーク）
- Sentry：導入しない
- Node/pnpm/Wrangler：Node 20.x、pnpm 9、Wrangler v3
- ESLint/Prettier：`@typescript-eslint/recommended` + import 並び替え、Prettier 設定（`semi: true`, `singleQuote: false`, `printWidth: 100`, `trailingComma: "all"`、Tailwind plugin）
- Vite：5173 / React SWC / base: "/"
- AdMob/RevenueCat：開発中はプレースホルダ・テスト ID、リリース直前に差替
- ドメイン：当面 `*.workers.dev`
- プライバシーポリシー：GitHub Pages で雛形を公開（差し替え可）
- Cloudflare：有料プラン + 使用量アラート設定 

### 解消済み（今回の回答で追加・続き）
- WebSocket Zod スキーマ一式（C2S/S2C）が確定（本要件に掲載の定義どおり）
- 画面仕様の最終確認：Judge/Result/RoomCreateJoin の挙動・表示内容を確定

### 解消済み（今回の回答で追加・続き3）
- ニックネーム衝突: ベース名8グラフェム、重複時は `#2` 以降を付与（ベース切詰めなし）。表示名が8超でも可。衝突判定はベース名。クライアントへは表示名のみ送信
- Avatar 画像: `packages/client/src/assets/avatars/00.png`〜`19.png`（512×512 PNG）に配置、円形クリップ・`object-cover`
- PostCSS: `tailwindcss` と `autoprefixer` のみ
- CORS(prod): 許可オリジンに `capacitor://localhost`、dev は `*`
- Discuss `needed`: 接続人数に基づく `ceil` をリアルタイム更新
- Vote 離脱: 既投票は有効、未投票離脱は締切後 `"NONE"`
- Moderation レベル1: 過去へ遡及して非表示＋以降抑止。`reportAck` で再フィルタ
- `/auto` のレート制限: IP 30 req/min に確定
- RevenueCat SKU: 現在は仮 ID（`no_video_ads`, `ad_free_all`, `upgrade_ad_free`）を使用し、後で差替
- 言語: アプリ内は日本語のみ（i18n なし）

### 解消済み（今回の回答で追加・続き4）
- 定員/入室: auto=3 固定即開始、friends=3〜8、途中参加不可（30s 以内の再接続は復帰）
- アイコン: 未使用からランダム、[もう一度] は同一ルーム内で維持／新規ルームで再抽選
- ホスト: friends=作成者固定、auto=無し、[もう一度] でも維持
- お題: ルーム×モードごとのシャッフルバッグ（未出題優先→尽きたら再シャッフル）
- KV/ban: TTL 7 日（UTC）、banUntil は max 更新
- warn.msg: サーバ側で日本語定型文を付与
- チャット履歴: RESULT 遷移時にクリア（持ち越しなし）
- /auto レート制限: 429＋日本語メッセージ、`Retry-After` 秒数付与、JSON `{ error, retryAfter }`
- CORS(prod): `capacitor://localhost` のみ許可（配列で拡張可能）。dev は `*`
- DO 終了: LOBBY 全離脱 or RESULT 全退出で初期化し GC に任せる
- 投票一覧: 票数降順 → 同数はルーム join 順

### 解消済み（今回の回答で追加・続き5）
- ラウンド/フェーズ識別: `roundId` と `phaseSeq` を導入し、S2C `phase` に含めて送信
- クライアント UI リセット: `uiResetForNewRound`/`uiResetForPhaseChange`/`uiResetOnLeaveOrAbort` と呼び出し規約を確定
- 画面遷移は S2C `phase` 受信後のみ実施（カウントダウン 0 でも画面は変えない）

### 追加の未確定事項（wrangler まわり）
- dev/prod 以外の環境（staging 等）の要否は？必要なら命名と KV/DO の分岐をどうするか？

### 追加の未確定事項（Capacitor / installId / アバター）

- **アプリ名のローカライズ**: `capacitor.config.ts` の `appName` は日本語固定で問題ないか？（英語表示名は各プラットフォームのローカライズで別途設定するか）
- **アバター画像の配置場所**: 20 枚の `00.png`〜`19.png` をどのディレクトリに置くか（例：モジュール隣接 or `src/assets/avatars`）。
- **installId の取得タイミング**: アプリ初期化のどの段階で取得するか（スプラッシュ前/初回画面表示前など）。 

### 追加の未確定事項（Tailwind / WS 心拍 / CI）

- **Tailwind 配置**: `tailwind.config.ts` の設置場所は `packages/client/` 直下で確定か？ PostCSS 設定（`@tailwindcss`系プラグイン追加の有無）は？
- **WS ping/pong**: `t: "ping"/"pong"` をプロトコル型（zod スキーマ）に追加するか？ サーバ側の pong 応答の有無とタイムアウト検出の扱いは？
- **再接続ポリシー**: バックオフ上限 15s で確定か？ジッタ付与/最大回数は必要か？
- **Actions の env 名**: `--env dev` / `--env prod` を `wrangler.toml` の `env.dev` / `env.prod` セクションとして用意する前提で確定か？
- **Actions のフィルタ**: `pnpm --filter packages/worker` の動作前提（モノレポ構成時）で確定か？ 追加のビルド手順は不要か？ 

### 実装前に確定したい事項（最新）

- プロトコル / 型
  - Client→Server / Server→Client の各 `t` の `p` 厳密スキーマ（必須/任意/制約）を確定ください
    - C→S: `join`, `auto`, `start`, `submitSecret`, `endDiscuss`, `vote`, `chat`, `report`, `requestState`, `leave`
    - S→C: `state`, `phase`, `chat`, `discussProgress`, `abort`, `warn`, `reportAck`
  - `RoundState.submissions` 形式: A) `Record<ownerId, text>` / B) `{ ownerId, text }[]` / C) 他
  - `RoundState.tally` 型: A) `Record<targetId, number>` / B) `{ targetId, count }[]` / C) 他
  - `endsAt` を UNIX ms(number) で確定して良いか？
  - `graphemeLength` の正規化: A) なし / B) NFC / C) NFKC
  - ping/pong をプロトコルに含めるか？ A) `t:"ping"`→サーバは `t:"pong"` 返信 / B) クライアント送信のみ（サーバ応答なし）

- Worker / Durable Object
  - `state` 送信の粒度: A) 全体 / B) 差分 / C) 初回のみ全体→以降差分
  - ランダム公開者候補: 直前公開者以外に「未提出者を除外/含む」どちら？
  - `auto` キューの保持と期限: A) 同 DO メモリ / B) 別 DO / C) KV、タイムアウトは何秒？
  - ルーム作成 API: `RoomCreateJoin` の「サーバへ作成要求」は HTTP を追加するか？
    - A) `POST /rooms`（新ID払い出し） / B) 既存の WS `join` に新規作成フラグを追加 / C) 他

- Moderation（自動通報）
  - `pepper` は `wrangler secret put PEPPER_SECRET` で確定？
  - ハッシュ出力形式: A) hex / B) base64
  - レベル2の過半数母数: Discuss と同じ「接続中 `ceil`」で確定？
  - `report.messageId`