import React from "react";
import { useViewportScale } from "@/hooks/useViewportScale";

type Props = {
  children: React.ReactNode;
  bannerHeight?: number; // reserve bottom space for banner
  fullBleed?: boolean; // タイトルなど上下余白を無くす
  contentScrollable?: boolean; // シーン全体を縦スクロールさせるか（デフォルト: 有効）
  topPadAdjustPx?: number; // 特定シーン向けの上部余白微調整（px）
  className?: string; // ルートdiv用追加クラス
  innerClassName?: string; // 内部ラッパー用追加クラス
  maxWidth?: number; // デスクトップ時の最大幅
};

export default function Screen({
  children,
  bannerHeight = 0,
  fullBleed = false,
  contentScrollable = true,
  topPadAdjustPx = 0,
  className = "",
  innerClassName = "",
  maxWidth = 800
}: Props) {
  // ビューポートスケーリングを初期化
  useViewportScale();
  return (
    <div
      className={
        "h-screen w-full text-slate-50 overflow-hidden " +
        "bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,.35),transparent_50%),linear-gradient(180deg,#0b0f1a_0%,#111827_100%)] " +
        className
      }
      style={{
        // Safe Area対応 - ノッチやステータスバーを避ける（全体を少し広げるため 15px→19px ベース）
        paddingTop: fullBleed ? 0 : `calc(env(safe-area-inset-top) + ${34 + topPadAdjustPx}px)`,
        paddingBottom: fullBleed ? 0 : `calc(env(safe-area-inset-bottom) + 4px)`,
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
        // 画面全体はスクロールしない（シーン側のスクロール要素で制御）
        touchAction: "auto",
        overscrollBehavior: "none",
        // 画面サイズの制御
        minHeight: "100vh",
        maxHeight: "100vh",
        position: "relative",
        // 縦の比率を短くして余白を作る
        display: "flex",
        flexDirection: "column",
        justifyContent: fullBleed ? "stretch" : "flex-start"
      }}
    >
      <div 
        className={`mx-auto w-full flex flex-col ${innerClassName}`} 
        style={{ 
          maxWidth: fullBleed ? "100vw" : maxWidth,
          // シーン全体のスクロール可否を切り替え（About/一覧/チャット等はtrue、固定画面はfalse）
          overflowY: contentScrollable ? "auto" : "hidden",
          overflowX: "hidden",
          WebkitOverflowScrolling: contentScrollable ? "touch" : "auto",
          // 各シーンの共通余白ポリシーに合わせ、コンテナは全高にフィット
          maxHeight: fullBleed ? "100vh" : "100%",
          minHeight: fullBleed ? "100vh" : "100%"
        }}
      >
        {children}
      </div>
    </div>
  );
} 
