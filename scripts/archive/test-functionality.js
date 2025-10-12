// 機能テスト用スクリプト
// ブラウザのコンソールで実行してください

console.log("=== 秘密人狼 機能テスト開始 ===");

// テスト1: 知り合いと遊ぶでルーム作成ボタンを押した時の動作
async function testRoomCreation() {
  console.log("\n--- テスト1: ルーム作成の動作確認 ---");
  
  // メニュー画面で知り合いと遊ぶボタンをクリック
  const friendsButton = document.querySelector('button[onclick*="handleStart(\"friends\")"]') || 
                       document.querySelector('img[alt="知り合いと遊ぶ"]')?.closest('button');
  
  if (friendsButton) {
    console.log("✓ 知り合いと遊ぶボタンが見つかりました");
    friendsButton.click();
    
    // ルーム作成画面に遷移するまで待機
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // ルーム作成ボタンをクリック
    const createButton = document.querySelector('button:contains("作成")') || 
                        Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('作成'));
    
    if (createButton) {
      console.log("✓ ルーム作成ボタンが見つかりました");
      const startTime = Date.now();
      createButton.click();
      
      // ルーム待機画面に遷移するまで待機（最大10秒）
      let lobbyFound = false;
      for (let i = 0; i < 100; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (window.location.pathname.includes('/lobby/')) {
          lobbyFound = true;
          break;
        }
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      if (lobbyFound) {
        console.log(`✓ ルーム待機画面への遷移成功 (${duration}ms)`);
        return { success: true, duration };
      } else {
        console.log("✗ ルーム待機画面への遷移失敗");
        return { success: false, duration };
      }
    } else {
      console.log("✗ ルーム作成ボタンが見つかりません");
      return { success: false };
    }
  } else {
    console.log("✗ 知り合いと遊ぶボタンが見つかりません");
    return { success: false };
  }
}

// テスト2: 解散を選択した時の動作
async function testDisband() {
  console.log("\n--- テスト2: 解散の動作確認 ---");
  
  // 解散ボタンを探す
  const disbandButton = document.querySelector('button:contains("解散")') || 
                       Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('解散'));
  
  if (disbandButton) {
    console.log("✓ 解散ボタンが見つかりました");
    const startTime = Date.now();
    disbandButton.click();
    
    // 解散確認モーダルを待機
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // はいボタンをクリック
    const confirmButton = document.querySelector('button:contains("はい")') || 
                         Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('はい'));
    
    if (confirmButton) {
      confirmButton.click();
      
      // メニュー画面に遷移するまで待機（最大5秒）
      let menuFound = false;
      for (let i = 0; i < 50; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (window.location.pathname === '/menu' || window.location.pathname === '/') {
          menuFound = true;
          break;
        }
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      if (menuFound) {
        console.log(`✓ メニュー画面への遷移成功 (${duration}ms)`);
        return { success: true, duration };
      } else {
        console.log("✗ メニュー画面への遷移失敗");
        return { success: false, duration };
      }
    } else {
      console.log("✗ 解散確認ボタンが見つかりません");
      return { success: false };
    }
  } else {
    console.log("✗ 解散ボタンが見つかりません");
    return { success: false };
  }
}

// テスト3: 知らない誰かとのマッチングシーンでプレイヤー一覧表示
async function testAutoMatching() {
  console.log("\n--- テスト3: 自動マッチングの動作確認 ---");
  
  // 知らない誰かとボタンをクリック
  const randomButton = document.querySelector('button[onclick*="handleStart(\"random\")"]') || 
                      document.querySelector('img[alt="知らない誰かと"]')?.closest('button');
  
  if (randomButton) {
    console.log("✓ 知らない誰かとボタンが見つかりました");
    randomButton.click();
    
    // マッチング画面に遷移するまで待機
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // プレイヤー一覧を確認
    const playerList = document.querySelector('.space-y-3') || 
                      document.querySelector('[class*="space-y-3"]');
    
    if (playerList) {
      const players = playerList.querySelectorAll('[class*="bg-white/5"]');
      console.log(`✓ プレイヤー一覧が見つかりました (${players.length}人)`);
      
      // 自身がプレイヤー一覧に表示されているか確認
      const hasSelf = Array.from(players).some(player => 
        player.textContent.includes('参加済み') || 
        player.querySelector('.animate-pulse')
      );
      
      if (hasSelf) {
        console.log("✓ 自身がプレイヤー一覧に表示されています");
        return { success: true, playerCount: players.length };
      } else {
        console.log("✗ 自身がプレイヤー一覧に表示されていません");
        return { success: false, playerCount: players.length };
      }
    } else {
      console.log("✗ プレイヤー一覧が見つかりません");
      return { success: false };
    }
  } else {
    console.log("✗ 知らない誰かとボタンが見つかりません");
    return { success: false };
  }
}

// テスト4: 繰り返し実行での問題確認
async function testRepeatedExecution() {
  console.log("\n--- テスト4: 繰り返し実行の動作確認 ---");
  
  const results = [];
  
  for (let i = 1; i <= 3; i++) {
    console.log(`\n--- 繰り返しテスト ${i}/3 ---`);
    
    // メニューに戻る
    const menuButton = document.querySelector('a[href="/menu"]') || 
                      Array.from(document.querySelectorAll('a')).find(a => a.textContent.includes('メニュー'));
    if (menuButton) {
      menuButton.click();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // ルーム作成テスト
    const roomResult = await testRoomCreation();
    results.push({ test: 'room_creation', iteration: i, ...roomResult });
    
    if (roomResult.success) {
      // 解散テスト
      const disbandResult = await testDisband();
      results.push({ test: 'disband', iteration: i, ...disbandResult });
    }
  }
  
  // 結果の集計
  const roomCreationSuccess = results.filter(r => r.test === 'room_creation' && r.success).length;
  const disbandSuccess = results.filter(r => r.test === 'disband' && r.success).length;
  
  console.log(`\n--- 繰り返しテスト結果 ---`);
  console.log(`ルーム作成成功: ${roomCreationSuccess}/3`);
  console.log(`解散成功: ${disbandSuccess}/3`);
  
  return {
    roomCreationSuccess,
    disbandSuccess,
    allSuccessful: roomCreationSuccess === 3 && disbandSuccess === 3
  };
}

// メイン実行関数
async function runAllTests() {
  console.log("テストを開始します...");
  
  const results = {
    roomCreation: await testRoomCreation(),
    disband: null,
    autoMatching: await testAutoMatching(),
    repeated: null
  };
  
  // ルーム作成が成功した場合のみ解散テストを実行
  if (results.roomCreation.success) {
    results.disband = await testDisband();
  }
  
  // 繰り返しテストを実行
  results.repeated = await testRepeatedExecution();
  
  console.log("\n=== テスト結果サマリー ===");
  console.log(`1. ルーム作成: ${results.roomCreation.success ? '✓' : '✗'} ${results.roomCreation.duration ? `(${results.roomCreation.duration}ms)` : ''}`);
  console.log(`2. 解散: ${results.disband?.success ? '✓' : '✗'} ${results.disband?.duration ? `(${results.disband.duration}ms)` : ''}`);
  console.log(`3. 自動マッチング: ${results.autoMatching.success ? '✓' : '✗'} ${results.autoMatching.playerCount ? `(${results.autoMatching.playerCount}人)` : ''}`);
  console.log(`4. 繰り返し実行: ${results.repeated.allSuccessful ? '✓' : '✗'}`);
  
  return results;
}

// テスト実行
runAllTests().then(results => {
  console.log("\nテスト完了！");
  console.log("結果:", results);
}).catch(error => {
  console.error("テスト実行エラー:", error);
});

// 個別テスト関数もエクスポート
window.testRoomCreation = testRoomCreation;
window.testDisband = testDisband;
window.testAutoMatching = testAutoMatching;
window.testRepeatedExecution = testRepeatedExecution;
window.runAllTests = runAllTests;
