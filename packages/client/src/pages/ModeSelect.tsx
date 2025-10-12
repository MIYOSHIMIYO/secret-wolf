import { useAppStore } from "@/state/store";
import { useNavigate } from "react-router-dom";
import { send } from "@/net/ws";
import Screen from "@/components/Screen";
import HeaderBar from "@/components/HeaderBar";
import { PrimaryBtn, SecondaryBtn } from "@/components/Buttons";
import { useState, useEffect, useRef } from "react";

export default function ModeSelect() {
  const nav = useNavigate();
  const room = useAppStore((s) => s.room);
  const myId = useAppStore((s) => s.myId);
  const isHost = !!(myId && room?.hostId === myId);
  
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [modeStamps, setModeStamps] = useState<Record<string, number>>({});
  const [playerVotes, setPlayerVotes] = useState<Record<string, Record<string, number>>>({});
  const [animationKey, setAnimationKey] = useState(0); // アニメーション用のキー
  
  // アニメーション用の状態
  const [animatedPercentages, setAnimatedPercentages] = useState<Record<string, number>>({});
  const [isAnimating, setIsAnimating] = useState(false);

  // WebSocketメッセージ処理
  useEffect(() => {
    const handleWsMessage = (event: CustomEvent) => {
      const { t, p } = event.detail;
      
      if (t === "modeStamp") {
        setModeStamps(p.modeStamps || {});
        setPlayerVotes(p.playerVotes || {});
        // アニメーションをトリガー
        setAnimationKey(prev => prev + 1);
      }
      
      if (t === "phase") {
        if (p.phase === "INPUT") {
          nav("/input", { replace: true });
        }
      }
      
      if (t === "abort") {
        nav("/menu", { replace: true });
      }
    };

    window.addEventListener("sw-msg", handleWsMessage as EventListener);
    
    return () => {
      window.removeEventListener("sw-msg", handleWsMessage as EventListener);
    };
  }, [nav]);

  // アニメーション処理
  useEffect(() => {
    if (Object.keys(modeStamps).length === 0) return;
    
    setIsAnimating(true);
    
    // 現在の割合を計算
    const totalVotes = Object.values(modeStamps).reduce((sum, val) => sum + val, 0);
    const targetPercentages: Record<string, number> = {};
    
    if (totalVotes > 0) {
      Object.keys(modeStamps).forEach(modeId => {
        targetPercentages[modeId] = (modeStamps[modeId] || 0) / totalVotes * 100;
      });
    }
    
    // 段階的にアニメーション
    const duration = 500; // 500ms
    const steps = 20;
    const stepDuration = duration / steps;
    
    let currentStep = 0;
    
    const animate = () => {
      if (currentStep >= steps) {
        setIsAnimating(false);
        return;
      }
      
      const progress = currentStep / steps;
      const easeProgress = 1 - Math.pow(1 - progress, 3); // ease-out
      
      const newPercentages: Record<string, number> = {};
      Object.keys(targetPercentages).forEach(modeId => {
        const current = animatedPercentages[modeId] || 0;
        const target = targetPercentages[modeId];
        newPercentages[modeId] = current + (target - current) * easeProgress;
      });
      
      setAnimatedPercentages(newPercentages);
      currentStep++;
      
      setTimeout(animate, stepDuration);
    };
    
    animate();
  }, [modeStamps]);

  // モードスタンプを送信（各モード3回まで投票可能）
  const sendModeStamp = (mode: string) => {
    // ホストは投票できない
    if (isHost) return;
    
    // 各モードに3回まで投票可能
    send("modeStamp", { mode });
  };

  // ホストがモードを選択
  const selectMode = (mode: string) => {
    setSelectedMode(mode);
    setConfirmOpen(true);
  };

  // モード選択を確定
  const confirmMode = () => {
    if (selectedMode) {
      send("selectMode", { mode: selectedMode });
      setConfirmOpen(false);
    }
  };

  const modes = [
    { 
      id: "LOVE", 
      name: "恋愛", 
      description: "恋バナ系",
      gradient: "from-purple-500 to-pink-500"
    },
    { 
      id: "OGIRI", 
      name: "大喜利", 
      description: "ネタ系",
      gradient: "from-orange-500 to-red-700"
    },
    { 
      id: "DECLARATION", 
      name: "宣言", 
      description: "自己宣言系",
      gradient: "from-teal-500 to-cyan-700"
    },
    { 
      id: "NONE", 
      name: "飲み会", 
      description: "対面系",
      gradient: "from-gray-600 to-slate-500"
    },
  ];

  // 円グラフの計算
  const totalVotes = Object.values(modeStamps).reduce((sum, val) => sum + val, 0);
  const getModePercentage = (modeId: string) => {
    if (totalVotes === 0) return 0;
    return (modeStamps[modeId] || 0) / totalVotes * 100;
  };

  // アニメーションされた割合を取得
  const getAnimatedPercentage = (modeId: string) => {
    if (isAnimating && animatedPercentages[modeId] !== undefined) {
      return animatedPercentages[modeId];
    }
    return getModePercentage(modeId);
  };

  // SVG path要素を使用した円グラフの生成（アニメーション対応）
  const createPieChart = () => {
    if (totalVotes === 0) {
      return (
        <circle 
          cx="100" 
          cy="100" 
          r="80" 
          fill="#374151"
          className="transition-all duration-500 ease-out"
        />
      );
    }

    // 100%の場合（単一モードのみ投票がある場合）の特別処理
    const activeModes = modes.filter(mode => (modeStamps[mode.id] || 0) > 0);
    if (activeModes.length === 1) {
      const mode = activeModes[0];
      return (
        <circle 
          cx="100" 
          cy="100" 
          r="80" 
          fill={`url(#${mode.id}-gradient)`}
          className="transition-all duration-500 ease-out"
        />
      );
    }

    // 複数モードがある場合の通常処理
    let currentAngle = 0;
    const radius = 80;
    const centerX = 100;
    const centerY = 100;

    return activeModes.map((mode, index) => {
      const percentage = getAnimatedPercentage(mode.id);
      const angle = (percentage / 100) * 360;
      
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      
      const startRad = (startAngle - 90) * Math.PI / 180;
      const endRad = (endAngle - 90) * Math.PI / 180;
      
      const x1 = centerX + radius * Math.cos(startRad);
      const y1 = centerY + radius * Math.sin(startRad);
      const x2 = centerX + radius * Math.cos(endRad);
      const y2 = centerY + radius * Math.sin(endRad);
      
      const largeArcFlag = angle > 180 ? 1 : 0;
      
      currentAngle += angle;
      
      return (
        <path
          key={mode.id}
          d={`M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
          fill={`url(#${mode.id}-gradient)`}
        />
      );
    });
  };

  // シンプルな円グラフの生成（旧実装、削除予定）
  const createPieChartWithClipPath = () => {
    if (totalVotes === 0) {
      return (
        <div className="w-40 h-40 rounded-full bg-gray-600 transition-all duration-500 ease-out" />
      );
    }

    // 100%の場合（単一モードのみ投票がある場合）の特別処理
    const activeModes = modes.filter(mode => (modeStamps[mode.id] || 0) > 0);
    if (activeModes.length === 1) {
      const mode = activeModes[0];
      return (
        <div 
          className={`w-40 h-40 rounded-full transition-all duration-500 ease-out bg-gradient-to-r ${
            mode.gradient.includes('purple') ? 'from-purple-500 to-pink-500' :
            mode.gradient.includes('orange') ? 'from-orange-500 to-red-700' :
            mode.gradient.includes('teal') ? 'from-teal-500 to-cyan-700' :
            mode.gradient.includes('gray') ? 'from-gray-600 to-slate-500' : 'from-purple-500 to-pink-500'
          }`}
        />
      );
    }

    // 複数モードがある場合の通常処理
    let currentAngle = 0;
    
    return activeModes.map((mode, index) => {
      const percentage = getModePercentage(mode.id);
      const angle = (percentage / 100) * 360;
      
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      
      // clip-pathの計算
      const startRad = (startAngle - 90) * Math.PI / 180;
      const endRad = (endAngle - 90) * Math.PI / 180;
      
      const centerX = 50; // パーセンテージベース
      const centerY = 50;
      const radius = 40;
      
      const x1 = centerX + radius * Math.cos(startRad);
      const y1 = centerY + radius * Math.sin(startRad);
      const x2 = centerX + radius * Math.cos(endRad);
      const y2 = centerY + radius * Math.sin(endRad);
      
      const largeArcFlag = angle > 180 ? 1 : 0;
      
      currentAngle += angle;
      
      const clipPath = `polygon(50% 50%, ${x1}% ${y1}%, ${x2}% ${y2}%)`;
      
      return (
        <div
          key={mode.id}
          className={`absolute inset-0 rounded-full transition-all duration-500 ease-out bg-gradient-to-r ${
            mode.gradient.includes('purple') ? 'from-purple-500 to-pink-500' :
            mode.gradient.includes('orange') ? 'from-orange-500 to-red-700' :
            mode.gradient.includes('teal') ? 'from-teal-500 to-cyan-700' :
            mode.gradient.includes('gray') ? 'from-gray-600 to-slate-500' : 'from-purple-500 to-pink-500'
          }`}
          style={{
            clipPath: clipPath
          }}
        />
      );
    });
  };

  const bannerH = 0;

  return (
    <Screen
      bannerHeight={bannerH}
      contentScrollable={false}
      maxWidth={1280}
      innerClassName="xl:px-12"
    >
      <div
        className="mode-select-scale px-4 md:px-8 xl:px-0"
        style={{ height: `calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - ${bannerH}px)` }}
      >
        <div className="flex flex-col h-full xl:gap-6">
          <HeaderBar title="モード選択" center />

          <div className="flex-1 overflow-hidden xl:flex xl:gap-8 xl:items-start">
            <div className="flex flex-col gap-3 sm:gap-4 md:gap-6 xl:w-[360px] xl:flex-none xl:space-y-4">
              {/* 左カラム：投票状況 */}
              <div className="flex flex-col items-center gap-4 sm:gap-5 md:gap-7 xl:gap-6 xl:items-start">
                <div className="text-center xl:text-left">
                  {isHost ? (
                    <p className="text-slate-300 text-sm md:text-xl mb-2 md:mb-3">
                      どのモードで遊ぶか決めてください
                    </p>
                  ) : (
                    <p className="text-slate-300 text-sm md:text-xl mb-2 md:mb-3">
                      モードを押して、ホストに希望を伝えましょう
                    </p>
                  )}
                  <h3 className="text-white text-base sm:text-lg md:text-3xl font-semibold">
                    みんなの希望
                  </h3>
                </div>

                <div className="relative mb-1 sm:mb-2 md:mb-4">
                  <svg viewBox="0 0 200 200" className="w-40 h-40 sm:w-48 sm:h-48 md:w-80 md:h-80">
                    <defs>
                      {modes.map((mode) => (
                        <linearGradient key={mode.id} id={`${mode.id}-gradient`} x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor={
                            mode.gradient.includes('purple') ? '#8b5cf6' : 
                            mode.gradient.includes('orange') ? '#f97316' :
                            mode.gradient.includes('teal') ? '#14b8a6' : 
                            mode.gradient.includes('gray') ? '#4b5563' : '#8b5cf6'
                          } />
                          <stop offset="100%" stopColor={
                            mode.gradient.includes('pink') ? '#ec4899' :
                            mode.gradient.includes('red') ? '#b91c1c' :
                            mode.gradient.includes('cyan') ? '#0891b2' : 
                            mode.gradient.includes('slate') ? '#64748b' : '#ec4899'
                          } />
                        </linearGradient>
                      ))}
                    </defs>
                    <circle cx="100" cy="100" r="80" fill="transparent" />
                    {createPieChart()}
                  </svg>
                </div>

                <div className="flex justify-between gap-3 sm:gap-5 md:gap-8 px-2 sm:px-4 md:px-10 xl:w-full xl:px-0 xl:gap-4 xl:justify-evenly">
                  {modes.map((mode) => {
                    const count = modeStamps[mode.id] || 0;
                    const percentage = getAnimatedPercentage(mode.id);
                    return (
                      <div
                        key={mode.id}
                        className="text-center min-w-[56px] sm:min-w-[70px] md:min-w-[110px] flex-1 xl:flex-none xl:flex xl:flex-col xl:items-center xl:justify-center xl:bg-white/5 xl:border xl:border-white/10 xl:rounded-xl xl:px-4 xl:py-3 xl:backdrop-blur xl:min-w-[120px]"
                      >
                        <div className={`text-xs sm:text-sm md:text-2xl font-medium bg-gradient-to-r ${mode.gradient} bg-clip-text text-transparent whitespace-nowrap xl:text-base`}>
                          {mode.name}
                        </div>
                        <div className="text-sm sm:text-base md:text-3xl font-bold text-white mt-1 md:mt-1.5 xl:mt-2 xl:text-xl">
                          {count}票
                        </div>
                        <div className="text-[10px] sm:text-xs md:text-lg text-slate-300 mt-1 xl:mt-1 xl:text-sm">
                          {percentage.toFixed(1)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* 右カラム：モード選択 */}
            <div className="flex flex-col gap-3 sm:gap-4 md:gap-6 xl:flex-1 xl:max-h-[calc(100vh-220px)] xl:overflow-y-auto xl:pr-2">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-8 px-3 sm:px-4 md:px-10 xl:px-0 xl:grid-cols-1 xl:gap-3">
                {modes.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => (isHost ? selectMode(mode.id) : sendModeStamp(mode.id))}
                    disabled={false}
                      className={`relative p-3 sm:p-4 md:p-6 rounded-lg md:rounded-2xl bg-gradient-to-r ${mode.gradient} active:scale-95 cursor-pointer transition-all duration-200 xl:p-4 xl:rounded-xl`}
                    >
                      <div className="text-white font-bold text-base sm:text-lg md:text-3xl xl:text-2xl">{mode.name}</div>
                      <div className="text-white/80 text-xs sm:text-sm md:text-xl xl:text-lg">{mode.description}</div>
                      {!isHost && (
                        <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 md:top-3 md:right-3 bg-white/20 rounded-full px-1.5 py-0.5 sm:px-2 sm:py-1 md:px-3 md:py-1.5">
                          <span className="text-white text-[10px] sm:text-xs md:text-lg font-medium">
                            {(playerVotes[myId || ""]?.[mode.id] || 0)}/3
                          </span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* モード選択確認モーダル */}
      {confirmOpen && selectedMode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-sm mx-4 ring-1 ring-white/10 shadow-2xl">
            <div className="text-center space-y-4">
              <div className="text-white text-lg font-medium">
                {modes.find(m => m.id === selectedMode)?.name}モードでゲームを始めますか？
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={confirmMode}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors"
                >
                  はい
                </button>
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-xl font-semibold transition-colors"
                >
                  いいえ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Screen>
  );
} 
