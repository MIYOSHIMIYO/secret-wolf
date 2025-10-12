/**
 * 支払い成功ページ
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Screen from '@/components/Screen';
import HeaderBar from '@/components/HeaderBar';
import Panel from '@/components/Panel';
import { PrimaryBtn } from '@/components/Buttons';
import { showToast } from '@/lib/toast';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  useEffect(() => {
    const sessionIdParam = searchParams.get('session_id');
    if (sessionIdParam) {
      setSessionId(sessionIdParam);
      // セッション情報を取得（実装は後で追加）
      setIsLoading(false);
    } else {
      // セッションIDがない場合はエラー
      showToast('支払いセッションが見つかりません', 'error');
      navigate('/payment');
    }
  }, [searchParams, navigate]);

  const handleReturnToMenu = () => {
    navigate('/menu');
  };

  if (isLoading) {
    return (
      <Screen>
        <div className="flex flex-col h-full items-center justify-center">
          <div className="text-white text-lg">支払い情報を確認中...</div>
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <div className="flex flex-col h-full lg:min-h-screen lg:gap-8">
        {/* 画面固定のヘッダーエリア */}
        <div className="p-4 bg-gray-900 border-b border-gray-700 lg:bg-transparent lg:border-none lg:px-8">
          <Panel className="px-5 py-6 lg:px-10 lg:py-8">
            <div className="space-y-4 text-center lg:text-left lg:space-y-3">
              <h2 className="text-2xl font-bold text-white lg:text-3xl">支払い完了</h2>
              <p className="text-gray-300 lg:text-base">ご支援ありがとうございます！</p>
            </div>
          </Panel>
        </div>

        {/* スクロール可能なコンテンツ */}
        <div className="flex-1 p-4 space-y-6 overflow-y-auto lg:p-8 lg:pt-0 lg:space-y-8 lg:overflow-visible">
          <div className="flex flex-col space-y-6 lg:max-w-2xl lg:mx-auto">
            {/* 成功メッセージ */}
            <Panel className="px-5 py-6 lg:px-8 lg:py-8">
              <div className="space-y-6 text-center">
                {/* 成功アイコン */}
                <div className="text-6xl mb-4">✅</div>
                
                {/* タイトル */}
                <h3 className="text-2xl font-bold text-white mb-2">
                  支払いが完了しました
                </h3>
                
                {/* メッセージ */}
                <div className="space-y-4">
                  <p className="text-gray-300 text-lg">
                    ご支援いただき、ありがとうございます！
                  </p>
                  <p className="text-gray-400">
                    あなたのご支援がゲームの継続的な開発を支えます。
                  </p>
                </div>

                {/* セッション情報 */}
                {sessionId && (
                  <div className="bg-gray-700 rounded-lg p-4 mt-6">
                    <div className="text-sm text-gray-400 mb-2">セッションID</div>
                    <div className="text-white font-mono text-sm break-all">
                      {sessionId}
                    </div>
                  </div>
                )}
              </div>
            </Panel>

            {/* 次のステップ */}
            <Panel className="px-5 py-6 lg:px-8 lg:py-8">
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white">次のステップ</h3>
                <div className="space-y-3 text-gray-300">
                  <p>• ゲームを楽しんでください</p>
                  <p>• 新しい機能のリリースをお待ちください</p>
                  <p>• ご質問があればお気軽にお問い合わせください</p>
                </div>
              </div>
            </Panel>
          </div>
        </div>

        {/* 画面固定のボタンエリア */}
        <div className="p-4 bg-gray-900 border-t border-gray-700 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <PrimaryBtn
              onClick={handleReturnToMenu}
              className="w-full"
            >
              メニューに戻る
            </PrimaryBtn>
          </div>
        </div>
      </div>
    </Screen>
  );
}