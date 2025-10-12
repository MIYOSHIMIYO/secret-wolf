/**
 * WebSocket性能測定ツール
 * Phase 0の技術検証スプリント用
 */

interface PerformanceMetrics {
  connectionTime: number;
  messageLatency: number;
  reconnectionTime: number;
  maxConcurrentConnections: number;
  errorRate: number;
}

interface TestConfig {
  maxConnections: number;
  testDuration: number; // milliseconds
  messageInterval: number; // milliseconds
  serverUrl: string;
}

export class WebSocketPerformanceTester {
  private connections: WebSocket[] = [];
  private metrics: PerformanceMetrics[] = [];
  private config: TestConfig;

  constructor(config: TestConfig) {
    this.config = config;
  }

  /**
   * 接続確立時間の測定
   */
  async measureConnectionTime(): Promise<number> {
    const startTime = performance.now();
    
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.config.serverUrl);
      
      ws.onopen = () => {
        const endTime = performance.now();
        ws.close();
        resolve(endTime - startTime);
      };
      
      ws.onerror = () => {
        reject(new Error('Connection failed'));
      };
      
      // タイムアウト設定
      setTimeout(() => {
        ws.close();
        reject(new Error('Connection timeout'));
      }, 5000);
    });
  }

  /**
   * メッセージ遅延の測定
   */
  async measureMessageLatency(): Promise<number> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.config.serverUrl);
      const testMessage = JSON.stringify({
        type: 'ping',
        timestamp: performance.now()
      });
      
      ws.onopen = () => {
        const sendTime = performance.now();
        
        ws.onmessage = (event) => {
          const receiveTime = performance.now();
          const latency = receiveTime - sendTime;
          ws.close();
          resolve(latency);
        };
        
        ws.send(testMessage);
      };
      
      ws.onerror = () => {
        reject(new Error('Message test failed'));
      };
      
      setTimeout(() => {
        ws.close();
        reject(new Error('Message test timeout'));
      }, 5000);
    });
  }

  /**
   * 再接続時間の測定
   */
  async measureReconnectionTime(): Promise<number> {
    const ws = new WebSocket(this.config.serverUrl);
    
    return new Promise((resolve, reject) => {
      ws.onopen = () => {
        // 意図的に接続を切断
        ws.close();
        
        // 再接続を測定
        const reconnectStart = performance.now();
        const newWs = new WebSocket(this.config.serverUrl);
        
        newWs.onopen = () => {
          const reconnectEnd = performance.now();
          newWs.close();
          resolve(reconnectEnd - reconnectStart);
        };
        
        newWs.onerror = () => {
          reject(new Error('Reconnection failed'));
        };
      };
      
      ws.onerror = () => {
        reject(new Error('Initial connection failed'));
      };
    });
  }

  /**
   * 同時接続数のテスト
   */
  async testConcurrentConnections(): Promise<{ maxConnections: number; errorRate: number }> {
    const connections: WebSocket[] = [];
    let successfulConnections = 0;
    let failedConnections = 0;

    return new Promise((resolve) => {
      const createConnection = (index: number) => {
        const ws = new WebSocket(this.config.serverUrl);
        connections.push(ws);
        
        ws.onopen = () => {
          successfulConnections++;
          console.log(`Connection ${index + 1} established`);
        };
        
        ws.onerror = () => {
          failedConnections++;
          console.log(`Connection ${index + 1} failed`);
        };
        
        // 全ての接続試行が完了したら結果を返す
        if (connections.length === this.config.maxConnections) {
          setTimeout(() => {
            // 接続を閉じる
            connections.forEach(conn => {
              if (conn.readyState === WebSocket.OPEN) {
                conn.close();
              }
            });
            
            const errorRate = failedConnections / this.config.maxConnections;
            resolve({
              maxConnections: successfulConnections,
              errorRate
            });
          }, 2000); // 2秒待機
        }
      };

      // 接続を順次作成
      for (let i = 0; i < this.config.maxConnections; i++) {
        setTimeout(() => createConnection(i), i * 100); // 100ms間隔
      }
    });
  }

  /**
   * 総合性能テストの実行
   */
  async runFullTest(): Promise<PerformanceMetrics> {
    console.log('Starting WebSocket performance test...');
    
    try {
      // 1. 接続確立時間の測定
      console.log('Measuring connection time...');
      const connectionTime = await this.measureConnectionTime();
      
      // 2. メッセージ遅延の測定
      console.log('Measuring message latency...');
      const messageLatency = await this.measureMessageLatency();
      
      // 3. 再接続時間の測定
      console.log('Measuring reconnection time...');
      const reconnectionTime = await this.measureReconnectionTime();
      
      // 4. 同時接続数のテスト
      console.log('Testing concurrent connections...');
      const concurrentResult = await this.testConcurrentConnections();
      
      const metrics: PerformanceMetrics = {
        connectionTime,
        messageLatency,
        reconnectionTime,
        maxConcurrentConnections: concurrentResult.maxConnections,
        errorRate: concurrentResult.errorRate
      };
      
      console.log('Performance test completed:', metrics);
      return metrics;
      
    } catch (error) {
      console.error('Performance test failed:', error);
      throw error;
    }
  }

  /**
   * 結果の検証
   */
  validateResults(metrics: PerformanceMetrics): { passed: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (metrics.connectionTime > 2000) {
      issues.push(`Connection time too slow: ${metrics.connectionTime}ms (target: <2000ms)`);
    }
    
    if (metrics.messageLatency > 100) {
      issues.push(`Message latency too high: ${metrics.messageLatency}ms (target: <100ms)`);
    }
    
    if (metrics.reconnectionTime > 5000) {
      issues.push(`Reconnection time too slow: ${metrics.reconnectionTime}ms (target: <5000ms)`);
    }
    
    if (metrics.maxConcurrentConnections < 50) {
      issues.push(`Insufficient concurrent connections: ${metrics.maxConcurrentConnections} (target: >=50)`);
    }
    
    if (metrics.errorRate > 0.1) {
      issues.push(`High error rate: ${(metrics.errorRate * 100).toFixed(1)}% (target: <10%)`);
    }
    
    return {
      passed: issues.length === 0,
      issues
    };
  }
}

/**
 * テスト実行用のヘルパー関数
 */
export async function runWebSocketPerformanceTest(serverUrl: string): Promise<void> {
  const config: TestConfig = {
    maxConnections: 50, // Cloudflare Workers制限を考慮
    testDuration: 30000, // 30秒
    messageInterval: 1000, // 1秒間隔
    serverUrl
  };
  
  const tester = new WebSocketPerformanceTester(config);
  
  try {
    const metrics = await tester.runFullTest();
    const validation = tester.validateResults(metrics);
    
    console.log('=== WebSocket Performance Test Results ===');
    console.log(`Connection Time: ${metrics.connectionTime.toFixed(2)}ms`);
    console.log(`Message Latency: ${metrics.messageLatency.toFixed(2)}ms`);
    console.log(`Reconnection Time: ${metrics.reconnectionTime.toFixed(2)}ms`);
    console.log(`Max Concurrent Connections: ${metrics.maxConcurrentConnections}`);
    console.log(`Error Rate: ${(metrics.errorRate * 100).toFixed(1)}%`);
    console.log(`Test Passed: ${validation.passed}`);
    
    if (!validation.passed) {
      console.log('Issues found:');
      validation.issues.forEach(issue => console.log(`- ${issue}`));
    }
    
  } catch (error) {
    console.error('Test execution failed:', error);
  }
}
