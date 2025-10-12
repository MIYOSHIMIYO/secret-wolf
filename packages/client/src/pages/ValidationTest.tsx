/**
 * 技術検証スプリント用テストページ
 * Phase 0: WebSocket性能測定、PWA検証等
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Screen from '@/components/Screen';
import HeaderBar from '@/components/HeaderBar';
import Panel from '@/components/Panel';
import { PrimaryBtn, SecondaryBtn } from '@/components/Buttons';
import { runWebSocketPerformanceTest } from '@/utils/websocket-performance-test';
import { pwaManager } from '@/utils/pwa';
import { stripePaymentManager } from '@/utils/stripe';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message: string;
  details?: any;
}

export default function ValidationTest() {
  const navigate = useNavigate();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const tests = [
    {
      name: 'WebSocket性能測定',
      test: async () => {
        const serverUrl = import.meta.env.VITE_WORKER_WS || 'wss://secret-werewolf-prod.qmdg2pmnw6.workers.dev';
        await runWebSocketPerformanceTest(serverUrl);
        return { message: 'WebSocket性能テスト完了', details: 'コンソールで詳細を確認してください' };
      }
    },
    {
      name: 'PWA機能検証',
      test: async () => {
        const supportStatus = pwaManager.getSupportStatus();
        const canInstall = pwaManager.canInstall();
        const isInstalled = pwaManager.isAppInstalled();
        
        return {
          message: `PWAサポート状況確認完了`,
          details: {
            serviceWorker: supportStatus.serviceWorker,
            pushManager: supportStatus.pushManager,
            backgroundSync: supportStatus.backgroundSync,
            beforeInstallPrompt: supportStatus.beforeInstallPrompt,
            canInstall,
            isInstalled
          }
        };
      }
    },
    {
      name: 'Stripe初期化検証',
      test: async () => {
        const initialized = await stripePaymentManager.initialize();
        return {
          message: initialized ? 'Stripe初期化成功' : 'Stripe初期化失敗',
          details: { initialized }
        };
      }
    },
    {
      name: 'ブラウザ互換性確認',
      test: async () => {
        const userAgent = navigator.userAgent;
        const isIOS = /iPad|iPhone|iPod/.test(userAgent);
        const isAndroid = /Android/.test(userAgent);
        const isChrome = /Chrome/.test(userAgent);
        const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
        const isFirefox = /Firefox/.test(userAgent);
        const isEdge = /Edg/.test(userAgent);
        
        return {
          message: 'ブラウザ情報取得完了',
          details: {
            userAgent,
            isIOS,
            isAndroid,
            isChrome,
            isSafari,
            isFirefox,
            isEdge,
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight
          }
        };
      }
    },
    {
      name: 'レスポンシブデザイン確認',
      test: async () => {
        const breakpoints = {
          mobile: window.innerWidth < 768,
          tablet: window.innerWidth >= 768 && window.innerWidth < 1024,
          desktop: window.innerWidth >= 1024
        };
        
        return {
          message: 'レスポンシブデザイン確認完了',
          details: {
            currentBreakpoint: Object.entries(breakpoints).find(([_, active]) => active)?.[0] || 'unknown',
            ...breakpoints
          }
        };
      }
    },
    {
      name: 'Durable Object監視データ取得',
      test: async () => {
        const apiUrl = import.meta.env.VITE_API_URL || 'https://secret-werewolf-prod.qmdg2pmnw6.workers.dev';
        const authToken = import.meta.env.VITE_MONITORING_AUTH_TOKEN;
        
        try {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json'
          };
          
          if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
          }
          
          const response = await fetch(`${apiUrl}/debug/monitoring`, {
            headers
          });
          
          if (!response.ok) {
            if (response.status === 401) {
              throw new Error('認証が必要です。VITE_MONITORING_AUTH_TOKENを設定してください。');
            } else if (response.status === 403) {
              throw new Error('アクセスが拒否されました。IP制限を確認してください。');
            } else {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
          }
          
          const monitoringData = await response.json();
          
          return {
            message: 'Durable Object監視データ取得成功',
            details: {
              summary: monitoringData.summary,
              quota: monitoringData.quota,
              alerts: monitoringData.alerts,
              costs: monitoringData.costs
            }
          };
        } catch (error) {
          return {
            message: `Durable Object監視データ取得失敗: ${error instanceof Error ? error.message : 'Unknown error'}`,
            details: { error: error instanceof Error ? error.message : 'Unknown error' }
          };
        }
      }
    }
  ];

  const runTest = async (testName: string, testFunction: () => Promise<any>) => {
    setTestResults(prev => prev.map(test => 
      test.name === testName 
        ? { ...test, status: 'running', message: '実行中...' }
        : test
    ));

    try {
      const result = await testFunction();
      setTestResults(prev => prev.map(test => 
        test.name === testName 
          ? { ...test, status: 'passed', message: result.message, details: result.details }
          : test
      ));
    } catch (error) {
      setTestResults(prev => prev.map(test => 
        test.name === testName 
          ? { ...test, status: 'failed', message: `エラー: ${error instanceof Error ? error.message : 'Unknown error'}` }
          : test
      ));
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults(tests.map(test => ({ name: test.name, status: 'pending', message: '待機中' })));

    for (const test of tests) {
      await runTest(test.name, test.test);
      // テスト間に少し間隔を空ける
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setIsRunning(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'text-green-400';
      case 'failed': return 'text-red-400';
      case 'running': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return '✓';
      case 'failed': return '✗';
      case 'running': return '⟳';
      default: return '○';
    }
  };

  return (
    <Screen>
      <HeaderBar title="技術検証テスト" onBack={() => navigate('/menu')} />
      
      <div className="flex-1 p-4 space-y-6 overflow-y-auto">
        {/* テスト実行ボタン */}
        <Panel>
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">技術検証スプリント</h2>
            <p className="text-gray-300 text-sm">
              Phase 0の技術検証テストを実行します。各テストの結果はコンソールでも確認できます。
            </p>
            <div className="flex gap-4">
              <PrimaryBtn
                onClick={runAllTests}
                disabled={isRunning}
                className="flex-1"
              >
                {isRunning ? 'テスト実行中...' : '全テスト実行'}
              </PrimaryBtn>
              <SecondaryBtn
                onClick={() => navigate('/menu')}
                className="flex-1"
              >
                メニューに戻る
              </SecondaryBtn>
            </div>
          </div>
        </Panel>

        {/* テスト結果 */}
        {testResults.length > 0 && (
          <Panel>
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white">テスト結果</h2>
              <div className="space-y-3">
                {testResults.map((result, index) => (
                  <div key={index} className="p-4 bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-white">{result.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className={`text-lg ${getStatusColor(result.status)}`}>
                          {getStatusIcon(result.status)}
                        </span>
                        <span className={`text-sm ${getStatusColor(result.status)}`}>
                          {result.status === 'pending' && '待機中'}
                          {result.status === 'running' && '実行中'}
                          {result.status === 'passed' && '成功'}
                          {result.status === 'failed' && '失敗'}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm mb-2">{result.message}</p>
                    {result.details && (
                      <details className="text-xs text-gray-400">
                        <summary className="cursor-pointer hover:text-gray-300">
                          詳細情報
                        </summary>
                        <pre className="mt-2 p-2 bg-gray-800 rounded text-xs overflow-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        )}

        {/* 個別テストボタン */}
        <Panel>
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">個別テスト</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tests.map((test, index) => (
                <button
                  key={index}
                  onClick={() => runTest(test.name, test.test)}
                  disabled={isRunning}
                  className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="text-white font-medium">{test.name}</div>
                  <div className="text-gray-400 text-sm">個別実行</div>
                </button>
              ))}
            </div>
          </div>
        </Panel>
      </div>
    </Screen>
  );
}
