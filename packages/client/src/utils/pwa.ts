/**
 * PWA (Progressive Web App) ユーティリティ
 * Phase 1: 基本機能のみ実装
 */

interface PWAInstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export class PWAManager {
  private deferredPrompt: PWAInstallPrompt | null = null;
  private isInstalled = false;
  private isOnline = navigator.onLine;

  constructor() {
    this.setupEventListeners();
    this.checkInstallStatus();
  }

  /**
   * イベントリスナーの設定
   */
  private setupEventListeners(): void {
    // インストールプロンプトのキャプチャ
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('[PWA] Install prompt captured');
      e.preventDefault();
      this.deferredPrompt = e as PWAInstallPrompt;
    });

    // アプリのインストール完了
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed successfully');
      this.isInstalled = true;
      this.deferredPrompt = null;
    });

    // オンライン/オフライン状態の監視
    window.addEventListener('online', () => {
      console.log('[PWA] App is online');
      this.isOnline = true;
    });

    window.addEventListener('offline', () => {
      console.log('[PWA] App is offline');
      this.isOnline = false;
    });

    // Service Workerの更新通知
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[PWA] Service Worker updated');
        this.showUpdateNotification();
      });
    }
  }

  /**
   * インストール状態の確認
   */
  private checkInstallStatus(): void {
    // スタンドアロンモードで実行されているかチェック
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
      console.log('[PWA] App is running in standalone mode');
    }

    // iOS Safariの特別な処理
    if (this.isIOS()) {
      this.checkIOSInstallStatus();
    }
  }

  /**
   * iOS Safariのインストール状態確認
   */
  private checkIOSInstallStatus(): void {
    // iOS Safariではbeforeinstallpromptイベントが発火しないため、
    // スタンドアロンモードで実行されているかで判定
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
    }
  }

  /**
   * iOS Safariかどうかの判定
   */
  private isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  /**
   * インストールプロンプトの表示
   */
  async showInstallPrompt(): Promise<boolean> {
    if (!this.deferredPrompt) {
      console.log('[PWA] No install prompt available');
      return false;
    }

    try {
      await this.deferredPrompt.prompt();
      const choiceResult = await this.deferredPrompt.userChoice;
      
      console.log('[PWA] User choice:', choiceResult.outcome);
      this.deferredPrompt = null;
      
      return choiceResult.outcome === 'accepted';
    } catch (error) {
      console.error('[PWA] Install prompt failed:', error);
      return false;
    }
  }

  /**
   * インストール可能かどうかの確認
   */
  canInstall(): boolean {
    return this.deferredPrompt !== null;
  }

  /**
   * インストール済みかどうかの確認
   */
  isAppInstalled(): boolean {
    return this.isInstalled;
  }

  /**
   * オンライン状態の確認
   */
  isAppOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Service Workerの登録
   */
  async registerServiceWorker(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      console.log('[PWA] Service Worker not supported');
      return false;
    }

    try {
      // Service Workerファイルの存在確認
      const response = await fetch('/sw.js', { method: 'HEAD' });
      if (!response.ok || !response.headers.get('content-type')?.includes('javascript')) {
        console.log('[PWA] Service Worker file not available or wrong MIME type');
        return false;
      }

      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('[PWA] Service Worker registered:', registration);

      // 更新の確認
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] New Service Worker available');
              this.showUpdateNotification();
            }
          });
        }
      });

      return true;
    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
      return false;
    }
  }

  /**
   * 更新通知の表示
   */
  private showUpdateNotification(): void {
    // 実際のアプリでは、トースト通知やモーダルで表示
    console.log('[PWA] New version available. Please refresh the page.');
    
    // 簡単な確認ダイアログ（本番では適切なUIに置き換え）
    if (confirm('新しいバージョンが利用可能です。ページを更新しますか？')) {
      window.location.reload();
    }
  }

  /**
   * キャッシュのクリア
   */
  async clearCache(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        // Service Workerにメッセージを送信してキャッシュをクリア
        const messageChannel = new MessageChannel();
        
        return new Promise((resolve) => {
          messageChannel.port1.onmessage = (event) => {
            resolve(event.data.success);
          };
          
          registration.active?.postMessage(
            { type: 'CLEAR_CACHE' },
            [messageChannel.port2]
          );
        });
      }
      return false;
    } catch (error) {
      console.error('[PWA] Cache clear failed:', error);
      return false;
    }
  }

  /**
   * PWA機能のサポート状況確認
   */
  getSupportStatus(): {
    serviceWorker: boolean;
    pushManager: boolean;
    backgroundSync: boolean;
    beforeInstallPrompt: boolean;
  } {
    return {
      serviceWorker: 'serviceWorker' in navigator,
      pushManager: 'PushManager' in window,
      backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
      beforeInstallPrompt: 'onbeforeinstallprompt' in window
    };
  }

  /**
   * iOS Safari用のインストールガイド表示
   */
  showIOSInstallGuide(): void {
    const isIOS = this.isIOS();
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    
    if (isIOS && !isInStandaloneMode) {
      // iOS Safari用のインストールガイドを表示
      console.log('[PWA] iOS Safari install guide should be shown');
      // 実際のアプリでは、モーダルやツールチップで表示
    }
  }
}

/**
 * PWAマネージャーのシングルトンインスタンス
 */
export const pwaManager = new PWAManager();

/**
 * PWA初期化のヘルパー関数
 */
export async function initializePWA(): Promise<void> {
  console.log('[PWA] Initializing PWA...');
  
  // Service Workerの登録
  await pwaManager.registerServiceWorker();
  
  // インストール状態の確認
  if (pwaManager.isAppInstalled()) {
    console.log('[PWA] App is already installed');
  } else if (pwaManager.canInstall()) {
    console.log('[PWA] App can be installed');
  } else {
    console.log('[PWA] App installation not available');
  }
  
  // iOS Safari用の特別処理
  if (pwaManager.isAppOnline()) {
    pwaManager.showIOSInstallGuide();
  }
}
