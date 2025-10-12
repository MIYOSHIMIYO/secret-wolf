// App Tracking Transparency の実装
// プラグインの可用性をチェックして適切に処理

import { AppTrackingTransparency } from 'capacitor-app-tracking-transparency';

export class AppTrackingTransparencyService {
  private static isPluginAvailable: boolean | null = null;

  /**
   * プラグインが利用可能かチェック
   */
  private static async checkPluginAvailability(): Promise<boolean> {
    if (this.isPluginAvailable !== null) {
      return this.isPluginAvailable;
    }

    try {
      // プラグインが存在し、必要なメソッドが利用可能かチェック
      const hasRequestMethod = typeof AppTrackingTransparency?.requestTrackingPermission === 'function';
      const hasStatusMethod = typeof AppTrackingTransparency?.getTrackingStatus === 'function';
      
      this.isPluginAvailable = hasRequestMethod && hasStatusMethod;
      
      if (!this.isPluginAvailable) {
        console.log('[ATT] プラグインが利用できません（メソッド不足）');
      }
      
      return this.isPluginAvailable;
    } catch (error) {
      console.log('[ATT] プラグインが利用できません（インポートエラー）:', error);
      this.isPluginAvailable = false;
      return false;
    }
  }

  /**
   * トラッキング許可をリクエスト
   */
  static async requestTrackingPermission(): Promise<boolean> {
    try {
      const isAvailable = await this.checkPluginAvailability();
      if (!isAvailable) {
        console.log('[ATT] プラグインが利用できないため、トラッキング許可をスキップします');
        return false;
      }
      
      const result = await AppTrackingTransparency.requestTrackingPermission();
      console.log('[ATT] トラッキング許可結果:', result);
      return result === 'authorized';
    } catch (error) {
      console.error('[ATT] トラッキング許可リクエストエラー:', error);
      return false;
    }
  }

  /**
   * トラッキング許可状態を取得
   */
  static async getTrackingStatus(): Promise<string> {
    try {
      const isAvailable = await this.checkPluginAvailability();
      if (!isAvailable) {
        console.log('[ATT] プラグインが利用できないため、デフォルト状態を返します');
        return 'not-determined';
      }
      
      const status = await AppTrackingTransparency.getTrackingStatus();
      console.log('[ATT] トラッキング許可状態:', status);
      return status;
    } catch (error) {
      console.error('[ATT] トラッキング許可状態取得エラー:', error);
      return 'not-determined';
    }
  }

  /**
   * トラッキング許可が必要かどうかを判定
   */
  static async shouldRequestTrackingPermission(): Promise<boolean> {
    const status = await this.getTrackingStatus();
    return status === 'not-determined';
  }
}
