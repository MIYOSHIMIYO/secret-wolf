/**
 * カスタムモードの自動テストスクリプト
 * 
 * テスト項目:
 * 1. カスタムモードでルーム作成・参加
 * 2. ロビーで「お題作成へ」ボタンが表示されるか
 * 3. お題作成シーンに遷移するか
 * 4. お題作成シーンの機能（追加・削除・文字数制限・リスト数制限）
 * 5. ホストのみ「開始」ボタンが表示されるか
 * 6. 「もう一度」でお題作成シーンに戻るか
 * 7. お題リストが維持されるか
 */

const WebSocket = require('ws');

// テスト設定
const WS_URL = 'wss://secret-werewolf-prod.qmdg2pmnw6.workers.dev';
const TEST_ROOM_ID = 'TEST' + Math.random().toString(36).substring(2, 6).toUpperCase();
const TEST_NICK = 'テストユーザー';
const TEST_INSTALL_ID = 'test-install-id-' + Date.now();

// テスト結果
const testResults = {
  roomCreation: false,
  customModeDetection: false,
  lobbyNavigation: false,
  topicCreation: false,
  topicFunctions: false,
  hostOnlyStart: false,
  rematchFunction: false,
  topicPersistence: false
};

// WebSocket接続とメッセージ処理
class CustomModeTester {
  constructor() {
    this.ws = null;
    this.roomId = TEST_ROOM_ID;
    this.isHost = false;
    this.customTopics = [];
    this.testStep = 0;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      const wsUrl = `${WS_URL}/ws/room/${this.roomId}`;
      console.log(`[テスト] WebSocket接続開始: ${wsUrl}`);
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.on('open', () => {
        console.log(`[テスト] WebSocket接続成功`);
        resolve();
      });
      
      this.ws.on('error', (error) => {
        console.error(`[テスト] WebSocket接続エラー:`, error);
        reject(error);
      });
      
      this.ws.on('message', (data) => {
        this.handleMessage(JSON.parse(data.toString()));
      });
    });
  }

  handleMessage(message) {
    const { t, p } = message;
    console.log(`[テスト] メッセージ受信:`, { t, p: p ? Object.keys(p) : 'no payload' });
    
    switch (t) {
      case 'you':
        console.log(`[テスト] プレイヤーID受信: ${p.playerId}`);
        this.isHost = p.playerId && p.playerId.includes('p_');
        break;
        
      case 'state':
        this.handleStateMessage(p);
        break;
        
      case 'phase':
        this.handlePhaseMessage(p);
        break;
        
      case 'customTopics':
        this.handleCustomTopicsMessage(p);
        break;
        
      case 'warn':
      case 'error':
        console.error(`[テスト] エラー:`, p);
        break;
    }
  }

  handleStateMessage(state) {
    console.log(`[テスト] ルーム状態受信:`, {
      phase: state.phase,
      isCustomMode: state.isCustomMode,
      isAutoRoom: state.isAutoRoom,
      players: state.players?.length || 0,
      hostId: state.hostId
    });
    
    // カスタムモード判定のテスト
    if (state.isCustomMode === true) {
      testResults.customModeDetection = true;
      console.log(`[テスト] ✅ カスタムモードが正しく検出されました`);
    }
    
    // ルーム作成成功のテスト
    if (state.phase === 'LOBBY' && state.players && state.players.length > 0) {
      testResults.roomCreation = true;
      console.log(`[テスト] ✅ ルーム作成成功`);
    }
  }

  handlePhaseMessage(phase) {
    console.log(`[テスト] フェーズ変更: ${phase.phase}`);
    
    if (phase.phase === 'INPUT') {
      testResults.lobbyNavigation = true;
      console.log(`[テスト] ✅ お題作成シーンに遷移しました`);
    }
  }

  handleCustomTopicsMessage(topics) {
    console.log(`[テスト] カスタムお題リスト受信:`, topics.topics);
    this.customTopics = topics.topics || [];
  }

  async sendJoin() {
    const joinMessage = {
      t: 'join',
      p: {
        roomId: this.roomId,
        nick: TEST_NICK,
        installId: TEST_INSTALL_ID,
        isCustomMode: true
      }
    };
    
    console.log(`[テスト] joinメッセージ送信:`, joinMessage);
    this.ws.send(JSON.stringify(joinMessage));
  }

  async testTopicCreation() {
    console.log(`[テスト] お題作成機能のテスト開始`);
    
    // お題追加のテスト
    const testTopic = 'テストお題';
    const addTopicMessage = {
      t: 'addCustomTopic',
      p: { text: testTopic }
    };
    
    console.log(`[テスト] お題追加メッセージ送信:`, addTopicMessage);
    this.ws.send(JSON.stringify(addTopicMessage));
    
    // 少し待機
    await this.sleep(1000);
    
    // お題が追加されたかチェック
    if (this.customTopics.includes(testTopic)) {
      testResults.topicFunctions = true;
      console.log(`[テスト] ✅ お題追加機能が正常に動作しました`);
    } else {
      console.log(`[テスト] ❌ お題追加機能が動作しませんでした`);
    }
  }

  async testStartGame() {
    if (!this.isHost) {
      console.log(`[テスト] ホストではないため、ゲーム開始テストをスキップします`);
      return;
    }
    
    console.log(`[テスト] ゲーム開始のテスト`);
    const startMessage = {
      t: 'startCustomGame',
      p: {}
    };
    
    console.log(`[テスト] ゲーム開始メッセージ送信:`, startMessage);
    this.ws.send(JSON.stringify(startMessage));
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async runTests() {
    try {
      console.log(`[テスト] カスタムモードテスト開始`);
      console.log(`[テスト] ルームID: ${this.roomId}`);
      
      // 1. WebSocket接続
      await this.connect();
      
      // 2. ルーム参加
      await this.sendJoin();
      await this.sleep(2000);
      
      // 3. お題作成機能のテスト
      await this.testTopicCreation();
      
      // 4. ゲーム開始のテスト（ホストの場合）
      await this.testStartGame();
      
      // 5. テスト結果の表示
      this.displayResults();
      
    } catch (error) {
      console.error(`[テスト] テスト実行エラー:`, error);
    } finally {
      if (this.ws) {
        this.ws.close();
      }
    }
  }

  displayResults() {
    console.log(`\n[テスト] テスト結果:`);
    console.log(`================================`);
    console.log(`ルーム作成: ${testResults.roomCreation ? '✅' : '❌'}`);
    console.log(`カスタムモード検出: ${testResults.customModeDetection ? '✅' : '❌'}`);
    console.log(`ロビー遷移: ${testResults.lobbyNavigation ? '✅' : '❌'}`);
    console.log(`お題作成機能: ${testResults.topicFunctions ? '✅' : '❌'}`);
    console.log(`================================`);
    
    const passedTests = Object.values(testResults).filter(result => result).length;
    const totalTests = Object.keys(testResults).length;
    
    console.log(`\n[テスト] 総合結果: ${passedTests}/${totalTests} テストが成功`);
    
    if (passedTests === totalTests) {
      console.log(`[テスト] 🎉 すべてのテストが成功しました！`);
    } else {
      console.log(`[テスト] ⚠️  一部のテストが失敗しました`);
    }
  }
}

// テスト実行
async function runCustomModeTest() {
  const tester = new CustomModeTester();
  await tester.runTests();
}

// テスト実行
runCustomModeTest().catch(console.error);
