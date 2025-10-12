/**
 * デバッグヘルパー - 並行テスト用
 */

import { getEnvironmentInfo } from '@/lib/config';

export interface DebugInfo {
  environment: 'production' | 'development';
  platform: 'ios' | 'android' | 'browser';
  timestamp: string;
  userAgent: string;
  wsUrl: string;
  isCapacitor: boolean;
  isMobile: boolean;
  revenueCatEnabled: boolean;
  connectionState?: string;
  lastError?: string;
}

export class DebugHelper {
  private static instance: DebugHelper;
  private debugLogs: Array<{ timestamp: string; level: string; message: string; data?: any }> = [];
  private maxLogs = 100;

  static getInstance(): DebugHelper {
    if (!DebugHelper.instance) {
      DebugHelper.instance = new DebugHelper();
    }
    return DebugHelper.instance;
  }

  /**
   * 環境情報を取得
   */
  getEnvironmentInfo(): DebugInfo {
    const envInfo = getEnvironmentInfo();
    return {
      environment: envInfo.isProduction ? 'production' : 'development',
      platform: this.detectPlatform(),
      timestamp: new Date().toISOString(),
      userAgent: envInfo.userAgent,
      wsUrl: envInfo.wsUrl,
      isCapacitor: envInfo.isCapacitor,
      isMobile: envInfo.isMobile,
      revenueCatEnabled: envInfo.revenueCatEnabled
    };
  }

  /**
   * プラットフォームを検出
   */
  private detectPlatform(): 'ios' | 'android' | 'browser' {
    if (typeof window === 'undefined') return 'browser';
    
    const userAgent = navigator.userAgent;
    
    if (/iPhone|iPad|iPod/.test(userAgent)) {
      return 'ios';
    } else if (/Android/.test(userAgent)) {
      return 'android';
    } else {
      return 'browser';
    }
  }

  /**
   * デバッグログを記録
   */
  log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };

    this.debugLogs.push(logEntry);
    
    // ログ数を制限
    if (this.debugLogs.length > this.maxLogs) {
      this.debugLogs = this.debugLogs.slice(-this.maxLogs);
    }

    // コンソールに出力
    const logMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    logMethod(`[DebugHelper] ${message}`, data || '');
  }

  /**
   * 接続状態を記録
   */
  logConnectionState(state: string, details?: any): void {
    this.log('info', `Connection state: ${state}`, details);
  }

  /**
   * エラーを記録
   */
  logError(error: Error | string, context?: any): void {
    const errorMessage = error instanceof Error ? error.message : error;
    this.log('error', `Error: ${errorMessage}`, { context, stack: error instanceof Error ? error.stack : undefined });
  }

  /**
   * デバッグ情報を取得
   */
  getDebugInfo(): {
    environment: DebugInfo;
    logs: Array<{ timestamp: string; level: string; message: string; data?: any }>;
    summary: {
      totalLogs: number;
      errorCount: number;
      warnCount: number;
      infoCount: number;
    };
  } {
    const errorCount = this.debugLogs.filter(log => log.level === 'error').length;
    const warnCount = this.debugLogs.filter(log => log.level === 'warn').length;
    const infoCount = this.debugLogs.filter(log => log.level === 'info').length;

    return {
      environment: this.getEnvironmentInfo(),
      logs: [...this.debugLogs],
      summary: {
        totalLogs: this.debugLogs.length,
        errorCount,
        warnCount,
        infoCount
      }
    };
  }

  /**
   * デバッグ情報をエクスポート（ファイルダウンロード用）
   */
  exportDebugInfo(): void {
    const debugInfo = this.getDebugInfo();
    const dataStr = JSON.stringify(debugInfo, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `debug-info-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * ログをクリア
   */
  clearLogs(): void {
    this.debugLogs = [];
    this.log('info', 'Debug logs cleared');
  }

  /**
   * パフォーマンス測定
   */
  measurePerformance<T>(name: string, fn: () => T | Promise<T>): Promise<T> {
    const start = performance.now();
    this.log('info', `Performance measurement started: ${name}`);
    
    return Promise.resolve(fn()).then(
      (result) => {
        const end = performance.now();
        const duration = end - start;
        this.log('info', `Performance measurement completed: ${name}`, { duration: `${duration.toFixed(2)}ms` });
        return result;
      },
      (error) => {
        const end = performance.now();
        const duration = end - start;
        this.log('error', `Performance measurement failed: ${name}`, { duration: `${duration.toFixed(2)}ms`, error });
        throw error;
      }
    );
  }

  /**
   * ネットワーク状態を監視
   */
  startNetworkMonitoring(): void {
    if (typeof window === 'undefined') return;

    const updateNetworkStatus = () => {
      const isOnline = navigator.onLine;
      this.log('info', `Network status changed: ${isOnline ? 'online' : 'offline'}`);
    };

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    
    this.log('info', 'Network monitoring started');
  }

  /**
   * WebSocket状態を監視
   */
  monitorWebSocket(ws: WebSocket | null): void {
    if (!ws) {
      this.log('warn', 'WebSocket is null');
      return;
    }

    const getState = () => {
      switch (ws.readyState) {
        case WebSocket.CONNECTING: return 'connecting';
        case WebSocket.OPEN: return 'open';
        case WebSocket.CLOSING: return 'closing';
        case WebSocket.CLOSED: return 'closed';
        default: return 'unknown';
      }
    };

    this.logConnectionState(getState());

    ws.addEventListener('open', () => this.logConnectionState('open'));
    ws.addEventListener('close', (event) => this.logConnectionState('closed', { code: event.code, reason: event.reason }));
    ws.addEventListener('error', (event) => this.logError('WebSocket error', event));
  }
}

// グローバルインスタンス
export const debugHelper = DebugHelper.getInstance();

// 開発環境でのみ自動開始
if (import.meta.env.DEV) {
  debugHelper.startNetworkMonitoring();
  debugHelper.log('info', 'Debug helper initialized');
}
