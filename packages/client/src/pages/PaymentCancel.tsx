/**
 * 支払いキャンセルページ
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import Screen from '@/components/Screen';
import HeaderBar from '@/components/HeaderBar';
import Panel from '@/components/Panel';
import { PrimaryBtn, SecondaryBtn } from '@/components/Buttons';

export default function PaymentCancel() {
  const navigate = useNavigate();

  const handleRetryPayment = () => {
    navigate('/payment');
  };

  const handleReturnToMenu = () => {
    navigate('/menu');
  };

  return (
    <Screen>
      <div className="flex flex-col h-full lg:min-h-screen lg:gap-8">
        {/* 画面固定のヘッダーエリア */}
        <div className="p-4 bg-gray-900 border-b border-gray-700 lg:bg-transparent lg:border-none lg:px-8">
          <Panel className="px-5 py-6 lg:px-10 lg:py-8">
            <div className="space-y-4 text-center lg:text-left lg:space-y-3">
              <h2 className="text-2xl font-bold text-white lg:text-3xl">支払いキャンセル</h2>
              <p className="text-gray-300 lg:text-base">支払いがキャンセルされました。</p>
            </div>
          </Panel>
        </div>

        {/* スクロール可能なコンテンツ */}
        <div className="flex-1 p-4 space-y-6 overflow-y-auto lg:p-8 lg:pt-0 lg:space-y-8 lg:overflow-visible">
          <div className="flex flex-col space-y-6 lg:max-w-2xl lg:mx-auto">
            {/* キャンセルメッセージ */}
            <Panel className="px-5 py-6 lg:px-8 lg:py-8">
              <div className="space-y-6 text-center">
                {/* キャンセルアイコン */}
                <div className="text-6xl mb-4">❌</div>
                
                {/* タイトル */}
                <h3 className="text-2xl font-bold text-white mb-2">
                  支払いがキャンセルされました
                </h3>
                
                {/* メッセージ */}
                <div className="space-y-4">
                  <p className="text-gray-300 text-lg">
                    支払い処理がキャンセルされました。
                  </p>
                  <p className="text-gray-400">
                    何か問題がございましたら、再度お試しください。
                  </p>
                </div>
              </div>
            </Panel>

            {/* 次のステップ */}
            <Panel className="px-5 py-6 lg:px-8 lg:py-8">
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white">次のステップ</h3>
                <div className="space-y-3 text-gray-300">
                  <p>• 再度支払いを試すことができます</p>
                  <p>• ゲームは無料でお楽しみいただけます</p>
                  <p>• ご質問があればお気軽にお問い合わせください</p>
                </div>
              </div>
            </Panel>
          </div>
        </div>

        {/* 画面固定のボタンエリア */}
        <div className="p-4 bg-gray-900 border-t border-gray-700 lg:px-8">
          <div className="max-w-2xl mx-auto space-y-3">
            <PrimaryBtn
              onClick={handleRetryPayment}
              className="w-full"
            >
              再度支払いを試す
            </PrimaryBtn>
            
            <SecondaryBtn
              onClick={handleReturnToMenu}
              className="w-full"
            >
              メニューに戻る
            </SecondaryBtn>
          </div>
        </div>
      </div>
    </Screen>
  );
}