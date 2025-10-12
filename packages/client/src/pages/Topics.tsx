import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import HeaderBar from "@/components/HeaderBar";
import { SecondaryBtn } from "@/components/Buttons";
import { PROMPTS } from "@secret/shared/src/prompts";

export default function Topics() {
  const nav = useNavigate();

  const modeConfigs = [
    {
      id: "LOVE",
      name: "恋愛",
      description: "学生におすすめ",
      gradient: "from-purple-500 to-pink-500",
      color: "from-purple-500 to-pink-500",
      prompts: PROMPTS.LOVE
    },
    {
      id: "OGIRI",
      name: "大喜利",
      description: "面白い人、つまらない人は誰だ",
      gradient: "from-orange-500 to-red-700",
      color: "from-orange-500 to-red-700",
      prompts: PROMPTS.OGIRI
    },
    {
      id: "DECLARATION",
      name: "宣言",
      description: "決意表明して自分を追い込め",
      gradient: "from-teal-500 to-cyan-700",
      color: "from-teal-500 to-cyan-700",
      prompts: PROMPTS.DECLARATION
    },
    {
      id: "NONE",
      name: "飲み会",
      description: "対面で遊びやすいよ",
      gradient: "from-gray-600 to-slate-500",
      color: "from-gray-600 to-slate-500",
      prompts: PROMPTS.NONE
    },
    {
      id: "STRANGER",
      name: "知らない誰かと",
      description: "世の中、いろんな人がいるものね",
      gradient: "from-blue-500 to-indigo-600",
      color: "from-blue-500 to-indigo-600",
      prompts: PROMPTS.STRANGER
    }
  ];

  return (
    <Screen bannerHeight={0}>
      <div className="h-full flex flex-col">
        {/* ヘッダー部分（固定） */}
        <div className="p-4 pb-2 md:p-8 md:pb-4">
          <HeaderBar title="お題一覧" center />
          
          {/* お題一覧の説明 */}
          <div className="text-center text-slate-300 text-sm md:text-xl mt-4">
            各モードで使用されるお題を確認できます
          </div>
        </div>

        {/* スクロール可能なコンテンツ部分 */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 md:px-10 md:pb-8">
          <div className="space-y-6">
            {modeConfigs.map((mode) => (
              <div key={mode.id} className="bg-white/5 rounded-2xl ring-1 ring-white/10 overflow-hidden">
                {/* モードヘッダー（グラデーション背景） */}
                <div className={`bg-gradient-to-r ${mode.color} p-4 md:p-8`}>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 md:w-5 md:h-5 rounded-full bg-white/20"></div>
                    <h3 className="text-white text-lg md:text-3xl font-semibold">{mode.name}</h3>
                  </div>
                  <p className="text-white/90 text-sm md:text-xl mt-2">{mode.description}</p>
                </div>
                
                {/* お題リスト */}
                <div className="p-4 md:p-7 space-y-2 md:space-y-4">
                  {mode.prompts.map((prompt: string, index: number) => (
                    <div key={index} className="flex items-start gap-3 md:gap-5 p-3 md:p-6 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                      <span className={`text-xs md:text-base font-mono px-2 md:px-3 py-1 md:py-1.5 rounded bg-gradient-to-r ${mode.color} text-white font-semibold`}>
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="text-slate-200 text-sm md:text-2xl leading-relaxed flex-1">{prompt}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 戻るボタン（固定） */}
        <div className="p-4 pt-2 md:p-8 md:pt-4">
          <SecondaryBtn onClick={() => nav(-1)} className="w-full md:h-16 md:text-xl">
            戻る
          </SecondaryBtn>
        </div>
      </div>
    </Screen>
  );
} 