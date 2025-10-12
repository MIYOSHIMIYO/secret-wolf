// App Tracking Transparency の実装
// Web環境では常に利用不可として処理

// Web環境ではCapacitorプラグインは利用できないため、型定義のみ
interface AppTrackingTransparency {
  requestTrackingPermission(): Promise<string>;
  getTrackingStatus(): Promise<string>;
}

export class AppTrackingTransparencyService {
  private static isPluginAvailable: boolean | null = null;

  /**
   * プラグインが利用可能かチェック
   * Web環境では常にfalseを返す
   */
  private static async checkPluginAvailability(): Promise<boolean> {
    if (this.isPluginAvailable !== null) {
      return this.isPluginAvailable;
    }

    // Web環境ではCapacitorプラグインは利用できない
    this.isPluginAvailable = false;
    console.log('[ATT] Web環境のため、プラグインは利用できません');
    
    return this.isPluginAvailable;
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
      
      // Web環境では直接呼び出さない
      const result = 'not-determined';
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
      
      // Web環境では直接呼び出さない
      const status = 'not-determined';
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
