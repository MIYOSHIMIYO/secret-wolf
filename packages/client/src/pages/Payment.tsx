/**
 * 感想・質問・交流ページ
 * オフィシャルサイトへのリンク機能
 */

import { useState } from 'react';
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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900">
        {/* ヘッダー部分 */}
        <div className="p-6 lg:p-8 xl:p-12">
          <div className="text-center space-y-3">
            <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-white">感想・質問・交流</h1>
            <p className="text-gray-200 text-lg lg:text-xl xl:text-2xl">ゲームの感想や質問、交流の場をご提供します</p>
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="px-6 lg:px-8 xl:px-12 pb-20 lg:pb-32">
          <div className="max-w-6xl mx-auto space-y-8 lg:space-y-12">
            {/* メインアクションカード */}
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 lg:p-12 xl:p-16 text-center space-y-8 lg:space-y-12 border border-white/20">
              {/* サムネイル画像 */}
              <div className="flex justify-center">
                <div className="relative">
                  <img 
                    src={siteImage} 
                    alt="ミヨシ ユウダイ のオフィシャルサイト" 
                    className="w-24 h-24 lg:w-32 lg:h-32 xl:w-40 xl:h-40 object-cover rounded-2xl shadow-2xl ring-4 ring-white/20"
                  />
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>
              
              {/* タイトルと説明 */}
              <div className="space-y-4 lg:space-y-6">
                <h2 className="text-2xl lg:text-3xl xl:text-4xl font-bold text-white">
                  ミヨシ ユウダイ のオフィシャルサイト
                </h2>
                <p className="text-gray-200 text-lg lg:text-xl xl:text-2xl leading-relaxed">
                  ゲームの感想や質問、交流の場としてご利用ください
                </p>
                <p className="text-gray-300 text-base lg:text-lg xl:text-xl">
                  開発者との直接的なコミュニケーションが可能です
                </p>
              </div>

              {/* メインアクションボタン */}
              <div className="pt-6 lg:pt-8">
                <PrimaryBtn
                  onClick={handleExternalLink}
                  disabled={isRedirecting}
                  className="w-full lg:w-auto px-12 py-4 lg:py-5 xl:py-6 text-lg lg:text-xl xl:text-2xl font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center"
                >
                  {isRedirecting ? (
                    <div className="flex items-center justify-center space-x-3">
                      <div className="w-5 h-5 lg:w-6 lg:h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>リダイレクト中...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-3">
                      <span>オフィシャルサイトへ</span>
                      <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                  )}
                </PrimaryBtn>
              </div>
            </div>

            {/* 利用案内カード */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 lg:p-8 xl:p-12 border border-white/10">
              <h3 className="text-xl lg:text-2xl xl:text-3xl font-bold text-white mb-6 lg:mb-8">ご利用について</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 lg:w-8 lg:h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 lg:w-4 lg:h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-gray-200 text-sm lg:text-base xl:text-lg">外部サイトに移動します</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 lg:w-8 lg:h-8 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 lg:w-4 lg:h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-gray-200 text-sm lg:text-base xl:text-lg">感想・質問・交流は自由にご利用ください</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 lg:w-8 lg:h-8 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 lg:w-4 lg:h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-gray-200 text-sm lg:text-base xl:text-lg">ゲームの進行に影響はありません</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 lg:w-8 lg:h-8 bg-orange-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 lg:w-4 lg:h-4 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-gray-200 text-sm lg:text-base xl:text-lg">開発者との直接的なコミュニケーションが可能です</p>
                </div>
              </div>
            </div>

            {/* 戻るボタン */}
            <div className="text-center pt-8 lg:pt-12">
              <SecondaryBtn
                onClick={() => navigate('/menu')}
                className="px-8 py-3 lg:py-4 xl:py-5 text-lg lg:text-xl xl:text-2xl font-medium rounded-xl hover:bg-white/10 transition-colors duration-300"
              >
                メニューに戻る
              </SecondaryBtn>
            </div>
          </div>
        </div>
      </div>
    </Screen>
  );
}
