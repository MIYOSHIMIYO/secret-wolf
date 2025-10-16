import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";

export default function Terms() {
  const navigate = useNavigate();
  const [isOpeningBrowser, setIsOpeningBrowser] = useState(false);

  // 正本URLをブラウザで開く
  const openFullTerms = async () => {
    if (isOpeningBrowser) return;
    
    setIsOpeningBrowser(true);
    try {
      // 正本URL
      const fullTermsUrl = "https://miyoshimiyo.github.io/secret-werewolf-legal/terms/";
      
      // Capacitor Browserが利用できない場合は、通常のwindow.openを使用
      if (window.open) {
        window.open(fullTermsUrl, "_blank");
      }
    } catch (error) {
      console.error("ブラウザ起動エラー:", error);
    } finally {
      setIsOpeningBrowser(false);
    }
  };

  return (
    <Screen>
      <div className="h-full bg-white text-black flex flex-col overflow-hidden">
        {/* ヘッダー */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-4">
          <div className="text-center">
            <h1 className="text-xl font-semibold">利用規約</h1>
          </div>
        </div>

      {/* 本文 - スクロール可能な領域 */}
      <div className="flex-1 overflow-y-auto px-4 py-6 min-h-0">
        <div className="max-w-2xl mx-auto space-y-6 text-sm leading-relaxed">
          {/* アプリ情報 */}
          <div className="text-center space-y-2">
            <h2 className="text-lg font-semibold">秘密人狼 — 誰かの秘密が落ちている</h2>
            <p className="text-gray-600">利用規約 v1.0.0（改定日：2024年12月1日）</p>
          </div>

          <p>
            本規約は、本サービス「秘密人狼 — 誰かの秘密が落ちている」（以下「本サービス」）の利用条件を定めるものです。本サービスは、ブラウザ上で動作するオンライン人狼ゲームです。利用者（以下「ユーザー」）は、本サービスの利用にあたり、本規約に同意したものとみなします。
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800">
              ※詳細版（正本）は以下のURLに掲載します：<a href="https://miyoshimiyo.github.io/secret-werewolf-legal/terms/" className="text-blue-600 underline">https://miyoshimiyo.github.io/secret-werewolf-legal/terms/</a>
            </p>
          </div>

          {/* 1. 本サービスの概要 */}
          <section>
            <h3 className="text-base font-semibold mb-2">1. 本サービスの概要</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>3人以上の参加で、一人の「秘密」を題材に推理・議論・投票を行うゲームです。</li>
              <li>「知り合いと遊ぶ」（招待制）と「知らない誰かと」（ランダム）を提供します。</li>
              <li>ゲームは1ラウンド完結。進行・結果は通信状況により変動する場合があります。</li>
              <li>本サービスは、ブラウザ上で直接利用可能で、特別な登録手続きは不要です。</li>
            </ul>
          </section>

          {/* 2. 年齢・同意 */}
          <section>
            <h3 className="text-base font-semibold mb-2">2. 年齢・同意</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>未成年は、親権者の同意を得たうえで利用してください。</li>
              <li>本規約に同意できない場合、利用を中止してください。</li>
            </ul>
          </section>

          {/* 3. ニックネーム・識別子 */}
          <section>
            <h3 className="text-base font-semibold mb-2">3. ニックネーム・識別子</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>ニックネーム・アイコンは公序良俗に反しないものを設定してください。</li>
              <li>本サービスは安全対策・マッチング等のため、<strong>匿名の端末識別子（ブラウザ情報等）</strong>を用います。</li>
            </ul>
          </section>

          {/* 4. チャット等のユーザー投稿（UGC） */}
          <section>
            <h3 className="text-base font-semibold mb-2">4. チャット等のユーザー投稿（UGC）</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>議論シーンではテキストチャットを利用できます。</li>
              <li>投稿内容の権利・責任はユーザーに帰属します。個人情報や第三者の権利侵害となる投稿は禁止です。</li>
              <li>チャットは議論シーン限定の短命データであり、本文はサーバに保存しません（通信・安全対策のための最小限のメタ情報は扱います）。</li>
            </ul>
          </section>

          {/* 5. 禁止事項（抜粋） */}
          <section>
            <h3 className="text-base font-semibold mb-2">5. 禁止事項（抜粋）</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>法令・公序良俗違反、差別・誹謗中傷、過度なわいせつ表現、スパム・広告・勧誘、なりすまし、チート・妨害行為、個人情報の投稿。</li>
              <li>そのほか運営が不適切と判断する行為。</li>
            </ul>
          </section>

          {/* 6. 安全機能（通報・プレイ制限） */}
          <section>
            <h3 className="text-base font-semibold mb-2">6. 安全機能（通報・プレイ制限）</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>議論シーンでは、チャット気泡／送信者アバターの長押しから通報できます。</li>
              <li>本文は送信・保存しません。通報は匿名カウントとして集計し、一定ポイントに到達した端末は、当日（JST 0:00 まで）プレイを制限します。</li>
              <li>制限の有無・解除予定はメニュー画面で案内します。しきい値・集計方法は運用上の必要に応じて調整します。</li>
              <li>現在のルーム進行中に到達した場合、当該ラウンドは継続し、次回以降のプレイが制限されます。</li>
            </ul>
          </section>

          {/* 7. マッチング・中断 */}
          <section>
            <h3 className="text-base font-semibold mb-2">7. マッチング・中断</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>ランダム対戦は人数が揃い次第開始します。3人未満となった場合、ゲームは中断されます。</li>
              <li>通信障害・端末状態等により、進行が同期できない場合があります。</li>
            </ul>
          </section>


          {/* 8. 免責 */}
          <section>
            <h3 className="text-base font-semibold mb-2">8. 免責</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>本サービスの提供・変更・一時停止・終了等によりユーザーに生じた損害について、当方は一切の責任を負いません（法令で免責が認められない場合を除く）。</li>
              <li>通信回線・ブラウザ・決済システム側の障害、不可抗力（災害等）による影響についても同様とします。</li>
            </ul>
          </section>

          {/* 9. 規約の変更 */}
          <section>
            <h3 className="text-base font-semibold mb-2">9. 規約の変更</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>本規約は、必要に応じて改定します。改定後の内容は正本URLの掲載時から効力を生じます。</li>
              <li>重要な変更時は、アプリ内でお知らせします。</li>
            </ul>
          </section>

          {/* 10. 準拠法・裁判管轄 */}
          <section>
            <h3 className="text-base font-semibold mb-2">10. 準拠法・裁判管轄</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>本規約は日本法に準拠します。</li>
              <li>本規約に関して紛争が生じた場合、当方の主たる事業所（又は住所）所在地を管轄する地方裁判所又は簡易裁判所を第一審の専属的合意管轄裁判所とします。</li>
            </ul>
          </section>

          {/* 11. お問い合わせ */}
          <section>
            <h3 className="text-base font-semibold mb-2">11. お問い合わせ</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>連絡先：<a href="mailto:support@secret-werewolf.com" className="text-blue-600 underline">support@secret-werewolf.com</a></li>
              <li>プライバシーポリシー：<a href="https://miyoshimiyo.github.io/secret-werewolf-legal/privacy/" className="text-blue-600 underline">https://miyoshimiyo.github.io/secret-werewolf-legal/privacy/</a></li>
            </ul>
          </section>

          {/* 正本リンク */}
          <div className="text-center pt-4">
            <p className="text-gray-600">—</p>
            <p className="text-blue-600 underline">正本（詳細版）を開く：<a href="https://miyoshimiyo.github.io/secret-werewolf-legal/terms/" className="text-blue-600 underline">https://miyoshimiyo.github.io/secret-werewolf-legal/terms/</a></p>
          </div>
        </div>
      </div>

      {/* フッター */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-4 pb-safe">
        <div className="flex justify-between items-center">
          {/* 戻るボタン */}
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
          >
            戻る
          </button>

          {/* 正本をブラウザで開くボタン */}
          <button
            onClick={openFullTerms}
            disabled={isOpeningBrowser}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
          >
            {isOpeningBrowser ? "開いています..." : "正本をブラウザで開く"}
          </button>
        </div>
      </div>
      </div>
    </Screen>
  );
} 