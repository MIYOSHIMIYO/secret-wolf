/**
 * ネイティブアプリ専用の定数
 * Capacitor関連の設定を含む
 */

// ゲーム設定（共通）
export const ROOM_CAPACITY = 8;
export const SECRET_MAX = 20;
export const ICON_POOL_SIZE = 20;

// ネイティブアプリ設定
export const NATIVE_APP_VERSION = "1.0.0";
export const NATIVE_BUILD_NUMBER = 1;

// Capacitor設定
export const CAPACITOR_SCHEME = "capacitor";
export const CAPACITOR_HOST = "localhost";

// ネイティブ専用機能
export const NATIVE_FEATURES = {
  PUSH_NOTIFICATIONS: true,
  BACKGROUND_SYNC: true,
  NATIVE_STORAGE: true,
  DEVICE_INFO: true
};

// 課金設定（RevenueCat）
export const REVENUECAT_API_KEY = "appl_JWrJQnZKVFUzPZVCLJzCocwElST";
export const REVENUECAT_ENTITLEMENT_ID = "premium";

// 広告設定（AdMob）
export const ADMOB_APP_ID = "ca-app-pub-xxxxxxxxxxxxxxxx~xxxxxxxxxx";
export const ADMOB_BANNER_ID = "ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx";
export const ADMOB_INTERSTITIAL_ID = "ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx";

// デバッグ設定
export const DEBUG_MODE = false;
export const LOG_LEVEL = "warn";
