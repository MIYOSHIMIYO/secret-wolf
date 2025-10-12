/**
 * アプリケーション設定管理
 */

// 環境判定
export const isProduction = import.meta.env.PROD;
export const isDevelopment = import.meta.env.DEV;

// WebSocket設定
// vite.config.tsで設定されたVITE_WORKER_WSを使用
export const WS_CONFIG = {
  BASE_URL: import.meta.env.VITE_WORKER_WS,
  // 開発時は応答性重視の高速設定、本番は安定性重視
  TIMEOUT: isProduction ? 15000 : 5000,
  HEARTBEAT_INTERVAL: isProduction ? 10000 : 3000,
  MAX_RECONNECT_ATTEMPTS: isProduction ? 5 : 10,
  BACKOFF_BASE: isProduction ? 1000 : 300,
  BACKOFF_MAX: isProduction ? 30000 : 5000,
  BACKOFF_MULTIPLIER: isProduction ? 2.0 : 1.25
};

// RevenueCat設定
export const REVENUECAT_CONFIG = {
  ENABLED: isProduction || import.meta.env.VITE_IAP_ENABLED === "true",
  API_KEY: isProduction 
    ? import.meta.env.VITE_RC_PUBLIC_API_KEY_PROD
    : import.meta.env.VITE_RC_PUBLIC_API_KEY_DEV
};

// アプリ情報
export const APP_INFO = {
  VERSION: import.meta.env.VITE_APP_VERSION || '1.0.1',
  BUILD_TIME: import.meta.env.VITE_BUILD_TIME || new Date().toISOString(),
  NAME: '秘密人狼'
};

// デバッグ設定
export const DEBUG_CONFIG = {
  ENABLED: !isProduction,
  LOG_LEVEL: isProduction ? 'error' : 'debug',
  ENABLE_WEBSOCKET_LOGS: !isProduction
};

// 環境情報を取得
export const getEnvironmentInfo = () => {
  return {
    isProduction,
    isDevelopment,
    isCapacitor: typeof window !== 'undefined' && (window as any).Capacitor !== undefined,
    isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    wsUrl: WS_CONFIG.BASE_URL,
    revenueCatEnabled: REVENUECAT_CONFIG.ENABLED
  };
};
