import { nanoid } from "nanoid/non-secure";
import { S2C, C2S, RoomStateZ } from "@secret/shared/src/gameTypes";
import { PROMPTS } from "../../shared/src/prompts";
import { ROOM_CAPACITY } from "@secret/shared/src/constants";
import { globalMonitor } from "./monitoring.js";

// ニックネーム重複時のサフィックス付与処理
function generateUniqueNickname(baseNick: string, existingNicks: string[]): string {
  // 最大8グラフェムに制限
  const maxGraphemes = 8;
  const truncatedNick = baseNick.slice(0, maxGraphemes);
  
  // 既存のニックネームからベース部分を抽出
  const existingBases = existingNicks.map(nick => {
    const match = nick.match(/^(.+?)(?:#(\d+))?$/);
    return match ? match[1] : nick;
  });
  
  // ベース部分が一致する場合、サフィックスを付与
  if (existingBases.includes(truncatedNick)) {
    let counter = 2;
    let newNick = `${truncatedNick}#${counter}`;
    
    while (existingNicks.includes(newNick)) {
      counter++;
      newNick = `${truncatedNick}#${counter}`;
    }
    
    return newNick;
  }
  
  return truncatedNick;
}

// ルームが満員かどうかをチェックするヘルパー関数
function isRoomFull(roomState: any): boolean {
  return roomState.players.length >= ROOM_CAPACITY;
}

export class RoomDO implements DurableObject {
  state: DurableObjectState;
  env: Env;
  clients: Map<string, WebSocket> = new Map();
  clientToPlayerId: Map<string, string> = new Map();
  roomState: any;
  roomId: string;
  private rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.roomId = state.id.name;
        this.roomState = {
          roomId: this.roomId,
          mode: "NONE",
          players: [] as Array<any>,
          hostId: undefined as string | undefined,
          phase: "LOBBY",
          endsAt: Date.now(),
          round: { 
            prompt: "", 
            secretOwner: "", 
            submissions: {}, 
            votes: {},
            secretText: ""
          },
          roundId: nanoid(),
          phaseSeq: 0,
          chat: [],
          modeStamps: {} as Record<string, number>, // モードスタンプの集計
          isAutoRoom: false, // 知らない誰かと遊ぶかどうか
          isCustomMode: false, // カスタムモードかどうか
          customTopics: [] as string[], // カスタムお題リスト
          iconInUse: [] as number[], // 使用中のアイコンID（配列形式）
          lastActivityAt: Date.now(), // 最後のアクティビティ時刻
          createdAt: Date.now(), // ルーム作成時刻
        };
    
    // アイドルタイムアウト（3分）とマッチ上限時間（30分）のアラームを設定
    this.state.storage.setAlarm(Date.now() + 3 * 60 * 1000); // 3分後
    this.state.storage.setAlarm(Date.now() + 30 * 60 * 1000); // 30分後
  }

  // レート制限チェック
  private checkRateLimit(clientId: string, endpoint: string): { allowed: boolean; retryAfter?: number } {
    const isProduction = this.env.ENVIRONMENT === "production";
    
    if (!isProduction) {
      return { allowed: true };
    }
    
    const now = Date.now();
    const key = `${clientId}:${endpoint}`;
    const limit = this.rateLimitStore.get(key);
    
    let maxRequests: number;
    let windowMs: number;
    
    if (endpoint === "report") {
      maxRequests = 60;
      windowMs = 5 * 60 * 1000; // 5分
    } else {
      return { allowed: true };
    }
    
    if (!limit || now > limit.resetTime) {
      this.rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return { allowed: true };
    }
    
    if (limit.count >= maxRequests) {
      const retryAfter = Math.ceil((limit.resetTime - now) / 1000);
      return { allowed: false, retryAfter };
    }
    
    limit.count++;
    return { allowed: true };
  }

  async fetch(request: Request) {
    const url = new URL(request.url);
    if (request.headers.get("upgrade") === "websocket") {
      try {
        const seg = url.pathname.split("/");
        const rid = seg[seg.length - 1] || "";
        if (rid) {
          this.roomState.roomId = String(rid).toUpperCase();
          
          try {
            const flagsData = await this.env.MOD_KV.get(`flags:${this.roomState.roomId}`);
            if (flagsData) {
              const flags = JSON.parse(flagsData);
              this.roomState.isAutoRoom = flags.isAutoRoom || false;
              console.log(`[fetch] ルーム ${this.roomState.roomId} のisAutoRoomフラグ: ${this.roomState.isAutoRoom}`);
            } else {
              // フラグが設定されていない場合は知り合いモード（false）として扱う
              this.roomState.isAutoRoom = false;
              console.log(`[fetch] ルーム ${this.roomState.roomId} のフラグが未設定のため、知り合いモードとして設定`);
            }
          } catch (error) {
            console.warn(`[fetch] isAutoRoomフラグの確認に失敗:`, error);
            // エラーの場合も知り合いモード（false）として扱う
            this.roomState.isAutoRoom = false;
          }
        }
      } catch {}

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      (server as WebSocket).accept();
      const clientId = nanoid();
      this.clients.set(clientId, server as WebSocket);
      
      // 監視データの記録
      globalMonitor.recordConnection(this.roomId, this.clients.size);
      
      (server as WebSocket).addEventListener("message", (ev) => this.onMessage(clientId, ev));
      (server as WebSocket).addEventListener("close", () => this.onClose(clientId));
      return new Response(null, { status: 101, webSocket: client as unknown as WebSocket });
    }
    if (url.pathname === "/state") {
      return Response.json(this.roomState);
    }
    return new Response("Not found", { status: 404 });
  }

  async alarm() {
    const now = Date.now();
    
    // アイドルタイムアウトチェック（3分）
    const idleTimeout = 3 * 60 * 1000;
    if (this.roomState.lastActivityAt && (now - this.roomState.lastActivityAt) > idleTimeout) {
      console.log(`[alarm] アイドルタイムアウト（3分）によりルームを終了します`);
      this.broadcast({ t: "abort", p: { reason: "idle_timeout" } });
      this.deleteRoomCompletely();
      return;
    }
    
    // マッチ上限時間チェック（30分）
    const matchTimeout = 30 * 60 * 1000;
    if (this.roomState.createdAt && (now - this.roomState.createdAt) > matchTimeout) {
      console.log(`[alarm] マッチ上限時間（30分）によりルームを終了します`);
      this.broadcast({ t: "abort", p: { reason: "match_timeout" } });
      this.deleteRoomCompletely();
      return;
    }
    
    if (now < (this.roomState.endsAt ?? 0)) return;

    console.log(`[alarm] フェーズ ${this.roomState.phase} の処理を実行します。現在時刻: ${now}, 期限: ${this.roomState.endsAt}`);

    if (this.roomState.phase === "READY") {
      console.log(`[alarm] READYフェーズからINPUTフェーズに移行`);
      this.startGame();
      return;
    }
    if (this.roomState.phase === "INPUT") {
      console.log(`[alarm] INPUTフェーズからREVEALフェーズに移行`);
      
      // 時間切れで未入力のプレイヤーに「時間切れで入力できず、ごめんなさい」を設定
      const activePlayers = this.roomState.players.filter((p: any) => p.connected);
      activePlayers.forEach((player: any) => {
        if (!this.roomState.round.submissions[player.id]) {
          this.roomState.round.submissions[player.id] = "時間切れで入力できず、ごめんなさい";
          console.log(`[alarm] プレイヤー ${player.id} (${player.nick}) に時間切れメッセージを設定`);
        }
      });
      
      this.goReveal(); 
      return;
    }
    if (this.roomState.phase === "REVEAL") {
      console.log(`[alarm] REVEALフェーズの処理を実行`);
      this.goDiscuss(); 
      return;
    }
    if (this.roomState.phase === "DISCUSS") { 
      console.log(`[alarm] DISCUSSフェーズからVOTEフェーズに移行`);
      this.goVote(); 
      return; 
    }
    if (this.roomState.phase === "VOTE") { 
      console.log(`[alarm] VOTEフェーズからJUDGEフェーズに移行`);
      
      // 時間切れで未投票のプレイヤーに「投票なし」を設定
      const activePlayers = this.roomState.players.filter((p: any) => p.connected);
      activePlayers.forEach((player: any) => {
        if (!this.roomState.round.votes[player.id]) {
          this.roomState.round.votes[player.id] = "NONE";
          console.log(`[alarm] プレイヤー ${player.id} (${player.nick}) に「投票なし」を設定`);
        }
      });
      
      this.goJudge(); 
      return; 
    }
    
    // JUDGEフェーズの処理はクライアント側の画面遷移に依存するため、サーバー側では何もしない
    
    // RESULTフェーズで7秒経過したら強制終了処理を実行
    if (this.roomState.phase === "RESULT" && this.roomState.isAutoRoom) {
      console.log(`[alarm] RESULTフェーズで7秒経過、知らない誰かとの強制終了を実行します`);
      this.executeAutoEnd();
      return; 
    }
  }

  private onClose(clientId: string) {
    const pid = this.clientToPlayerId.get(clientId);
    if (!pid) return;

    const player = this.roomState.players.find((p: any) => p.id === pid);
    if (player) {
      player.connected = false;
      player.disconnectedAt = Date.now();
      console.log(`[onClose] プレイヤー ${pid} (${player.nick}) が切断しました`);
    }

    this.clients.delete(clientId);
    this.clientToPlayerId.delete(clientId);

    if (this.roomState.phase !== "LOBBY") {
      // READYフェーズ中は3人未満になった場合のみ中断
      if (this.roomState.phase === "READY" && this.roomState.players.length <= 2) {
        console.log(`[onClose] READYフェーズ中に3人未満になったため、ルームを中断します`);
        this.broadcast({ t: "abort", p: { reason: "insufficient_players" } });
        
        setTimeout(() => {
          this.deleteRoomCompletely();
        }, 1000);
        return;
      }
      
      // ゲーム開始後（INPUTフェーズ以降）は中断
      if (this.roomState.phase !== "READY") {
        console.log(`[onClose] ゲーム開始後の切断のため、ルームを中断します`);
        this.broadcast({ t: "abort", p: { reason: "player_disconnected" } });
        
        setTimeout(() => {
          this.deleteRoomCompletely();
        }, 1000);
        return;
      }
    }

    // LOBBY 中は明示的にプレイヤーをリストから取り除き、iconId を解放
    {
      const idx = this.roomState.players.findIndex((p: any) => p.id === pid);
      if (idx >= 0) {
        const pl = this.roomState.players[idx];
        if (pl?.iconId) {
          const iconIndex = this.roomState.iconInUse.indexOf(pl.iconId);
          if (iconIndex > -1) {
            this.roomState.iconInUse.splice(iconIndex, 1);
          }
          console.log(`[onClose] アイコンID ${pl.iconId} を解放しました`);
        }
        this.roomState.players.splice(idx, 1);
        console.log(`[onClose] プレイヤー ${pid} をプレイヤーリストから削除しました。残り: ${this.roomState.players.length}人`);
      }
    }


    this.broadcastState();
  }

  private async onMessage(clientId: string, ev: MessageEvent) {
    console.log(`[onMessage] Raw message received from clientId=${clientId}:`, ev.data);
    
    try {
      const data = JSON.parse(ev.data as string);
      const { t, p } = data as any;
      
      console.log(`[onMessage] Parsed message type: ${t}, payload:`, p);
      
      // 監視データの記録
      globalMonitor.recordMessage(this.roomId);

      if (t === "join") {
        let id = this.clientToPlayerId.get(clientId);
        console.log(`[Join] joinメッセージ受信:`, { t, p, clientId, existingId: id });
        console.log(`[Join] 受信データ詳細:`, JSON.stringify({ t, p, clientId, existingId: id }, null, 2));
        if (!id) {
          // カスタムモードかどうかをチェック
          const isCustomMode = Boolean(p?.isCustomMode);
          
          if (isCustomMode) {
            this.roomState.isAutoRoom = true; // カスタムモードも自動ルームとして扱う
            this.roomState.isCustomMode = true; // カスタムモードフラグを設定
          }
          
          // ルーム人数制限チェック（新規参加者のみ）
          console.log(`[Join] 新規参加者 - 人数制限チェック開始: isAutoRoom=${this.roomState.isAutoRoom}, 現在の人数=${this.roomState.players.length}`);
          
          if (this.roomState.isAutoRoom) {
            // 知らない誰かと遊ぶ/カスタムモード：人数制限なし（自動マッチングで管理）
            console.log(`[Auto] 自動マッチングモード - 人数制限チェックをスキップ`);
          } else {
            // 知り合いと遊ぶ：8人制限
            console.log(`[Friends] 8人制限チェック: 現在の人数=${this.roomState.players.length}, ROOM_CAPACITY=${ROOM_CAPACITY}`);
            const isFull = isRoomFull(this.roomState);
            console.log(`[Friends] isRoomFull結果: ${isFull}`);
            
            if (isFull) {
              console.log(`[Friends] 8人制限に達したため、参加を拒否`);
              const ws = this.clients.get(clientId);
              ws?.send(JSON.stringify({ t: "warn", p: { code: "ROOM_FULL", msg: "このルームは満員です" } } as any));
              ws?.close(4000, "room_full");
              return;
            }
          }
          
          console.log(`[Join] 人数制限チェック通過 - 参加を許可`);
          
          id = `p_${nanoid(6)}`;
          this.clientToPlayerId.set(clientId, id);
          
          const iconId = this.pickIconId();
          const nick = String(p?.nick || "");
          const installId = String(p?.installId || "");
          
          const existingNicks = this.roomState.players.map((p: any) => p.nick);
          const uniqueNick = generateUniqueNickname(nick, existingNicks);
          
          this.roomState.players.push({ 
            id, 
            nick: uniqueNick, 
            iconId, 
            installId,
            connected: true,
            left: false
          });
          
          if (this.roomState.phase === "LOBBY" && !this.roomState.hostId) {
            this.roomState.hostId = id;
            console.log(`[Join] ホストを設定: ${id} (${uniqueNick})`);
          }
          
          console.log(`[Join] プレイヤー参加: ${id}`);
        } else {
          const existingPlayer = this.roomState.players.find((p: any) => p.id === id);
          if (existingPlayer) {
            if (!existingPlayer.connected) {
              console.log(`[Join] プレイヤー ${id} (${existingPlayer.nick}) が再接続しました`);
              existingPlayer.connected = true;
              delete existingPlayer.disconnectedAt;
            }
          }
        }
        
        const ws = this.clients.get(clientId);
        ws?.send(JSON.stringify({ t: "you", p: { playerId: id } }));
        
        this.broadcastState();
        
        // カスタムモードの場合はお題リストも送信
        if (this.roomState.isCustomMode) {
          this.broadcastCustomTopics();
        }
        
        if (this.roomState.phase === "LOBBY" && this.roomState.isAutoRoom) {
          if (this.roomState.players.length >= 3) {
            console.log(`[Join] 3人揃いました。自動開始します。`);
            this.autoStart();
          }
        }
        return;
      }

      if (t === "auto") {
        this.updateActivity();
        
        // READYフェーズ中は3人目が参加できるようにする
        if (this.roomState.phase !== "LOBBY" && this.roomState.phase !== "READY") {
          console.log(`[Auto] ゲーム開始後のため、新規参加を拒否します: phase=${this.roomState.phase}`);
          const ws = this.clients.get(clientId);
          ws?.send(JSON.stringify({ t: "warn", p: { code: "ROOM_CLOSED", msg: "ゲームが既に開始されています" } } as any));
          ws?.close(4000, "game_already_started");
          return;
        }
        
        let id = this.clientToPlayerId.get(clientId);
        console.log(`[Join] 参加処理開始: clientId=${clientId}, existingId=${id}, isAutoRoom=${this.roomState.isAutoRoom}, 現在の人数=${this.roomState.players.length}`);
        
        if (!id) {
          // ルーム人数制限チェック（新規参加者のみ）
          console.log(`[Join] 新規参加者 - 人数制限チェック開始`);
          
          if (this.roomState.isAutoRoom) {
            // 知らない誰かと遊ぶ：3人制限（READYフェーズ中は3人目も参加可能）
            console.log(`[Auto] 3人制限チェック: 現在の人数=${this.roomState.players.length}, phase=${this.roomState.phase}`);
            if (this.roomState.players.length >= 3 && this.roomState.phase === "LOBBY") {
              console.log(`[Auto] 3人制限に達したため、参加を拒否`);
              const ws = this.clients.get(clientId);
              ws?.send(JSON.stringify({ t: "warn", p: { code: "ROOM_FULL", msg: "このルームは満員です" } } as any));
              ws?.close(4000, "room_full");
              return;
            }
          } else {
            // 知り合いと遊ぶ：8人制限
            console.log(`[Friends] 8人制限チェック: 現在の人数=${this.roomState.players.length}, ROOM_CAPACITY=${ROOM_CAPACITY}`);
            const isFull = isRoomFull(this.roomState);
            console.log(`[Friends] isRoomFull結果: ${isFull}`);
            
            if (isFull) {
              console.log(`[Friends] 8人制限に達したため、参加を拒否`);
              const ws = this.clients.get(clientId);
              ws?.send(JSON.stringify({ t: "warn", p: { code: "ROOM_FULL", msg: "このルームは満員です" } } as any));
              ws?.close(4000, "room_full");
              return;
            }
          }
          
          console.log(`[Join] 人数制限チェック通過 - 参加を許可`);
          
          id = `p_${nanoid(6)}`;
          this.clientToPlayerId.set(clientId, id);
          const iconId = this.pickIconId();
          const nick = String(p?.nick || "");
          const installId = String(p?.installId || "");
          
          const existingNicks = this.roomState.players.map((p: any) => p.nick);
          const uniqueNick = generateUniqueNickname(nick, existingNicks);
          
          // 既存のルームのisAutoRoomフラグを尊重（新規ルームの場合は既に設定済み）
          
          if (this.roomState.players.length === 0) {
            this.roomState.mode = "STRANGER";
            console.log(`[Auto] 最初のプレイヤーが入室。STRANGERモードを設定: ${this.roomState.mode}`);
          }
          
          const isHost = this.roomState.players.length === 0;
          this.roomState.players.push({ 
            id, 
            nick: uniqueNick, 
            iconId, 
            installId,
            connected: true,
            left: false
          });
          
          if (isHost) {
            this.roomState.hostId = id;
            console.log(`[Auto] ホストを設定: ${id} (${uniqueNick})`);
          }
          
          console.log(`[Auto] 新規プレイヤー参加: ${id} (${uniqueNick})`);
        } else {
          console.warn(`[Join] 既存プレイヤー再接続: clientId=${clientId}, playerId=${id}`);
          if (this.roomState.phase === "LOBBY") {
            const pl = this.roomState.players.find((x: any) => x.id === id);
            if (pl) { 
              pl.connected = true; 
              pl.nick = String(p?.nick || pl.nick);
              if (pl.left === undefined) pl.left = false;
              if (pl.left === true) {
                pl.left = false;
                console.log(`[Auto] 離脱済みプレイヤーが再接続: ${id}`);
              }
              
              console.log(`[Auto] 既存プレイヤー再接続: ${id}`);
            }
          }
        }
        
        const ws = this.clients.get(clientId);
        ws?.send(JSON.stringify({ t: "you", p: { playerId: id } }));
        this.broadcastState();
        
        const activeCount = this.activeIds().length;
        if (activeCount >= 3) {
          console.log(`[Auto] 3人揃いました。自動開始します。`);
          this.autoStart();
        }
        return;
      }

      if (t === "start") {
        const pid = this.clientToPlayerId.get(clientId);
        if (this.roomState.phase !== "LOBBY" || !pid || this.roomState.hostId !== pid) return;
        
        const online = this.roomState.players.filter((x: any) => x.connected).length;
        if (online < 3) return;
        
        // カスタムモードの場合はお題作成シーンに遷移（クライアント側で処理）
        // 通常モードの場合はモード選択シーンに遷移
        console.log(`[Start] カスタムモード判定:`, {
          isCustomMode: this.roomState.isCustomMode,
          isAutoRoom: this.roomState.isAutoRoom
        });
        if (this.roomState.isCustomMode) {
          // カスタムモードの場合は何もしない（クライアント側でお題作成シーンに遷移）
          console.log(`[Start] カスタムモード - クライアント側でお題作成シーンに遷移`);
          return;
        } else {
          console.log(`[Start] 通常モード - モード選択シーンに遷移`);
          this.goModeSelect();
        }
        return;
      }

      if (t === "startGame") {
        const pid = this.clientToPlayerId.get(clientId);
        if (this.roomState.phase !== "LOBBY" || !pid || this.roomState.hostId !== pid) return;
        
        const online = this.roomState.players.filter((x: any) => x.connected).length;
        if (online < 3) return;
        
        // 知り合いモードの場合はMODE_SELECTに遷移
        if (!this.roomState.isAutoRoom) {
          this.goModeSelect();
        } else {
          // 知らない誰かと遊ぶの場合は直接ゲーム開始
          this.startGame();
        }
        return;
      }

      // カスタムお題機能
      if (t === "addCustomTopic") {
        const pid = this.clientToPlayerId.get(clientId);
        if (!pid) return;
        
        const text = String(p?.text || "").trim();
        if (!text || text.length === 0) return;
        
        // 文字数制限チェック（20グラフェム）
        const graphemeLength = this.getGraphemeLength(text);
        if (graphemeLength > 20) {
          const ws = this.clients.get(clientId);
          ws?.send(JSON.stringify({ t: "warn", p: { code: "INVALID_OP", msg: "お題は20文字以内で入力してください" } } as any));
          return;
        }
        
        // リスト数制限チェック（10個まで）
        if (this.roomState.customTopics.length >= 10) {
          const ws = this.clients.get(clientId);
          ws?.send(JSON.stringify({ t: "warn", p: { code: "INVALID_OP", msg: "お題は最大10個までです" } } as any));
          return;
        }
        
        // お題を追加
        this.roomState.customTopics.push(text);
        this.broadcastCustomTopics();
        return;
      }

      if (t === "removeCustomTopic") {
        const pid = this.clientToPlayerId.get(clientId);
        if (!pid) return;
        
        const index = Number(p?.index);
        if (isNaN(index) || index < 0 || index >= this.roomState.customTopics.length) return;
        
        // お題を削除
        this.roomState.customTopics.splice(index, 1);
        this.broadcastCustomTopics();
        return;
      }

      if (t === "startCustomGame") {
        console.log(`[startCustomGame] メッセージ受信: clientId=${clientId}`);
        const pid = this.clientToPlayerId.get(clientId);
        console.log(`[startCustomGame] プレイヤーID: ${pid}, ホストID: ${this.roomState.hostId}`);
        
        if (!pid || this.roomState.hostId !== pid) {
          console.log(`[startCustomGame] ホスト権限なし: pid=${pid}, hostId=${this.roomState.hostId}`);
          return;
        }
        
        console.log(`[startCustomGame] customTopicCreationメッセージをブロードキャスト`);
        // カスタムモードの場合はお題作成シーンに遷移するメッセージを送信
        this.broadcast({ t: "customTopicCreation", p: {} } as any);
        console.log(`[startCustomGame] ブロードキャスト完了`);
        return;
      }

      if (t === "modeStamp") {
        const pid = this.clientToPlayerId.get(clientId);
        if (!pid || this.roomState.phase !== "MODE_SELECT") return;
        
        // ホストは投票できない
        if (this.roomState.hostId === pid) {
          console.log(`[ModeStamp] ホスト ${pid} は投票できません`);
          return;
        }
        
        const mode = String(p?.mode || "");
        if (!mode) return;
        
        // 各プレイヤーが各モードに3回まで投票可能
        // プレイヤーごとの投票数を管理
        if (!this.roomState.playerVotes) {
          this.roomState.playerVotes = {};
        }
        if (!this.roomState.playerVotes[pid]) {
          this.roomState.playerVotes[pid] = {};
        }
        
        const playerModeVotes = this.roomState.playerVotes[pid][mode] || 0;
        if (playerModeVotes >= 3) {
          console.log(`[ModeStamp] プレイヤー ${pid} はモード ${mode} に既に3回投票済みです`);
          return;
        }
        
        // 投票を記録
        this.roomState.playerVotes[pid][mode] = playerModeVotes + 1;
          this.roomState.modeStamps[mode] = (this.roomState.modeStamps[mode] || 0) + 1;
          
        console.log(`[ModeStamp] プレイヤー ${pid} がモード ${mode} に投票: ${this.roomState.playerVotes[pid][mode]}/3`);
        console.log(`[ModeStamp] モード ${mode} の総スタンプ: ${this.roomState.modeStamps[mode]}`);
        
        // 全体のmodeStamps状態とプレイヤー個別の投票数を送信
          this.broadcast({ 
            t: "modeStamp", 
            p: { 
            modeStamps: this.roomState.modeStamps,
            playerVotes: this.roomState.playerVotes
          } 
        });
        
        return;
      }

      if (t === "submitSecret") {
        const pid = this.clientToPlayerId.get(clientId);
        if (!pid || this.roomState.phase !== "INPUT") return;
        
        const secretText = String(p?.text || "");
        if (!secretText.trim()) return;
        
        // 既に提出済みの場合は無視
        if (this.roomState.round.submissions[pid]) {
          console.log(`[SubmitSecret] プレイヤー ${pid} は既に提出済みです`);
        return;
      }

        this.roomState.round.submissions[pid] = secretText;
        
        console.log(`[SubmitSecret] プレイヤー ${pid} が秘密を提出: ${secretText.substring(0, 20)}...`);
        
        // 提出完了を通知
        this.broadcast({ t: "submitSecret", p: { playerId: pid, ok: true } });
        
        // 全員が提出完了したかチェック
        const submittedCount = Object.keys(this.roomState.round.submissions).length;
        const activePlayers = this.roomState.players.filter((p: any) => p.connected).length;
        
        if (submittedCount >= activePlayers) {
          console.log(`[SubmitSecret] 全員が提出完了。即座にREVEALフェーズに移行します。`);
          this.goReveal();
        }
        
        return;
      }

      if (t === "submitSubmission") {
        const pid = this.clientToPlayerId.get(clientId);
        if (!pid || this.roomState.phase !== "REVEAL") return;
        
        // REVEALフェーズでは秘密の再提出は不要
        // このメッセージは無視する
        return;
      }

      if (t === "revealReady") {
        const pid = this.clientToPlayerId.get(clientId);
        if (!pid || this.roomState.phase !== "REVEAL") return;
        
        // 既に確認済みの場合は無視
        if (this.roomState.round.revealConfirmations && this.roomState.round.revealConfirmations[pid]) {
          console.log(`[RevealReady] プレイヤー ${pid} は既に確認済みです`);
          return;
        }
        
        // 確認完了を記録
        if (!this.roomState.round.revealConfirmations) {
          this.roomState.round.revealConfirmations = {};
        }
        this.roomState.round.revealConfirmations[pid] = true;
        
        console.log(`[RevealReady] プレイヤー ${pid} が秘密発表を確認`);
        
        // 確認完了を通知
        this.broadcast({ t: "revealReady", p: { playerId: pid, ok: true } });
        
        // 全員が確認完了したかチェック
        const confirmedCount = Object.keys(this.roomState.round.revealConfirmations).length;
        const activePlayers = this.roomState.players.filter((p: any) => p.connected).length;
        
        if (confirmedCount >= activePlayers) {
          console.log(`[RevealReady] 全員が確認完了。REVEALフェーズのタイマー完了を待ちます。`);
          // タイマーベースの移行のみを使用（setTimeoutによる移行は削除）
        }
        
        return;
      }

      if (t === "chat") {
        const pid = this.clientToPlayerId.get(clientId);
        if (!pid || this.roomState.phase !== "DISCUSS") return;
        
        const message = String(p?.text || ""); // textフィールドを使用
        if (!message.trim()) return;
        
        // プレイヤー情報を取得
        const player = this.roomState.players.find((p: any) => p.id === pid);
        if (!player) return;
        
        // チャット履歴をround.chatに保存
        if (!this.roomState.round.chat) {
          this.roomState.round.chat = [];
        }
        
        const chatMessage = {
          id: nanoid(),
          senderId: pid,
          nick: player.nick,
          iconId: player.iconId,
          text: message.trim(),
          ts: Date.now()
        };
        
        this.roomState.round.chat.push(chatMessage);
        
        // 全員にチャットメッセージを送信
        this.broadcast({ t: "chat", p: chatMessage });
        
        console.log(`[Chat] プレイヤー ${pid} (${player.nick}) がチャット送信: ${message.substring(0, 20)}...`);
        
        return;
      }

      if (t === "endDiscuss") {
        const pid = this.clientToPlayerId.get(clientId); 
        if (!pid || this.roomState.phase !== "DISCUSS") return;
        
        // 既に投票済みの場合は無視
        if (this.roomState.round.discussEndVotes && this.roomState.round.discussEndVotes[pid]) {
          console.log(`[EndDiscuss] プレイヤー ${pid} は既に投票済みです`);
          return;
        }
        
        // 議論終了投票を記録
        if (!this.roomState.round.discussEndVotes) {
          this.roomState.round.discussEndVotes = {};
        }
        this.roomState.round.discussEndVotes[pid] = true;
        
        // discuss.votesToEndも更新（進捗表示用）
        if (this.roomState.round.discuss) {
        this.roomState.round.discuss.votesToEnd[pid] = true;
        }
        
        // discussEndVotesも更新（過半数判定用）
        this.roomState.round.discussEndVotes[pid] = true;
        
        console.log(`[EndDiscuss] プレイヤー ${pid} が議論終了に投票`);
        
        // 投票完了を通知
        this.broadcast({ t: "endDiscuss", p: { playerId: pid, ok: true } });
        
        // 状態を更新してクライアントに送信
        this.broadcastState();
        
        // 過半数が賛成したかチェック
        const votedCount = Object.keys(this.roomState.round.discussEndVotes).length;
        const activePlayers = this.roomState.players.filter((p: any) => p.connected).length;
        const requiredVotes = Math.ceil(activePlayers / 2);
        
        console.log(`[EndDiscuss] 投票状況: ${votedCount}/${requiredVotes} (過半数: ${requiredVotes})`);
        
        if (votedCount >= requiredVotes) {
          console.log(`[EndDiscuss] 過半数が議論終了に賛成。即座にVOTEフェーズに移行します。`);
          this.goVote();
        }
        
        return;
      }

      if (t === "vote") {
        const pid = this.clientToPlayerId.get(clientId);
        if (!pid || this.roomState.phase !== "VOTE") return;
        
        const targetId = String(p?.targetId || "");
        if (!targetId) return;
        
        this.roomState.round.votes[pid] = targetId;
        
        console.log(`[Vote] プレイヤー ${pid} が ${targetId} に投票`);
        
        this.broadcast({ t: "vote", p: { playerId: pid, targetId } });
        
        const votedCount = Object.keys(this.roomState.round.votes).length;
        if (votedCount >= this.roomState.players.length) {
          console.log(`[Vote] 全員が投票完了。即座にJUDGEフェーズに移行します。`);
          this.goJudge();
        }
        
        return;
      }

      if (t === "ping") {
        this.updateActivity();
        const ws = this.clients.get(clientId);
        ws?.send(JSON.stringify({ t: "pong", p: Date.now() }));
        return;
      }

      if (t === "report") {
        const pid = this.clientToPlayerId.get(clientId);
        if (!pid) return;
        
        const targetPlayerId = String(p?.targetPlayerId ?? "");
        const installId = String(p?.installId ?? "");
        
        if (!targetPlayerId || !installId) return;
        
        if (targetPlayerId === pid) return;
        
        const targetPlayer = this.roomState.players.find((p: any) => p.id === targetPlayerId);
        if (!targetPlayer) return;
        
        try {
          // レート制限チェック
          const rateLimitResult = this.checkRateLimit(clientId, "report");
          if (!rateLimitResult.allowed) {
            console.log(`[Report] レート制限超過: ${installId} -> ${targetPlayerId}, retryAfter: ${rateLimitResult.retryAfter}`);
            const ws = this.clients.get(clientId);
            ws?.send(JSON.stringify({ t: "reportAck", p: { ok: false, error: "Rate limit exceeded", retryAfter: rateLimitResult.retryAfter } }));
            return;
          }

          const points = 4;
          
          const reportKey = `report:${installId}:${targetPlayerId}`;
          const today = new Date().toISOString().split('T')[0];
          const reportData = {
            targetPlayerId,
            points,
            timestamp: Date.now(),
            date: today,
            roomId: this.roomState.roomId
          };
          
          await this.env.MOD_KV.put(reportKey, JSON.stringify(reportData), {
            expirationTtl: 86400
          });
          
          const ws = this.clients.get(clientId);
          ws?.send(JSON.stringify({ t: "reportAck", p: { ok: true } }));
          
          console.log(`[Report] 通報成功: ${installId} -> ${targetPlayerId}`);
          
        } catch (error) {
          console.error(`[Report] 通報処理エラー:`, error);
          
          const ws = this.clients.get(clientId);
          ws?.send(JSON.stringify({ t: "reportAck", p: { ok: false, error: "Internal error" } }));
        }
        
        return;
      }

      if (t === "rematch") {
        const pid = this.clientToPlayerId.get(clientId);
        if (!pid || this.roomState.phase !== "RESULT") return;
        
        // オートマッチングではリマッチの概念は持たない
        if (this.roomState.isAutoRoom) { console.log(`[rematch] isAutoRoomのため無視`); return; }
        
        const player = this.roomState.players.find((p: any) => p.id === pid);
        if (!player || this.roomState.hostId !== pid) return;
        
        console.log(`[rematch] ホスト ${pid} がもう一度を選択`);
        
        this.broadcast({ t: "rematch", p: { choice: "rematch" } });
        
        console.log(`[rematch] 3秒後にgoModeSelectを呼び出します`);
        setTimeout(() => {
          console.log(`[rematch] goModeSelectを呼び出します`);
          this.goModeSelect();
          
          console.log(`[rematch] 新しいゲームが開始されるため、ルーム削除をキャンセルします`);
        }, 3000);
        
        return;
      }

      if (t === "endGame") {
        const pid = this.clientToPlayerId.get(clientId);
        if (!pid || this.roomState.phase !== "RESULT") return;
        
        // オートマッチングでは終了ボタンの概念は持たない（サーバー側でも無視）
        if (this.roomState.isAutoRoom) { console.log(`[endGame] isAutoRoomのため無視`); return; }
        
        const player = this.roomState.players.find((p: any) => p.id === pid);
        if (!player || this.roomState.hostId !== pid) return;
        
        console.log(`[endGame] ホスト ${pid} が終了を選択`);
        
        this.broadcast({ t: "endGame", p: { choice: "end" } });
        
        console.log(`[endGame] 3秒後にabortメッセージを送信します`);
        setTimeout(() => {
          console.log(`[endGame] abortメッセージを送信: reason=game_ended`);
          this.broadcast({ t: "abort", p: { reason: "game_ended" } });
          
          setTimeout(() => {
            console.log(`[endGame] ルームを完全削除します`);
            this.deleteRoomCompletely();
          }, 1000);
        }, 3000);
        
        return;
      }
      
      if (t === "phaseChange") {
        const pid = this.clientToPlayerId.get(clientId);
        if (!pid) return;
        
        const phase = String(p?.phase || "");
        console.log(`[phaseChange] プレイヤー ${pid} がフェーズ変更を要求: ${phase}`);
        
        if (phase === "RESULT" && this.roomState.phase === "JUDGE") {
          console.log(`[phaseChange] JUDGEフェーズからRESULTフェーズに移行します`);
          this.goResult();
        }
        
        return;
      }

      if (t === "exitGame") {
        if (this.roomState.phase !== "RESULT") return;
        const pid = this.clientToPlayerId.get(clientId);
        if (!pid) return;
        
        const p = this.roomState.players.find((x: any) => x.id === pid);
        if (p) {
          p.left = true;
          p.connected = false;
        }
        
        this.broadcastState();
        return;
      }

      if (t === "disband") {
        const pid = this.clientToPlayerId.get(clientId);
        if (this.roomState.phase !== "LOBBY" || !pid || this.roomState.hostId !== pid) return;
        
        console.log(`[disband] ホスト ${pid} がルームを解散しました`);
        
        this.broadcast({ t: "disband", p: { by: pid } });
        
        setTimeout(() => {
          for (const ws of this.clients.values()) {
            try { ws.close(4000, "disbanded"); } catch {}
          }
          this.deleteRoomCompletely();
        }, 1000);
        
        return;
      }

      if (t === "leave") {
        const pid = this.clientToPlayerId.get(clientId);
        if (!pid) return;
        
        console.log(`[leave] プレイヤー ${pid} が明示的に離脱しました`);
        
        const idx = this.roomState.players.findIndex((x: any) => x.id === pid);
        if (idx >= 0) {
          const pl = this.roomState.players[idx];
          if (pl.iconId) {
            // 配列からアイコンIDを削除
            const iconIndex = this.roomState.iconInUse.indexOf(pl.iconId);
            if (iconIndex > -1) {
              this.roomState.iconInUse.splice(iconIndex, 1);
            }
            console.log(`[leave] アイコンID ${pl.iconId} を解放しました`);
          }
          this.roomState.players.splice(idx, 1);
          console.log(`[leave] プレイヤー ${pid} をプレイヤーリストから削除しました。残り: ${this.roomState.players.length}人`);
        }
        this.clientToPlayerId.delete(clientId);
        
        
        if (this.roomState.players.length === 0) {
          console.log(`[leave] 全プレイヤーが離脱したため、ルームを削除します`);
          setTimeout(() => {
            for (const ws of this.clients.values()) {
              try { ws.close(4000, "room_empty"); } catch {}
            }
            this.deleteRoomCompletely();
          }, 1000);
          return;
        }
        
        this.broadcastState();
        return;
      }

      if (t === "selectMode") {
        const pid = this.clientToPlayerId.get(clientId);
        if (!pid || this.roomState.phase !== "MODE_SELECT" || this.roomState.hostId !== pid) return;
        
        const mode = String(p?.mode || "");
        if (!mode) return;
        
        console.log(`[SelectMode] ホスト ${pid} がモード ${mode} を選択しました`);
        
        // 選択されたモードを設定
        this.roomState.mode = mode;
        
        // モードに応じたお題を設定
        const modePrompts = PROMPTS[mode as keyof typeof PROMPTS] || PROMPTS.NONE;
        const selectedPrompt = modePrompts[Math.floor(Math.random() * modePrompts.length)];
        
        // ラウンド情報を初期化
        this.roomState.round = {
          prompt: selectedPrompt,
          promptText: selectedPrompt,
          promptId: Math.floor(Math.random() * modePrompts.length),
          secretText: "",
          secretOwner: "",
          submissions: {},
          chat: [],
          votes: {},
          result: null
        };
        
        console.log(`[SelectMode] お題を設定: ${selectedPrompt}`);
        
        // INPUTフェーズに移行
        this.goInput();
        
        return;
      }
    } catch (error) {
      console.error(`[onMessage] エラー:`, error);
      // 監視データの記録
      globalMonitor.recordError(this.roomId);
    }
  }

  private autoStart() {
    if (this.roomState.phase !== "LOBBY") return;
    if (!this.roomState.isAutoRoom) return;
    
    console.log(`[autoStart] 新しいルームでのゲーム開始: roomId=${this.roomState.roomId}`);
    
    if (this.roomState.players.length >= 3) {
      console.log(`[autoStart] 3人揃いました。準備フェーズを開始します。`);
      
      this.roomState.phase = "READY";
      this.roomState.phaseSeq = (this.roomState.phaseSeq ?? 0) + 1;
      
      this.setEnds(3_000);
      
      console.log(`[autoStart] 準備フェーズ開始。3秒後にゲームを開始します。`);
      
      this.broadcast({ t: "phase", p: { phase: "READY", endsAt: this.roomState.endsAt, roundId: this.roomState.roundId, phaseSeq: this.roomState.phaseSeq } });
      this.broadcastState();
      return;
    }
    
    if (this.clients.size !== this.roomState.players.length) {
      console.warn(`[autoStart] 警告: WebSocket接続数(${this.clients.size})とプレイヤー数(${this.roomState.players.length})が一致しません`);
      
      console.log(`[autoStart] 接続管理をクリアして再構築します`);
      this.clients.clear();
      this.clientToPlayerId.clear();
      this.roomState.players = [];
      this.roomState.hostId = undefined;
    }
    
    if (this.roomState.players.length > 0) {
      console.warn(`[autoStart] 警告: 新しいルームなのにプレイヤーが存在します: ${this.roomState.players.length}人`);
      this.roomState.players = [];
      this.roomState.hostId = undefined;
      console.log(`[autoStart] プレイヤーリストをクリアしました`);
    }
  }

  private startGame() {
    if (this.roomState.phase !== "READY") return;
    if (!this.roomState.isAutoRoom) return;
    
    console.log(`[startGame] ゲーム開始処理を実行します`);
    
    this.resetGameState();
    
    const prompts = PROMPTS.STRANGER;
    const selectedPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    
    console.log(`[startGame] ゲーム開始: roomId=${this.roomState.roomId}, mode=${this.roomState.mode}, prompt=${selectedPrompt}`);
    
    this.roomState.roundId = nanoid();
    this.roomState.round = {
      prompt: selectedPrompt,
      promptText: selectedPrompt,
      promptId: Math.floor(Math.random() * prompts.length),
      secretText: "",
      secretOwner: "",
      submissions: {},
      chat: [],
      votes: {},
      result: null
    };
    
    this.roomState.phase = "INPUT";
    this.roomState.phaseSeq = (this.roomState.phaseSeq ?? 0) + 1;
    this.setEnds(30_000); // 30秒固定
    
    console.log(`[startGame] ゲーム開始完了。プレイヤー数: ${this.roomState.players.length}`);
    
    this.broadcast({ t: "phase", p: { phase: "INPUT", endsAt: this.roomState.endsAt, roundId: this.roomState.roundId, phaseSeq: this.roomState.phaseSeq } });
    this.broadcastState();
  }

  private resetGameState() {
    this.roomState.round = {
      submissions: {},
      secretText: "",
      secretOwner: "",
      discuss: {
        startedAt: 0,
        endsAt: 0,
        participantsAtStart: 0,
        votesToEnd: {}
      },
      votes: {},
      discussEndVotes: {},
      revealConfirmations: {}
    };
    
    this.roomState.endsAt = undefined;
    this.roomState.chat = [];
    this.roomState.roundId = `round_${nanoid(8)}`;
    this.roomState.phaseSeq = 0;
    this.roomState.phase = "LOBBY";
    
    this.roomState.iconInUse = [];
    // モード選択関連のデータもクリア
    this.roomState.modeStamps = {};
    this.roomState.playerVotes = {};
    console.log(`[resetGameState] アイコンIDとモード選択データをクリアしました`);
  }

  private async deleteRoomCompletely() {
    console.log(`[deleteRoomCompletely] ルーム ${this.roomState.roomId} を削除します`);
    
    try {
      this.roomState.players = [];
      this.clientToPlayerId.clear();
      this.roomState.hostId = undefined;
      
      this.roomState.iconInUse = [];
      console.log(`[deleteRoomCompletely] アイコンIDをクリアしました`);
      
      for (const ws of this.clients.values()) {
        try {
          ws.close(4000, "room_deleted");
        } catch (error) {
          console.error(`[deleteRoomCompletely] ルーム削除エラー:`, error);
        }
      }
      
      console.log(`[deleteRoomCompletely] ルーム ${this.roomState.roomId} の削除が完了しました`);
      
    } catch (error) {
      console.error(`[deleteRoomCompletely] ルーム削除エラー:`, error);
    }
  }

  private updateActivity() {
    this.roomState.lastActivityAt = Date.now();
  }

  private goModeSelect() {
    // モード選択時の投票データをリセット
    this.roomState.modeStamps = {};
    this.roomState.playerVotes = {};
    this.roomState.phase = "MODE_SELECT";
    this.roomState.phaseSeq = (this.roomState.phaseSeq ?? 0) + 1;
    this.setEnds(30_000);
    
    // 初期状態のモードスタンプとプレイヤー個別投票数を送信
    this.broadcast({ 
      t: "modeStamp", 
      p: { 
        modeStamps: this.roomState.modeStamps || {},
        playerVotes: this.roomState.playerVotes || {}
      } 
    });
    
    this.broadcast({ t: "phase", p: { phase: "MODE_SELECT", endsAt: this.roomState.endsAt, roundId: this.roomState.roundId, phaseSeq: this.roomState.phaseSeq } });
    this.broadcastState();
  }

  private goInput() {
    this.roomState.phase = "INPUT";
    this.roomState.phaseSeq = (this.roomState.phaseSeq ?? 0) + 1;
    this.setEnds(30_000); // 30秒固定
    this.broadcast({ t: "phase", p: { phase: "INPUT", endsAt: this.roomState.endsAt, roundId: this.roomState.roundId, phaseSeq: this.roomState.phaseSeq } });
    this.broadcastState();
    
    console.log(`[goInput] 秘密入力フェーズ開始。制限時間: 30秒`);
  }

  private goReady() {
    this.roomState.phase = "READY";
    this.roomState.phaseSeq = (this.roomState.phaseSeq ?? 0) + 1;
    this.setEnds(3_000);
    this.broadcast({ t: "phase", p: { phase: "READY", endsAt: this.roomState.endsAt, roundId: this.roomState.roundId, phaseSeq: this.roomState.phaseSeq } });
    this.broadcastState();
  }

  private goReveal() {
    this.roomState.phase = "REVEAL";
    this.roomState.phaseSeq = (this.roomState.phaseSeq ?? 0) + 1;
    
    // 提出された秘密の中から一つをランダムに選択
    const submissions = this.roomState.round.submissions;
    const playerIds = Object.keys(submissions);
    
    if (playerIds.length > 0) {
      // ランダムに秘密を選択
      const randomPlayerId = playerIds[Math.floor(Math.random() * playerIds.length)];
      const selectedSecret = submissions[randomPlayerId];
      
      // 選択された秘密の持ち主を記録
      this.roomState.round.secretOwner = randomPlayerId;
      this.roomState.round.secretText = selectedSecret;
      
      // RevealScheduleを作成
      const now = Date.now();
      this.roomState.reveal = {
        text: selectedSecret,
        startAt: now,
        at1: now + 1000,  // 1秒後に1つ目の文章
        at2: now + 3000,  // 3秒後に2つ目の文章（秘密の内容）
        at3: now + 6000,  // 6秒後に3つ目の文章
        endsAt: now + 8000 // 8秒後に終了
      };
      
      console.log(`[goReveal] 秘密を選択: プレイヤー ${randomPlayerId}, 内容: ${selectedSecret.substring(0, 20)}...`);
    }
    
    this.setEnds(8_000); // 8秒でREVEALフェーズ終了
    this.broadcast({ t: "phase", p: { phase: "REVEAL", endsAt: this.roomState.endsAt, roundId: this.roomState.roundId, phaseSeq: this.roomState.phaseSeq } });
    this.broadcastState();
  }

  private goDiscuss() {
    // 既にDISCUSSフェーズの場合は重複実行を防ぐ
    if (this.roomState.phase === "DISCUSS") {
      console.log(`[goDiscuss] 既にDISCUSSフェーズのため、重複実行をスキップします`);
      return;
    }
    
    this.roomState.phase = "DISCUSS";
    this.roomState.phaseSeq = (this.roomState.phaseSeq ?? 0) + 1;
    
    // チャット履歴を初期化
    if (!this.roomState.round.chat) {
      this.roomState.round.chat = [];
    }
    
    // 議論終了投票を初期化
    if (!this.roomState.round.discussEndVotes) {
      this.roomState.round.discussEndVotes = {};
    }
    
    // 参加人数×15秒の制限時間を設定
    const activePlayers = this.roomState.players.filter((p: any) => p.connected).length;
    const discussDuration = activePlayers * 15 * 1000; // 15秒 × 参加人数
    
    // discuss情報を設定
    this.roomState.round.discuss = {
      startedAt: Date.now(),
      endsAt: Date.now() + discussDuration,
      participantsAtStart: activePlayers,
      votesToEnd: {}
    };
    
    this.setEnds(discussDuration);
    this.broadcast({ t: "phase", p: { phase: "DISCUSS", endsAt: this.roomState.endsAt, roundId: this.roomState.roundId, phaseSeq: this.roomState.phaseSeq } });
    this.broadcastState();
    
    console.log(`[goDiscuss] 議論フェーズ開始。制限時間: ${activePlayers}人 × 15秒 = ${discussDuration / 1000}秒`);
  }

  private goVote() {
    this.roomState.phase = "VOTE";
    this.roomState.phaseSeq = (this.roomState.phaseSeq ?? 0) + 1;
    this.setEnds(10_000); // 10秒固定
    
    // discuss情報を更新
    if (this.roomState.round.discuss) {
      this.roomState.round.discuss.participantsAtStart = this.roomState.players.length;
    }
    
    this.broadcast({ t: "phase", p: { phase: "VOTE", endsAt: this.roomState.endsAt, roundId: this.roomState.roundId, phaseSeq: this.roomState.phaseSeq } });
    this.broadcastState();
    
    console.log(`[goVote] 投票フェーズ開始。制限時間: 10秒`);
  }

  private goJudge() {
    this.roomState.phase = "JUDGE";
    this.roomState.phaseSeq = (this.roomState.phaseSeq ?? 0) + 1;
    
    console.log(`[goJudge] JUDGEフェーズ開始: 投票結果集計を実行します`);
    
    // 投票結果を集計（「投票なし」は最多投票計算から除外）
    const voteCounts: Record<string, number> = {};
    const noneCount = Object.values(this.roomState.round.votes).filter(vote => vote === "NONE").length;
    
    Object.values(this.roomState.round.votes).forEach(vote => {
      if (vote !== "NONE" && typeof vote === "string") {
        voteCounts[vote] = (voteCounts[vote] || 0) + 1;
      }
    });
    
    // 最多投票を取得
    const maxVotes = Math.max(...Object.values(voteCounts), 0);
    const topIds = Object.entries(voteCounts)
      .filter(([_, count]) => count === maxVotes)
      .map(([id, _]) => id);
    
    // 投票結果を保存
    this.roomState.round.tally = {
      topIds,
      counts: voteCounts,
      noneCount
    };
    
    console.log(`[goJudge] 投票結果集計完了: 最多投票=${maxVotes}, 最多投票者=${topIds.join(', ')}, 投票なし=${noneCount}人`);
    
    // クライアント側の画面遷移に依存するため、サーバー側のタイマーは不要
    this.roomState.endsAt = undefined; // 明示的にundefinedに設定
    
    // 保留中のアラームをキャンセル（VOTEフェーズからの残存アラーム防止）
    try {
      this.state.storage.deleteAlarm();
      console.log(`[goJudge] 保留中のアラームをキャンセルしました`);
    } catch (error) {
      console.log(`[goJudge] アラームキャンセルエラー（無視）:`, error);
    }
    
    this.broadcast({ t: "phase", p: { phase: "JUDGE", endsAt: undefined, roundId: this.roomState.roundId, phaseSeq: this.roomState.phaseSeq } });
    this.broadcastState();
    
    console.log(`[goJudge] JUDGEフェーズ開始完了: クライアント側で5秒後にRESULTフェーズに遷移予定`);
  }

  private goResult() {
    const startTime = Date.now();
    console.log(`[goResult] 開始: phase=${this.roomState.phase}, isAutoRoom=${this.roomState.isAutoRoom}, 時刻=${new Date(startTime).toISOString()}`);
    
    this.roomState.phase = "RESULT";
    this.roomState.phaseSeq = (this.roomState.phaseSeq ?? 0) + 1;
    
    if (this.roomState.isAutoRoom) {
      console.log(`[goResult] 知らない誰かとのため、7秒後に強制終了します`);
      
      // より確実な7秒タイマー: setTimeoutとsetAlarmの両方を使用
      const autoEndTime = Date.now() + 7000;
      this.roomState.endsAt = autoEndTime;
      
      // 方法1: setTimeout（即座に実行）
      const timerStartTime = Date.now();
      console.log(`[goResult] setTimeoutで7秒タイマー開始: ${new Date(timerStartTime).toISOString()}`);
      
      setTimeout(() => {
        const timerEndTime = Date.now();
        const actualDelay = timerEndTime - timerStartTime;
        console.log(`[goResult] setTimeout: 7秒経過、強制終了を実行します。実際の遅延: ${actualDelay}ms (${actualDelay/1000}秒)`);
        this.executeAutoEnd();
      }, 7000);
      
      // 方法2: setAlarm（バックアップ）
      try {
        this.state.storage.setAlarm(autoEndTime);
        console.log(`[goResult] setAlarmで7秒後のアラームを設定: ${new Date(autoEndTime).toISOString()}`);
      } catch (error) {
        console.error(`[goResult] setAlarm設定エラー（setTimeoutで動作）:`, error);
      }
      
      console.log(`[goResult] 7秒タイマー開始完了。予定終了時刻: ${new Date(autoEndTime).toISOString()}`);
    } else {
      console.log(`[goResult] 通常ルームのため、自動終了は設定しません`);
    }
    
    this.broadcast({ t: "phase", p: { phase: "RESULT", endsAt: this.roomState.endsAt, roundId: this.roomState.roundId, phaseSeq: this.roomState.phaseSeq } });
    this.broadcastState();
    
    const endTime = Date.now();
    console.log(`[goResult] 完了: 処理時間=${endTime - startTime}ms`);
  }
  
  // 自動終了処理を別メソッドに分離
  private executeAutoEnd() {
    // 重複実行を防ぐためのフラグ
    if (this.roomState.phase !== "RESULT" || !this.roomState.isAutoRoom) {
      console.log(`[executeAutoEnd] 既に処理済みまたは条件不一致のため、スキップします`);
      return;
    }
    
    console.log(`[executeAutoEnd] 7秒経過、強制終了を実行します`);
    this.broadcast({ t: "abort", p: { reason: "game_ended" } });
    console.log(`[executeAutoEnd] abortメッセージ送信完了`);
    
    // 1秒後にルームを削除
    setTimeout(() => {
      console.log(`[executeAutoEnd] 強制終了によりルームを完全削除します`);
      this.deleteRoomCompletely();
    }, 1000);
  }

  private setEnds(duration: number) {
    this.roomState.endsAt = Date.now() + duration;
    this.state.storage.setAlarm(this.roomState.endsAt);
  }

  private pickIconId(): number {
    const availableIcons = [];
    for (let i = 1; i <= 20; i++) {
      if (!this.roomState.iconInUse.includes(i)) {
        availableIcons.push(i);
      }
    }
    
    if (availableIcons.length === 0) {
      this.roomState.iconInUse = [];
      for (let i = 1; i <= 20; i++) {
        availableIcons.push(i);
      }
    }
    
    const selectedIcon = availableIcons[Math.floor(Math.random() * availableIcons.length)];
    this.roomState.iconInUse.push(selectedIcon);
    return selectedIcon;
  }

  private activeIds(): string[] {
    return this.roomState.players.filter((p: any) => p.connected && !p.left).map((p: any) => p.id);
  }

  private broadcast(msg: unknown) {
    const packet = JSON.stringify(msg);
    for (const ws of this.clients.values()) {
      try {
        ws.send(packet);
      } catch (error) {
        console.warn(`[broadcast] 送信エラー:`, error);
      }
    }
  }

  private broadcastState() {
    try {
      // iconInUseを配列に変換してからZod検証
      const stateForValidation = {
        ...this.roomState,
        iconInUse: Array.from(this.roomState.iconInUse)
      };
      
      console.log(`[broadcastState] 送信状態:`, {
        isCustomMode: this.roomState.isCustomMode,
        isAutoRoom: this.roomState.isAutoRoom,
        phase: this.roomState.phase
      });
      
      this.broadcast({ t: "state", p: RoomStateZ.parse(stateForValidation) } as any);
    } catch (error) {
      console.warn(`[broadcastState] 状態送信エラー:`, error);
      // エラー時は生の状態を送信（iconInUseを配列に変換）
      const fallbackState = {
        ...this.roomState,
        iconInUse: Array.from(this.roomState.iconInUse)
      };
      this.broadcast({ t: "state", p: fallbackState } as any);
    }
  }

  // グラフェム長を取得するヘルパーメソッド
  private getGraphemeLength(text: string): number {
    // 簡易的な実装（実際のプロダクションではGraphemeSplitterを使用）
    return text.length;
  }

  // カスタムお題リストをブロードキャスト
  private broadcastCustomTopics() {
    this.broadcast({ t: "customTopics", p: { topics: this.roomState.customTopics } } as any);
  }

  // カスタムゲームを開始
  private startCustomGame() {
    // カスタムお題からランダムで1つ選択
    const randomIndex = Math.floor(Math.random() * this.roomState.customTopics.length);
    const selectedTopic = this.roomState.customTopics[randomIndex];
    
    // お題を設定してゲーム開始
    this.roomState.round.prompt = selectedTopic;
    this.roomState.round.promptText = selectedTopic;
    this.startGame();
  }

  // カスタムモードでの参加処理
  private handleCustomModeJoin(clientId: string, p: any) {
    let id = this.clientToPlayerId.get(clientId);
    
    if (!id) {
      // 新規参加者
      id = `p_${nanoid(6)}`;
      this.clientToPlayerId.set(clientId, id);
      
      const iconId = this.pickIconId();
      const nick = String(p?.nick || "");
      const installId = String(p?.installId || "");
      
      const existingNicks = this.roomState.players.map((p: any) => p.nick);
      const uniqueNick = generateUniqueNickname(nick, existingNicks);
      
      const player = {
        id,
        nick: uniqueNick,
        iconId,
        connected: true
      };
      
      this.roomState.players.push(player);
      
      // 最初の参加者がホスト
      if (this.roomState.players.length === 1) {
        this.roomState.hostId = id;
      }
      
      // カスタムモードとして設定
      this.roomState.isAutoRoom = true;
      
      console.log(`[CustomMode] プレイヤー参加: ${uniqueNick} (${id})`);
    } else {
      // 既存プレイヤーの再接続
      const player = this.roomState.players.find((p: any) => p.id === id);
      if (player) {
        player.connected = true;
        console.log(`[CustomMode] プレイヤー再接続: ${player.nick} (${id})`);
      }
    }
    
    // カスタムお題リストを送信
    this.broadcastCustomTopics();
    this.broadcastState();
  }
}

export interface Env {
  DO_ROOMS: DurableObjectNamespace;
  MOD_KV: KVNamespace;
  ENVIRONMENT?: string; // "production" | "development"
  // 以下は index.ts で参照される環境変数
  LOG_LEVEL?: string; // "debug" | "info" | "warn" | "error"
  ALLOWED_ORIGINS?: string; // カンマ区切りの許可オリジン
  ENABLE_RATE_LIMIT?: string; // "true" で有効化
  RATE_AUTO_PER_MIN?: string; // 1分あたりの /auto の許可回数
  RATE_REPORT_PER_5MIN?: string; // 5分あたりの /report の許可回数
  // Stripe関連
  STRIPE_SECRET_KEY?: string; // Stripe秘密鍵
  // 監視関連
  MONITORING_AUTH_TOKEN?: string; // 監視用認証トークン
  MONITORING_ALLOWED_IPS?: string; // 監視用許可IP
}