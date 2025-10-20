import { Link } from "react-router-dom";
import Screen from "@/components/Screen";
import HeaderBar from "@/components/HeaderBar";
import Panel from "@/components/Panel";

// プロフィール画像のインポート
import profileImage from "@/assets/profilephoto/profile.jpg";

export default function About() {
  return (
    <Screen maxWidth={1100} innerClassName="lg:px-12 lg:py-10">
      <div className="flex flex-col h-screen overflow-hidden px-2 sm:px-3 md:px-4 lg:px-0 pt-2 sm:pt-3 md:pt-4 lg:pt-0 pb-2 lg:pb-4 lg:min-h-[calc(100vh-80px)] lg:gap-6">
        <HeaderBar title="作者について" center />

        <div className="flex-1 overflow-y-auto px-2 sm:px-3 md:px-4 lg:px-0">
          <Panel className="p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12">
            <div className="text-slate-200 space-y-6 sm:space-y-8">
              <div className="text-center lg:text-left">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-yellow-400">
                  作者のごあいさつ
                </h1>
              </div>

              <div className="lg:flex lg:flex-col lg:items-center lg:gap-10">
                <article className="space-y-4 sm:space-y-6 text-sm sm:text-base md:text-lg lg:text-xl leading-relaxed lg:max-w-4xl">
                  <p>
                    こんにちは、製作者のみよしといいます。
                  </p>
                  
                  <p>
                    このアプリ、機能していますでしょうか？というのもこのリリースが第一作目でして、色々と苦戦するところがあります。バグは完全には解消できないと思います。
                  </p>
                  
                  <p>
                    「友だちとこういうのしたら楽しそうなこと」とスマホのメモにためていたネタ帳の片隅に、"秘密人狼"って書いてあったんです。AIを活用すれば数日でゲームが作れると聞いて、、、結果は3か月。世のゲーム制作者のみなさん、そしてそれを支えるすべての人を尊敬します。
                  </p>

                  <hr className="border-yellow-400/30" />

                  <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-semibold text-yellow-300">
                    何を目指してるアプリなのか
                  </h2>
                  
                  <p>
                    「人のことを知りたいな」「自分のことも知ってほしいな」そんな風に思うことがあったりしますよね。そんな思いに応えるようなアプリでしょうか。ルールに縛られすぎず、自由な発想で遊んでください。飲み会の場でも、通話しながらでもOK。"ゲームに忠実"より、"場が温まる"を大切に。
                  </p>

                  <hr className="border-yellow-400/30" />

                  <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-semibold text-yellow-300">
                    誕生秘話とか意図とか
                  </h2>
                  
                  <p>
                    最初はもっと"ゲームらしいゲーム"にしようとしてました。でもリリースを第一に考えて最大限の引き算を行いました。初めて作るゲームなので私はとことん力量不足でしたので。結果として、とてもシンプルなアプリになったと思います。今回の制作は一人開発。AIにひたすら指示を出す日々でした。因みになぜこのような製作者についてのページをつくったのか？それは「作った人がどんな人か、わかる」って、これからの時代、大切だと思うからです。信用、信頼が大事ってことですかね。
                  </p>

                  <hr className="border-yellow-400/30" />

                  <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-semibold text-yellow-300">
                    最後に
                  </h2>
                  
                  <p>
                    このゲームは、人の"変"を抱きしめるための小さな場です。人は変な生き物です。変だけどそれがその人らしさです。
                  </p>
                  
                  <p>
                    自分の打ち明けたい秘密に自信を持ってください。誰かの聞いて欲しい秘密に寄り添ってあげてください。
                  </p>
                  
                  <p>
                    それでは、良い秘密を。良い嘘を。良いユーモアを。
                  </p>
                </article>

                <div className="mt-8 sm:mt-10 md:mt-12 lg:mt-10 flex justify-center">
                  <img 
                    src={profileImage} 
                    alt="みよしのプロフィール写真" 
                    className="w-48 sm:w-52 md:w-56 lg:w-60 xl:w-64 h-auto rounded-2xl shadow-lg border-4 border-yellow-400/30"
                  />
                </div>
              </div>

              <p className="text-right text-yellow-300 font-semibold">
                — みよし
              </p>
            </div>
          </Panel>
        </div>

        {/* 戻るボタン */}
        <div className="px-2 sm:px-3 md:px-4 lg:px-0 pb-20 sm:pb-4 lg:pb-0">
          <Link to="/menu" className="block">
            <div className="h-12 rounded-xl text-white font-semibold text-center flex items-center justify-center active:scale-[0.98] transition-transform bg-slate-600 hover:bg-slate-700">
              メニューに戻る
            </div>
          </Link>
        </div>
      </div>
    </Screen>
  );
}
