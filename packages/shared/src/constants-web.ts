/**
 * ウェブ版専用の軽量定数
 * PWA向けに最適化された最小限の定数定義
 */

// ゲーム設定
export const ROOM_CAPACITY = 8;
export const SECRET_MAX = 20;
export const ICON_POOL_SIZE = 20;

// PWA設定
export const PWA_CACHE_VERSION = "1.0.0";
export const PWA_CACHE_NAME = "secret-werewolf-cache";

// 課金設定
export const PAYMENT_CURRENCY = "jpy";
export const PAYMENT_MIN_AMOUNT = 100; // 最小課金額（円）

// セキュリティ設定
export const MAX_MESSAGE_LENGTH = 200;
export const MAX_NICKNAME_LENGTH = 20;
export const RATE_LIMIT_WINDOW = 60000; // 1分

// パフォーマンス設定
export const WEBSOCKET_TIMEOUT = 5000;
export const RECONNECT_DELAY = 1000;
export const MAX_RECONNECT_ATTEMPTS = 5;

// デバッグ設定（本番では無効化）
export const DEBUG_MODE = false;
export const LOG_LEVEL = "warn";
