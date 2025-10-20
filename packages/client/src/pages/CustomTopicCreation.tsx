import { useState, useEffect, useMemo } from "react";
import { useAppStore } from "@/state/store";
import { useNavigate } from "react-router-dom";
import { send } from "@/net/ws";
import Screen from "@/components/Screen";
import HeaderBar from "@/components/HeaderBar";
import { PrimaryBtn, SecondaryBtn } from "@/components/Buttons";
import GraphemeSplitter from "grapheme-splitter";

// 文字数制限のユーティリティ関数（Input.tsxと同じ）
function toNFC(s: string): string { return s.normalize("NFC"); }
function graphemeLengthNFC(s: string): number { 
  const sp = new GraphemeSplitter(); 
  return sp.countGraphemes(toNFC(s)); 
}
function clampGraphemeNFC(s: string, max: number): string {
  const sp = new GraphemeSplitter();
  const arr = (sp as any).splitGraphemes?.(toNFC(s).replace(/\r?\n+/g, " ")) ?? Array.from(toNFC(s));
  return arr.slice(0, max).join("");
}

export default function CustomTopicCreation() {
  const nav = useNavigate();
  const room = useAppStore((s) => s.room);
  const myId = useAppStore((s) => s.myId);
  const isHost = !!(myId && room?.hostId === myId);
  
  const [inputText, setInputText] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // ルームのお題リストを初期値として使用
  useEffect(() => {
    if (room?.customTopics && room.customTopics.length > 0) {
      console.log("[CustomTopicCreation] ルームのお題リストを初期化:", room.customTopics);
      setTopics(room.customTopics);
    } else {
      console.log("[CustomTopicCreation] お題リストが空または未定義です");
      setTopics([]);
    }
  }, [room?.customTopics]);

  // コンポーネントマウント時にゲーム状態をリセット
  useEffect(() => {
    console.log("[CustomTopicCreation] コンポーネントマウント - ゲーム状態をリセット");
    // 入力フィールドをリセット
    setInputText("");
    setIsSubmitting(false);
  }, []);
  
  const count = useMemo(() => graphemeLengthNFC(inputText), [inputText]);
  const canAddTopic = count > 0 && count <= 20 && topics.length < 10;
  const canStart = isHost && topics.length > 0;

  // WebSocketメッセージ処理
  useEffect(() => {
    const handleWsMessage = (event: CustomEvent) => {
      const { t, p } = event.detail;
      
      if (t === "customTopics") {
        console.log("[CustomTopicCreation] customTopicsメッセージ受信:", p.topics);
        setTopics(p.topics || []);
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

  // ルームに参加済みかチェック（ロビー経由で来るため、既に参加済みのはず）
  useEffect(() => {
    if (!room) {
      // ルームに参加していない場合はメニューに戻る
      nav("/menu");
    }
  }, [room, nav]);

  // お題を追加
  const addTopic = () => {
    if (!canAddTopic) return;
    
    const trimmedText = inputText.trim();
    if (trimmedText.length === 0) return;
    
    setIsSubmitting(true);
    
    // ローカルステートを即座に更新（楽観的更新）
    const newTopics = [...topics, trimmedText];
    setTopics(newTopics);
    
    // バックエンドに送信
    send("addCustomTopic", { text: trimmedText });
    setInputText("");
    setIsSubmitting(false);
  };

  // お題を削除
  const removeTopic = (index: number) => {
    // ローカルステートを即座に更新（楽観的更新）
    const newTopics = topics.filter((_, i) => i !== index);
    setTopics(newTopics);
    
    // バックエンドに送信
    send("removeCustomTopic", { index });
  };

  // ゲーム開始
  const startGame = () => {
    if (!canStart) return;
    send("beginCustomGame", {});
  };

  // 入力フィールドの変更
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(clampGraphemeNFC(e.target.value, 20));
  };

  // Enterキーで追加（Shift+Enterで改行）
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addTopic();
    }
  };

  return (
    <Screen contentScrollable={true} maxWidth={1200} innerClassName="xl:px-12">
      <div className="min-h-[100svh] px-4 md:px-10 xl:px-0 pt-4 md:pt-10 pb-72 md:pb-56 xl:pb-12 flex flex-col gap-3 md:gap-6 xl:gap-8">
        {/* ヘッダー */}
        <HeaderBar title="お題作成" center />

        <div className="flex-1 xl:max-h-none">
          <div className="flex flex-col gap-3 md:gap-6 xl:grid xl:grid-cols-[minmax(0,460px)_minmax(0,1fr)] xl:gap-8 xl:items-start h-full">
            
            {/* 左カラム：お題入力 */}
            <div className="flex flex-col gap-3 md:gap-6 xl:gap-8 xl:sticky xl:top-8">
              {/* お題入力セクション */}
              <div className="rounded-2xl bg-gradient-to-br from-violet-900/50 via-violet-800/30 to-fuchsia-900/20 ring-1 ring-violet-400/30 p-3 md:p-6">
                <h2 className="text-violet-200 text-sm md:text-xl font-medium mb-2 md:mb-4">
                  お題を入力（20文字まで）
                </h2>
                <div className="flex flex-col gap-3">
                  <textarea
                    value={inputText}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    rows={3}
                    className="w-full resize-none rounded-lg px-3 md:px-5 py-2 md:py-4 bg-black/30 text-white ring-1 ring-violet-300/30 focus:ring-2 focus:ring-violet-400/50 outline-none text-sm md:text-xl leading-relaxed"
                    placeholder="例：実は今こんな状態です"
                    maxLength={200}
                  />
                  <div className="flex justify-between items-center">
                    <div className="text-xs md:text-lg text-violet-200/80">
                      {count}/20
                    </div>
                    <div className="text-xs md:text-lg text-violet-200/80">
                      {topics.length}/10個
                    </div>
                  </div>
                  
                  <button
                    onClick={addTopic}
                    disabled={!canAddTopic || isSubmitting}
                    className="w-full rounded-lg font-semibold bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white py-2 md:py-4 text-sm md:text-xl transition-all duration-200"
                  >
                    {isSubmitting ? "追加中..." : "お題を追加"}
                  </button>
                </div>
              </div>

              {/* ゲーム開始ボタン（ホストのみ） */}
              {isHost && (
                <div className="rounded-2xl bg-gradient-to-br from-emerald-900/50 via-emerald-800/30 to-teal-900/20 ring-1 ring-emerald-400/30 p-3 md:p-6">
                  <h3 className="text-emerald-200 text-sm md:text-xl font-medium mb-2 md:mb-4">
                    ゲーム開始
                  </h3>
                  <p className="text-emerald-100 text-xs md:text-lg mb-3 md:mb-4">
                    お題が1個以上あれば開始できます
                  </p>
                  <button
                    onClick={startGame}
                    disabled={!canStart}
                    className="w-full rounded-lg font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white py-2 md:py-4 text-sm md:text-xl transition-all duration-200"
                  >
                    ゲームを開始
                  </button>
                </div>
              )}
            </div>

            {/* 右カラム：お題リスト */}
            <div className="flex flex-col gap-3 md:gap-6 xl:gap-6 xl:max-h-[calc(100vh-200px)] xl:overflow-y-auto pr-2 xl:pr-3 pb-32">
              <div className="rounded-2xl bg-gradient-to-br from-slate-900/50 via-slate-800/30 to-gray-900/20 ring-1 ring-slate-400/30 p-3 md:p-6">
                <h3 className="text-slate-200 font-medium text-sm md:text-2xl mb-2 md:mb-4">
                  作成されたお題
                </h3>
                
                {topics.length === 0 ? (
                  <div className="text-center py-8 md:py-12">
                    <div className="text-slate-400 text-sm md:text-xl mb-2">
                      まだお題がありません
                    </div>
                    <div className="text-slate-500 text-xs md:text-lg">
                      左側の入力欄からお題を作成してください
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 md:space-y-3">
                    {topics.map((topic, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 md:p-4 rounded-lg bg-white/5 ring-1 ring-white/10"
                      >
                        <div className="flex-1 text-white text-sm md:text-lg">
                          {topic}
                        </div>
                        <button
                          onClick={() => removeTopic(index)}
                          className="ml-3 px-2 py-1 md:px-3 md:py-2 text-xs md:text-sm bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors"
                        >
                          削除
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 説明セクション */}
              <div className="rounded-2xl bg-gradient-to-br from-blue-900/40 via-blue-800/25 to-indigo-900/15 ring-1 ring-blue-400/25 p-3 md:p-6">
                <h3 className="text-blue-200 font-medium text-sm md:text-2xl mb-2 md:mb-4">
                  カスタムモードのルール
                </h3>
                <ul className="text-xs md:text-xl leading-5 md:leading-8 space-y-1 md:space-y-2 text-blue-50">
                  <li>• 全員でお題を作成します</li>
                  <li>• お題は20文字以内で入力してください</li>
                  <li>• 最大10個までお題を作成できます</li>
                  <li>• ホストが開始ボタンを押すとゲーム開始</li>
                  <li>• 作成したお題からランダムで選ばれます</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        {/* 末尾スペーサー（小画面での見切れ防止） */}
        <div className="h-12 md:h-0" />
      </div>
    </Screen>
  );
}
