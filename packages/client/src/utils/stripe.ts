/**
 * 統一されたStripe決済システム
 * 環境変数に依存しない設定管理
 */

import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';

// Stripeの型定義
interface StripePaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
}

interface StripeConfig {
  publishableKey: string;
  apiUrl: string;
  environment: 'development' | 'production';
}

/**
 * 統一されたStripe設定
 */
const getStripeConfig = (): StripeConfig => {
  const environment = import.meta.env.VITE_APP_ENVIRONMENT || 'development';
  const isProduction = environment === 'production';
  
  // デバッグログ
  console.log('[Stripe] Environment variables:', {
    VITE_APP_ENVIRONMENT: import.meta.env.VITE_APP_ENVIRONMENT,
    VITE_STRIPE_PUBLISHABLE_KEY: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
    VITE_API_URL: import.meta.env.VITE_API_URL,
    environment,
    isProduction,
    allEnvKeys: Object.keys(import.meta.env).filter(key => key.startsWith('VITE_'))
  });
  
  const envKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  console.log('[Stripe] Raw env key:', envKey, 'Type:', typeof envKey, 'Length:', envKey?.length);
  
  const config = {
    publishableKey: envKey && envKey !== 'undefined' && envKey !== '' ? envKey : 
      (isProduction ? 'pk_live_your_live_key_here' : 'pk_test_51234567890abcdef'),
    apiUrl: import.meta.env.VITE_API_URL || 
      (isProduction ? 'https://secret-werewolf-prod.qmdg2pmnw6.workers.dev' : 'http://localhost:8787'),
    environment: environment as 'development' | 'production'
  };
  
  console.log('[Stripe] Final config:', {
    publishableKey: config.publishableKey?.substring(0, 20) + '...',
    apiUrl: config.apiUrl,
    environment: config.environment
  });
  
  return config;
};

/**
 * 統一されたStripe決済マネージャー
 */
class UnifiedStripePaymentManager {
  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;
  private config: StripeConfig;

  constructor() {
    this.config = getStripeConfig();
  }

  /**
   * Stripeの初期化
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('[Stripe] Initializing with config:', {
        environment: this.config.environment,
        hasKey: !!this.config.publishableKey,
        keyPrefix: this.config.publishableKey?.substring(0, 20) + '...'
      });
      
      // Publishable Keyの検証
      if (!this.config.publishableKey || this.config.publishableKey.includes('your_')) {
        console.warn('[Stripe] Publishable Key not properly configured. Stripe functionality will be limited.');
        return false;
      }

      // Stripe SDKの読み込み
      this.stripe = await loadStripe(this.config.publishableKey);
      
      if (!this.stripe) {
        console.error('[Stripe] Failed to load Stripe SDK');
        return false;
      }

      console.log('[Stripe] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[Stripe] Initialization failed:', error);
      return false;
    }
  }

  /**
   * 決済意図の作成
   */
  async createPaymentIntent(amount: number, currency: string = 'jpy'): Promise<any> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    const response = await fetch(`${this.config.apiUrl}/api/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        currency,
        metadata: {
          environment: this.config.environment
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * 決済の確認
   */
  async confirmPayment(clientSecret: string, paymentMethodData: any): Promise<any> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    return await this.stripe.confirmPayment({
      clientSecret,
      confirmParams: {
        payment_method_data: paymentMethodData,
        return_url: window.location.origin + '/payment-success',
      },
    });
  }

  /**
   * Stripeインスタンスの取得
   */
  getStripe(): Stripe | null {
    return this.stripe;
  }

  /**
   * 設定の取得
   */
  getConfig(): StripeConfig {
    return this.config;
  }

  /**
   * 支払い履歴の取得
   */
  async getPaymentHistory(): Promise<{ success: boolean; payments?: any[]; error?: string }> {
    try {
      const response = await fetch(`${this.config.apiUrl}/payment-history`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch payment history');
      }

      const data = await response.json();
      return { success: true, payments: data.payments || [] };
    } catch (error) {
      console.error('[Stripe] Payment history fetch error:', error);
      return { success: false, error: '履歴の取得に失敗しました' };
    }
  }

  /**
   * 支払い要素の作成
   */
  async createPaymentElement(): Promise<{ success: boolean; element?: any; error?: string }> {
    try {
      if (!this.stripe) {
        return { success: false, error: 'Stripeが初期化されていません' };
      }
      // 実装は後で追加
      return { success: true, element: null };
    } catch (error) {
      return { success: false, error: '支払い要素の作成に失敗しました' };
    }
  }

  /**
   * 支払いの処理
   */
  async processPayment(productId: string, amount: number, description: string): Promise<{ success: boolean; error?: string }> {
    try {
      // 実装は後で追加
      return { success: true };
    } catch (error) {
      return { success: false, error: '支払いの処理に失敗しました' };
    }
  }

  /**
   * 返金の処理
   */
  async processRefund(paymentIntentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.config.apiUrl}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_intent_id: paymentIntentId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process refund');
      }

      const data = await response.json();
      return { success: data.success || false };
    } catch (error) {
      console.error('[Stripe] Refund error:', error);
      return { success: false, error: '返金の処理に失敗しました' };
    }
  }
}

// シングルトンインスタンス
export const unifiedStripeManager = new UnifiedStripePaymentManager();

// 互換性のためのエイリアス
export const stripePaymentManager = unifiedStripeManager;

// 初期化ヘルパー関数
export async function initializeUnifiedStripe(): Promise<boolean> {
  console.log('[Stripe] Initializing unified Stripe payment system...');
  return await unifiedStripeManager.initialize();
}

// 決済商品の定義（投げ銭システム）
export const PAYMENT_PRODUCTS = {
  SUPPORT_160: {
    id: 'support_160',
    name: '応援 160円',
    price: 160,
    description: '開発者への応援（160円）',
    type: 'support'
  },
  SUPPORT_320: {
    id: 'support_320',
    name: '応援 320円',
    price: 320,
    description: '開発者への応援（320円）',
    type: 'support'
  },
  SUPPORT_650: {
    id: 'support_650',
    name: '応援 650円',
    price: 650,
    description: '開発者への応援（650円）',
    type: 'support'
  },
  SUPPORT_1600: {
    id: 'support_1600',
    name: '応援 1,600円',
    price: 1600,
    description: '開発者への応援（1,600円）',
    type: 'support'
  },
  SUPPORT_3200: {
    id: 'support_3200',
    name: '応援 3,200円',
    price: 3200,
    description: '開発者への応援（3,200円）',
    type: 'support'
  },
  CUSTOM_SUPPORT: {
    id: 'custom_support',
    name: 'カスタム応援',
    price: 0, // 自由金額
    description: '自由金額での応援',
    type: 'custom_support'
  }
} as const;

export type PaymentProductId = keyof typeof PAYMENT_PRODUCTS;

// 便利な関数のエクスポート
export const getStripe = () => unifiedStripeManager.getStripe();
export const createPaymentIntent = (amount: number, currency?: string) => 
  unifiedStripeManager.createPaymentIntent(amount, currency);
export const confirmPayment = (clientSecret: string, paymentMethodData: any) => 
  unifiedStripeManager.confirmPayment(clientSecret, paymentMethodData);
