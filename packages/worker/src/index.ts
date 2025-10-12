import { Router } from "itty-router";
import { Env, RoomDO } from "./room.js";
import { exportMonitoringData } from "./monitoring.js";

export { RoomDO };

// 決済処理用の型定義（現在は外部サイトへのリンクのみ）

const router = Router();

function genRoomId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

// 最適化されたCORS設定
function getCorsHeaders(env: Env, origin?: string): Record<string, string> {
  // 許可されたオリジンのリストを環境変数から取得
  const allowedOrigins = env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];
  
  // デフォルトの許可オリジン（開発環境用）
  const defaultOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173", 
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "capacitor://localhost" // ネイティブアプリ用
  ];
  
  // 本番環境用のデフォルトオリジン
  const productionOrigins = [
    "https://secret-werewolf.com",
    "https://www.secret-werewolf.com",
    "capacitor://localhost" // ネイティブアプリ用
  ];
  
  // 環境に応じて許可オリジンを決定
  const validOrigins = env.ENVIRONMENT === "production" 
    ? [...allowedOrigins, ...productionOrigins]
    : [...allowedOrigins, ...defaultOrigins];
  
  let corsOrigin: string;
  let allowCredentials = false;
  
  if (origin && validOrigins.includes(origin)) {
    corsOrigin = origin;
    allowCredentials = true; // 許可されたオリジンのみcredentialsを許可
  } else if (env.ENVIRONMENT === "production") {
    // 本番環境では明示的に許可されたオリジンのみ
    corsOrigin = validOrigins[0] || "https://secret-werewolf.com";
    allowCredentials = true;
  } else {
    // 開発環境で許可されていないオリジンの場合
    corsOrigin = "*";
    allowCredentials = false; // credentialsは許可しない
  }
  
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Requested-With,Accept,Origin",
    "Vary": "Origin"
  };
  
  // credentialsは許可されたオリジンのみ
  if (allowCredentials) {
    corsHeaders["Access-Control-Allow-Credentials"] = "true";
  }
  
  return corsHeaders;
}

// 最適化されたログ出力関数
function log(env: Env, level: string, message: string, ...args: any[]) {
  const isProduction = env.ENVIRONMENT === "production";
  const logLevel = env.LOG_LEVEL || (isProduction ? "warn" : "debug");
  const levels = { debug: 0, info: 1, warn: 2, error: 3 };
  
  // 本番環境では重要なログのみ出力
  if (levels[level as keyof typeof levels] >= levels[logLevel as keyof typeof levels]) {
    if (isProduction) {
      // 本番環境では簡潔なログ
      console.log(`[${level.toUpperCase()}] ${message}`);
    } else {
      // 開発環境では詳細なログ
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`, ...args);
    }
  }
}

// 最適化されたCORSレスポンス処理
const withCors = (r: Response, env: Env, origin?: string) => {
  const corsHeaders = getCorsHeaders(env, origin);
  
  // 本番環境ではキャッシュヘッダーを追加
  if (env.ENVIRONMENT === "production") {
    corsHeaders["Cache-Control"] = "no-cache, no-store, must-revalidate";
    corsHeaders["Pragma"] = "no-cache";
    corsHeaders["Expires"] = "0";
  }
  
  // 既存のヘッダーとCORSヘッダーをマージ
  const existingHeaders = Object.fromEntries(r.headers.entries());
  const mergedHeaders = {
    ...existingHeaders,
    ...corsHeaders
  };
  
  return new Response(r.body, { 
    status: r.status,
    statusText: r.statusText,
    headers: mergedHeaders
  });
};

router.options("*", (req: Request, env: Env) => {
  const origin = req.headers.get("Origin") || undefined;
  const corsHeaders = getCorsHeaders(env, origin);
  return new Response(null, { headers: corsHeaders });
});

router.get("/healthz", async (req: Request, env: Env) => {
  try {
    const origin = req.headers.get("Origin") || undefined;
    const userAgent = req.headers.get("User-Agent") || "unknown";
    const timestamp = new Date().toISOString();
    
    log(env, "info", "[Healthz] ヘルスチェック受信:", {
      origin,
      userAgent,
      timestamp,
      ip: req.headers.get("CF-Connecting-IP") || "unknown"
    });
    
    // 基本的なヘルスチェック
    const healthData = {
      status: "ok",
      timestamp,
      environment: env.ENVIRONMENT || "unknown",
      origin: origin || "no-origin",
      userAgent: userAgent.substring(0, 100) // 長すぎる場合は切り詰め
    };
    
    return withCors(Response.json(healthData), env, origin);
    
  } catch (error) {
    log(env, "error", "[Healthz] ヘルスチェック失敗:", error);
    const origin = req.headers.get("Origin") || undefined;
    const headers = getCorsHeaders(env, origin);
    return new Response(JSON.stringify({ 
      status: "error", 
      message: "Service Unavailable",
      timestamp: new Date().toISOString()
    }), { 
      status: 503, 
      headers: {
        ...headers,
        "Content-Type": "application/json"
      }
    });
  }
});

router.get("/favicon.ico", () => new Response(null, { status: 204 }));

// デバッグ用：環境変数の確認
router.get("/debug/env", (req: Request, env: Env) => {
  const origin = req.headers.get("Origin") || undefined;
  const debugInfo = {
    ENVIRONMENT: env.ENVIRONMENT,
    ENABLE_RATE_LIMIT: env.ENABLE_RATE_LIMIT,
    RATE_AUTO_PER_MIN: env.RATE_AUTO_PER_MIN,
    RATE_REPORT_PER_5MIN: env.RATE_REPORT_PER_5MIN,
    LOG_LEVEL: env.LOG_LEVEL,
    ALLOWED_ORIGINS: env.ALLOWED_ORIGINS,
    // Stripe関連の設定は削除済み（外部サイトへのリンクのみ）
  };
  return withCors(Response.json(debugInfo), env, origin);
});

// Durable Object監視エンドポイント（認証付き）
router.get("/debug/monitoring", (req: Request, env: Env) => {
  const origin = req.headers.get("Origin") || undefined;
  
  // 認証チェック
  const authHeader = req.headers.get("Authorization");
  const expectedToken = env.MONITORING_AUTH_TOKEN;
  
  if (!expectedToken) {
    log(env, "warn", "Monitoring auth token not configured");
    return withCors(Response.json({ 
      error: "Monitoring not configured",
      timestamp: new Date().toISOString()
    }, { status: 503 }), env, origin);
  }
  
  if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
    log(env, "warn", "Invalid monitoring auth token");
    return withCors(Response.json({ 
      error: "Unauthorized",
      timestamp: new Date().toISOString()
    }, { status: 401 }), env, origin);
  }
  
  // IP制限（本番環境のみ）
  if (env.ENVIRONMENT === "production") {
    const clientIP = req.headers.get("CF-Connecting-IP") || req.headers.get("X-Forwarded-For");
    const allowedIPs = env.MONITORING_ALLOWED_IPS?.split(',') || [];
    
    if (allowedIPs.length > 0 && clientIP && !allowedIPs.includes(clientIP)) {
      log(env, "warn", `Unauthorized monitoring access from IP: ${clientIP}`);
      return withCors(Response.json({ 
        error: "Forbidden",
        timestamp: new Date().toISOString()
      }, { status: 403 }), env, origin);
    }
  }
  
  try {
    const monitoringData = exportMonitoringData();
    return withCors(Response.json(monitoringData), env, origin);
  } catch (error) {
    log(env, "error", "Monitoring data export failed", error);
    return withCors(Response.json({ 
      error: "Failed to export monitoring data",
      timestamp: new Date().toISOString()
    }, { status: 500 }), env, origin);
  }
});

router.post("/rooms", async (req: Request, env: Env) => {
  const roomId = genRoomId();
  await env.MOD_KV.put(`room:${roomId}`, "1", { expirationTtl: 3600 });
  try {
    const body = await req.json().catch(() => null) as any;
    const mode = String(body?.mode ?? "");
    if (mode) await env.MOD_KV.put(`mode:${roomId}`, mode, { expirationTtl: 3600 });
    
    // 知り合いモードのルーム作成時はisAutoRoomをfalseに設定
    await env.MOD_KV.put(`flags:${roomId}`, JSON.stringify({ isAutoRoom: false }), { expirationTtl: 3600 });
  } catch {}
  const origin = req.headers.get("Origin") || undefined;
  return withCors(Response.json({ roomId }), env, origin);
});

router.get("/rooms/:roomId/exists", async (request: Request & { params: any }, env: Env) => {
  const key = `room:${(request.params.roomId ?? "").toUpperCase()}`;
  const v = await env.MOD_KV.get(key);
  const origin = request.headers.get("Origin") || undefined;
  if (v) return withCors(Response.json({ exists: true }), env, origin);
  return withCors(new Response("Not Found", { status: 404 }), env, origin);
});

router.get("/ws/room/:roomId", (request: Request & { params: any }, env: Env) => {
  const id = env.DO_ROOMS.idFromName(request.params.roomId);
  const stub = env.DO_ROOMS.get(id);
  return stub.fetch(request);
});

// 通報ロックチェックAPI
router.get("/report/status/:installId", async (request: Request & { params: any }, env: Env) => {
  const installId = request.params.installId;
  
  try {
    // 今日の日付（JST 0:00基準）
    const now = new Date();
    const jstOffset = 9 * 60; // JST = UTC+9
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const jst = new Date(utc + (jstOffset * 60000));
    const today = jst.toISOString().split('T')[0]; // YYYY-MM-DD形式
    
    // 該当するinstallIdの通報データを取得
    const prefix = `report:${installId}:`;
    const reports = await env.MOD_KV.list({ prefix });
    
    let totalPoints = 0;
    const reportDetails: Array<{ targetPlayerId: string; points: number; timestamp: number; roomId: string }> = [];
    
    // 今日の通報データのみを集計
    for (const key of reports.keys) {
      const reportData = await env.MOD_KV.get(key.name);
      if (reportData) {
        try {
          const report = JSON.parse(reportData);
          if (report.date === today) {
            totalPoints += report.points;
            reportDetails.push({
              targetPlayerId: report.targetPlayerId,
              points: report.points,
              timestamp: report.timestamp,
              roomId: report.roomId
            });
          }
        } catch (error) {
          console.warn(`[Report Status] 通報データの解析に失敗: ${key.name}`, error);
        }
      }
    }
    
    // ロック判定（65ポイント以上でロック）
    const isLocked = totalPoints >= 65;
    const unlockTime = isLocked ? new Date(jst.getTime() + 24 * 60 * 60 * 1000).toISOString() : null;
    
    const response = {
      installId,
      totalPoints,
      isLocked,
      unlockTime,
      reportCount: reportDetails.length,
      reports: reportDetails
    };
    
    const origin = request.headers.get("Origin") || undefined;
    return withCors(Response.json(response), env, origin);
    
  } catch (error) {
    console.error(`[Report Status] エラー:`, error);
    const origin = request.headers.get("Origin") || undefined;
    const headers = getCorsHeaders(env, origin);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers
    });
  }
});

// 通報送信API
router.post("/report", async (request: Request, env: Env) => {
  try {
    // レート制限チェック
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(clientIP, "/report", env);
    
    if (!rateLimit.allowed) {
      const origin = request.headers.get("Origin") || undefined;
      const headers = getCorsHeaders(env, origin);
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers
      });
    }
    
    const body = await request.json().catch(() => null) as any;
    if (!body) {
      const origin = request.headers.get("Origin") || undefined;
      return withCors(Response.json({ error: "Invalid request body" }, { status: 400 }), env, origin);
    }
    
    const { installId, targetPlayerId, roomId, phase } = body;
    
    // 必須パラメータの検証
    if (!installId || !targetPlayerId || !roomId || !phase) {
      const origin = request.headers.get("Origin") || undefined;
      return withCors(Response.json({ error: "Missing required parameters" }, { status: 400 }), env, origin);
    }
    
    // 議論シーンのみ通報可能
    if (phase !== "DISCUSS") {
      const origin = request.headers.get("Origin") || undefined;
      return withCors(Response.json({ error: "Reports are only allowed during discussion phase" }, { status: 400 }), env, origin);
    }
    
    // 自己通報不可
    if (installId === targetPlayerId) {
      const origin = request.headers.get("Origin") || undefined;
      return withCors(Response.json({ error: "Self-reporting is not allowed" }, { status: 400 }), env, origin);
    }
    
    // 今日の日付（JST 0:00基準）
    const now = new Date();
    const jstOffset = 9 * 60; // JST = UTC+9
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const jst = new Date(utc + (jstOffset * 60000));
    const today = jst.toISOString().split('T')[0]; // YYYY-MM-DD形式
    
    // 同一相手への当日通報チェック
    const existingReportKey = `report:${installId}:${targetPlayerId}`;
    const existingReport = await env.MOD_KV.get(existingReportKey);
    
    if (existingReport) {
      try {
        const existingData = JSON.parse(existingReport);
        if (existingData.date === today) {
          const origin = request.headers.get("Origin") || undefined;
          return withCors(Response.json({ error: "Already reported this player today" }, { status: 400 }), env, origin);
        }
      } catch (error) {
        console.warn(`[Report] 既存通報データの解析に失敗:`, error);
      }
    }
    
    // 通報データを保存
    const reportKey = `report:${installId}:${targetPlayerId}`;
    const reportData = {
      installId,
      targetPlayerId,
      roomId,
      phase,
      points: 4, // 固定で4点
      date: today,
      timestamp: Date.now()
    };
    
    await env.MOD_KV.put(reportKey, JSON.stringify(reportData), {
      expirationTtl: 24 * 60 * 60 // 24時間で自動削除
    });
    
    log(env, "info", `[Report] 通報成功: ${installId} -> ${targetPlayerId} (${roomId})`);
    
    const response = {
      ok: true,
      points: 4,
      totalPoints: await calculateTotalPoints(env, installId, today)
    };
    
    const origin = request.headers.get("Origin") || undefined;
    return withCors(Response.json(response), env, origin);
    
  } catch (error) {
    log(env, "error", `[Report] 通報処理エラー:`, error);
    const origin = request.headers.get("Origin") || undefined;
    return withCors(Response.json({ error: "Internal server error" }, { status: 500 }), env, origin);
  }
});

// 通報ポイントの合計を計算するヘルパー関数
async function calculateTotalPoints(env: Env, installId: string, date: string): Promise<number> {
  try {
    const prefix = `report:${installId}:`;
    const reports = await env.MOD_KV.list({ prefix });
    
    let totalPoints = 0;
    
    for (const key of reports.keys) {
      const reportData = await env.MOD_KV.get(key.name);
      if (reportData) {
        try {
          const report = JSON.parse(reportData);
          if (report.date === date) {
            totalPoints += report.points || 0;
          }
        } catch (error) {
          console.warn(`[Calculate Points] 通報データの解析に失敗: ${key.name}`, error);
        }
      }
    }
    
    return totalPoints;
  } catch (error) {
    console.error(`[Calculate Points] エラー:`, error);
    return 0;
  }
}

// モード別のルーム管理（各モードで独立したルームプール）
const modeRooms = new Map<string, string[]>(); // mode -> [roomId1, roomId2, ...]

// ルームの有効性をチェックする関数
async function checkRoomValidity(env: Env, roomId: string): Promise<boolean> {
  try {
    const roomExists = await env.MOD_KV.get(`room:${roomId}`);
    return !!roomExists;
  } catch {
    return false;
  }
}

// 利用可能なルームを探す関数
async function findAvailableRoom(env: Env, mode: string): Promise<string | null> {
  try {
    const roomIds = modeRooms.get(mode) || [];
    log(env, "info", `[Auto] モード ${mode} で登録されているルーム: ${roomIds.join(', ')}`);
    
    // 各ルームの状態を直接確認
    for (const roomId of roomIds) {
      try {
        // RoomDOの状態を直接取得
        const roomIdObj = env.DO_ROOMS.idFromName(roomId);
        const roomStub = env.DO_ROOMS.get(roomIdObj);
        const response = await roomStub.fetch(new Request(`http://dummy/state`));
        
        if (response.ok) {
          const roomState = await response.json() as any;
          const playerCount = roomState.players?.length || 0;
          log(env, "info", `[Auto] ルーム ${roomId} の現在のプレイヤー数: ${playerCount}, フェーズ: ${roomState.phase}`);
          
          // LOBBYフェーズで3人未満の場合は利用可能
          if (roomState.phase === "LOBBY" && playerCount < 3) {
            log(env, "info", `[Auto] 利用可能なルーム ${roomId} を発見 (プレイヤー数: ${playerCount})`);
            return roomId;
          }
        }
      } catch (error) {
        log(env, "warn", `[Auto] ルーム ${roomId} の状態確認に失敗:`, error);
        // 無効なルームとして扱い、後でクリーンアップ
        continue;
      }
    }
    
    log(env, "info", `[Auto] モード ${mode} で利用可能なルームが見つかりません`);
    return null;
  } catch (error) {
    log(env, "error", `[Auto] ルーム検索エラー:`, error);
    return null;
  }
}

// 新しいルームをモードに追加する関数
function addRoomToMode(mode: string, roomId: string, env: Env) {
  if (!modeRooms.has(mode)) {
    modeRooms.set(mode, []);
  }
  const roomIds = modeRooms.get(mode)!;
  roomIds.push(roomId);
  log(env, "info", `[Auto] モード ${mode} で新規ルーム ${roomId} を作成しました`);
}

// ルームをモードから削除する関数
function removeRoomFromMode(mode: string, roomId: string, env: Env) {
  if (modeRooms.has(mode)) {
    const roomIds = modeRooms.get(mode)!;
    const index = roomIds.indexOf(roomId);
    if (index > -1) {
      roomIds.splice(index, 1);
      log(env, "info", `[Auto] モード ${mode} で新規ルーム ${roomId} を作成しました`);
      
      if (roomIds.length === 0) {
        modeRooms.delete(mode);
        log(env, "info", `[Auto] モード ${mode} のルームが0になったため、モードを削除しました`);
      }
    }
  }
}

// ルームの状態を確認してmodeRoomsを更新する関数
async function updateModeRooms(env: Env) {
  for (const [mode, roomIds] of modeRooms.entries()) {
    const validRoomIds = [];
    
    for (const roomId of roomIds) {
      try {
        // RoomDOの状態を確認
        const roomIdObj = env.DO_ROOMS.idFromName(roomId);
        const roomStub = env.DO_ROOMS.get(roomIdObj);
        const response = await roomStub.fetch(new Request(`http://dummy/state`));
        
        if (response.ok) {
          const roomState = await response.json() as any;
          // ルームが存在し、LOBBYフェーズの場合は有効
          if (roomState && roomState.phase === "LOBBY") {
            validRoomIds.push(roomId);
          } else {
            log(env, "info", `[Auto] 無効なルーム ${roomId} をクリーンアップ (mode: ${mode}, phase: ${roomState?.phase})`);
          }
        } else {
          log(env, "info", `[Auto] 存在しないルーム ${roomId} をクリーンアップ (mode: ${mode})`);
        }
      } catch (error) {
        log(env, "warn", `[Auto] ルーム ${roomId} の状態確認に失敗:`, error);
        // エラーの場合は無効として扱う
        continue;
      }
    }
    
    if (validRoomIds.length > 0) {
      modeRooms.set(mode, validRoomIds);
    } else {
      modeRooms.delete(mode);
      log(env, "info", `[Auto] モード ${mode} の有効なルームが0になったため、モードを削除しました`);
    }
  }
}

// レート制限の実装
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// 最適化されたレート制限
function checkRateLimit(ip: string, endpoint: string, env: Env): { allowed: boolean; retryAfter?: number } {
  const isProduction = env.ENVIRONMENT === "production";
  const enableRateLimit = isProduction || env.ENABLE_RATE_LIMIT === "true";
  
  // レート制限が無効化されている場合は許可
  if (!enableRateLimit) {
    return { allowed: true };
  }
  
  const now = Date.now();
  const key = `${ip}:${endpoint}`;
  const limit = rateLimitStore.get(key);
  
  // エンドポイント別の制限設定
  let maxRequests: number;
  let windowMs: number;
  
  if (endpoint === "/auto") {
    maxRequests = parseInt(env.RATE_AUTO_PER_MIN || "30"); // 仕様通り: 30 req/min
    windowMs = 60 * 1000;
  } else if (endpoint === "/report") {
    maxRequests = parseInt(env.RATE_REPORT_PER_5MIN || "60"); // 仕様通り: 60 req/5min
    windowMs = 5 * 60 * 1000;
  // Stripe関連のレート制限は削除済み（外部サイトへのリンクのみ）
  } else {
    return { allowed: true };
  }
  
  if (!limit || now > limit.resetTime) {
    // 新しい時間窓を開始
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }
  
  if (limit.count >= maxRequests) {
    // レート制限超過
    const retryAfter = Math.ceil((limit.resetTime - now) / 1000);
    log(env, "warn", `Rate limit exceeded: ${ip} on ${endpoint} - retry after ${retryAfter}s`);
    return { allowed: false, retryAfter };
  }
  
  // カウントを増加
  limit.count++;
  return { allowed: true };
}

// IPアドレスを取得する関数
function getClientIP(request: Request): string {
  // Cloudflare WorkersではCF-Connecting-IPヘッダーからIPを取得
  const cfIP = request.headers.get("CF-Connecting-IP");
  if (cfIP) return cfIP;
  
  // フォールバック
  const xForwardedFor = request.headers.get("X-Forwarded-For");
  if (xForwardedFor) return xForwardedFor.split(",")[0].trim();
  
  // デフォルト
  return "unknown";
}

router.post("/auto", async (req: Request, env: Env) => {
  try {
    // レート制限チェック
    const clientIP = getClientIP(req);
    const rateLimit = checkRateLimit(clientIP, "/auto", env);
    
    if (!rateLimit.allowed) {
      const origin = req.headers.get("Origin") || undefined;
      const headers = getCorsHeaders(env, origin);
      headers["Retry-After"] = rateLimit.retryAfter?.toString() || "60";
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers
      });
    }
    
    // modeRoomsの状態を更新
    await updateModeRooms(env);
    log(env, "info", `[Auto] 現在のmodeRooms状態:`, Object.fromEntries(modeRooms));
    
    const body = await req.json().catch(() => null) as any;
    const mode = String(body?.mode ?? "STRANGER");
    const nick = String(body?.nick || "");
    const installId = String(body?.installId ?? "");

    if (!nick || !installId) {
      const origin = req.headers.get("Origin") || undefined;
      return withCors(Response.json({ error: "Invalid parameters" }, { status: 400 }), env, origin);
    }

    let roomId: string;
    let isNewRoom = false;

    // 指定されたモードで利用可能なルームを探す
    const availableRoomId = await findAvailableRoom(env, mode);
    
    if (availableRoomId) {
      // 利用可能な既存ルームに参加
      roomId = availableRoomId;
      isNewRoom = false;
      log(env, "info", `[Auto] モード ${mode} の既存ルーム ${roomId} に参加します`);
      
      // 既存ルームでもisAutoRoomフラグを設定
      await env.MOD_KV.put(`flags:${roomId}`, JSON.stringify({ isAutoRoom: true }), { expirationTtl: 1800 });
    } else {
      // 新規ルームを作成
      roomId = genRoomId();
      isNewRoom = true;
      addRoomToMode(mode, roomId, env);
      log(env, "info", `[Auto] モード ${mode} で新規ルーム ${roomId} を作成しました`);
    }

    // ルーム情報をKVに保存（新規ルームの場合のみ）
    if (isNewRoom) {
      await env.MOD_KV.put(`room:${roomId}`, "1", { expirationTtl: 1800 });
      await env.MOD_KV.put(`auto:${roomId}`, "1", { expirationTtl: 600 });
      await env.MOD_KV.put(`mode:${roomId}`, mode, { expirationTtl: 1800 });
      // 自動マッチングルームフラグを設定
      await env.MOD_KV.put(`flags:${roomId}`, JSON.stringify({ isAutoRoom: true }), { expirationTtl: 1800 });
    }

    const origin = req.headers.get("Origin") || undefined;
    return withCors(Response.json({ roomId, isNewRoom }), env, origin);
  } catch (error) {
    log(env, "error", "[Auto] Error:", error);
    const origin = req.headers.get("Origin") || undefined;
    return withCors(Response.json({ error: "Internal server error" }, { status: 500 }), env, origin);
  }
});

// Stripe関連のAPIエンドポイントは削除済み（外部サイトへのリンクのみ）

router.all("*", (req: Request, env: Env) => {
  const origin = req.headers.get("Origin") || undefined;
  return withCors(new Response("Not Found", { status: 404 }), env, origin);
});

// 最適化されたメインエントリーポイント
export default {
  fetch: async (request: Request, env: Env, ctx: ExecutionContext) => {
    const startTime = Date.now();
    const origin = request.headers.get("Origin") || undefined;
    
    try {
      // リクエスト処理
      const response = await router.fetch(request, env, ctx);
      
      // 本番環境ではパフォーマンスログを出力
      if (env.ENVIRONMENT === "production") {
        const duration = Date.now() - startTime;
        if (duration > 1000) { // 1秒以上かかった場合のみログ
          log(env, "warn", `Slow request: ${request.method} ${request.url} - ${duration}ms`);
        }
      }
      
      return response;
    } catch (error) {
      // エラーログを出力
      log(env, "error", `Request failed: ${request.method} ${request.url}`, error);
      
      // エラーレスポンスを返す
      return new Response(JSON.stringify({ 
        error: "Internal Server Error",
        timestamp: new Date().toISOString()
      }), { 
        status: 500, 
        headers: {
          ...getCorsHeaders(env, origin),
          "Content-Type": "application/json"
        }
      });
    }
  }
}; 