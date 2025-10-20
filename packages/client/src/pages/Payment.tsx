/**
 * 感想・質問・交流ページ
 * オフィシャルサイトへのリンク機能
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Screen from '@/components/Screen';
import HeaderBar from '@/components/HeaderBar';
import Panel from '@/components/Panel';
import { PrimaryBtn, SecondaryBtn } from '@/components/Buttons';
import siteImage from '@/assets/website/siteimage.jpg';

export default function Payment() {
  const navigate = useNavigate();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleExternalLink = () => {
    setIsRedirecting(true);
    // オフィシャルサイトにリダイレクト
    const externalUrl = 'https://miyoshi.bitfan.id/';
    window.open(externalUrl, '_blank');
    
    // 少し待ってからメニューに戻る
    setTimeout(() => {
      setIsRedirecting(false);
      navigate('/menu');
    }, 2000);
  };

  return (
    <Screen>
      <div className="flex flex-col h-full lg:min-h-screen lg:gap-8">
        {/* 画面固定のヘッダーエリア */}
        <div className="p-4 bg-gray-900 border-b border-gray-700 lg:bg-transparent lg:border-none lg:px-8">
          <Panel className="px-5 py-6 lg:px-10 lg:py-8">
            <div className="space-y-4 text-center lg:text-left lg:space-y-3">
              <h2 className="text-2xl font-bold text-white lg:text-3xl">感想・質問・交流</h2>
              <p className="text-gray-300 lg:text-base">ゲームの感想や質問、交流の場をご提供します。</p>
            </div>
          </Panel>
        </div>

        {/* スクロール可能なコンテンツ */}
        <div className="flex-1 p-4 space-y-6 overflow-y-auto lg:p-8 lg:pt-0 lg:space-y-8 lg:overflow-visible">
          <div className="flex flex-col space-y-6 lg:max-w-2xl lg:mx-auto">
            {/* オフィシャルサイト紹介 */}
            <Panel className="px-5 py-6 lg:px-8 lg:py-8">
              <div className="space-y-6 text-center">
                {/* サムネイル画像 */}
                <div className="flex justify-center mb-4">
                  <img 
                    src={siteImage} 
                    alt="ミヨシ ユウダイ のオフィシャルサイト" 
                    className="w-32 h-32 object-cover rounded-lg shadow-lg"
                  />
                </div>
                
                {/* タイトル */}
                <h3 className="text-2xl font-bold text-white mb-2">
                  ミヨシ ユウダイ のオフィシャルサイト
                </h3>
                
                {/* メッセージ */}
                <div className="space-y-4">
                  <p className="text-gray-300 text-lg">
                    ゲームの感想や質問、交流の場としてご利用ください。
                  </p>
                  <p className="text-gray-400">
                    開発者との直接的なコミュニケーションが可能です。
                  </p>
                </div>

                {/* 外部リンクボタン */}
                <div className="pt-4">
                  <PrimaryBtn
                    onClick={handleExternalLink}
                    disabled={isRedirecting}
                    className="w-full"
                  >
                    {isRedirecting ? 'リダイレクト中...' : 'オフィシャルサイトへ'}
                  </PrimaryBtn>
                </div>
              </div>
            </Panel>

            {/* ご利用について */}
            <Panel className="px-5 py-6 lg:px-8 lg:py-8">
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white">ご利用について</h3>
                <div className="space-y-3 text-gray-300">
                  <p>• 外部サイトに移動します</p>
                  <p>• 感想・質問・交流は自由にご利用ください</p>
                  <p>• ゲームの進行に影響はありません</p>
                  <p>• 開発者との直接的なコミュニケーションが可能です</p>
                </div>
              </div>
            </Panel>
          </div>
        </div>

        {/* 画面固定のボタンエリア */}
        <div className="p-4 bg-gray-900 border-t border-gray-700 lg:px-8 pb-20 sm:pb-4">
          <div className="max-w-2xl mx-auto">
            <SecondaryBtn
              onClick={() => navigate('/menu')}
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
