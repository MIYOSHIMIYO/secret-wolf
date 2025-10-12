import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import { PrimaryBtn } from "@/components/Buttons";
import FadeSlide from "@/components/FadeSlide";
import { useCallback } from "react";
import titleImage from "@/assets/titleimage/titleimage.jpg";

export default function Title() {
  const nav = useNavigate();
  const start = useCallback(() => nav("/menu"), [nav]);

  return (
    <Screen bannerHeight={0} fullBleed innerClassName="">
      <div 
        className="h-full min-h-[100vh] flex flex-col items-center justify-center gap-7 p-6 md:p-8 lg:p-12 relative"
        style={{
          backgroundImage: `url(${titleImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* オーバーレイ（背景画像の上に半透明の暗いレイヤーを追加） */}
        <div className="absolute inset-0 bg-black/45 lg:bg-black/35 backdrop-blur-[1px]" />
        
        {/* コンテンツ（オーバーレイの上に表示） */}
        <div className="relative z-10 flex flex-col items-center justify-center gap-7 text-center lg:gap-9">
          <FadeSlide>
            <div className="text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-violet-300 via-fuchsia-200 to-amber-200 drop-shadow-[0_12px_45px_rgba(168,85,247,.35)]">
              秘密人狼
            </div>
          </FadeSlide>
          <FadeSlide delay={0.05}>
            <div className="text-slate-200 text-base md:text-lg lg:text-2xl drop-shadow-lg">
              誰かの秘密が落ちている
            </div>
          </FadeSlide>
          <FadeSlide delay={0.1}>
            <div className="w-full max-w-sm md:max-w-md lg:max-w-xl">
              <PrimaryBtn 
                className="w-full h-16 md:h-18 lg:h-20 text-xl md:text-2xl font-semibold bg-gradient-to-r from-purple-600 via-purple-500 to-purple-400 hover:from-purple-700 hover:via-purple-600 hover:to-purple-500 border border-purple-300/40 shadow-2xl hover:shadow-purple-500/30 transition-all duration-200 hover:scale-[1.04] rounded-2xl lg:rounded-3xl" 
                onClick={start}
              >
                スタート
              </PrimaryBtn>
            </div>
          </FadeSlide>
        </div>
        
        {/* バナーの余白はタイトルでは不要 */}
      </div>
    </Screen>
  );
}
