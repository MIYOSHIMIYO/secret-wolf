import { useState, useEffect } from 'react';

// 基準サイズ（iPhone 12 Pro相当）
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

// 最小・最大スケーリング係数
const MIN_SCALE = 0.75;  // iPhone SEレベル（少し大きく）
const MAX_SCALE = 1.15;  // iPadレベル（少し小さく）

export function useViewportScale() {
  const [scale, setScale] = useState(1);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateScale = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setViewport({ width, height });
      
      // 幅ベースでスケーリング係数を計算
      const widthScale = width / BASE_WIDTH;
      
      // 高さも考慮（縦長すぎる場合は制限）
      const heightScale = height / BASE_HEIGHT;
      const aspectRatio = width / height;
      const baseAspectRatio = BASE_WIDTH / BASE_HEIGHT;
      
      // アスペクト比が基準から大きく外れている場合は調整
      let finalScale = widthScale;
      if (aspectRatio < baseAspectRatio * 0.7) {
        // 縦長すぎる場合は高さベースで計算（より厳しく）
        finalScale = Math.min(widthScale, heightScale);
      }
      
      // 最小・最大スケーリング係数で制限
      const clampedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, finalScale));
      
      setScale(clampedScale);
      
      // CSSカスタムプロパティとして設定
      document.documentElement.style.setProperty('--viewport-scale', clampedScale.toString());
      document.documentElement.style.setProperty('--viewport-width', `${width}px`);
      document.documentElement.style.setProperty('--viewport-height', `${height}px`);
    };

    // 初期化
    updateScale();

    // リサイズイベントリスナー
    window.addEventListener('resize', updateScale);
    window.addEventListener('orientationchange', updateScale);

    return () => {
      window.removeEventListener('resize', updateScale);
      window.removeEventListener('orientationchange', updateScale);
    };
  }, []);

  return { scale, viewport };
}
