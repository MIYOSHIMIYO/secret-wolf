import { useEffect, useState } from "react";
import Modal from "./Modal";

interface ThankYouModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  priceString: string;
}

export default function ThankYouModal({ isOpen, onClose, productName, priceString }: ThankYouModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      setTimeout(() => setShowMessage(true), 300);
      
      // 3秒後に自動で閉じる
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      
      return () => clearTimeout(timer);
    } else {
      setShowConfetti(false);
      setShowMessage(false);
    }
  }, [isOpen, onClose]);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title=""
      closable={false}
    >
      <div className="relative flex flex-col items-center justify-center p-6">
        {/* メインメッセージ */}
        {showMessage && (
          <div className="text-center space-y-4 animate-fade-in">
            {/* 大きな感謝メッセージ */}
            <div className="space-y-3">
              <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 animate-pulse">
                応援ありがとうございます！
              </h2>
              
              <div className="text-xl font-semibold text-white">
                {priceString}
              </div>
              
              <p className="text-base text-white/80">
                心温まる応援をいただき、<br />
                本当にありがとうございます！
              </p>
            </div>

            {/* ハートアニメーション */}
            <div className="flex justify-center space-x-3">
              <div className="text-2xl animate-bounce" style={{ animationDelay: '0s' }}>💖</div>
              <div className="text-2xl animate-bounce" style={{ animationDelay: '0.2s' }}>💝</div>
              <div className="text-2xl animate-bounce" style={{ animationDelay: '0.4s' }}>💖</div>
            </div>

            {/* 自動で閉じることを示すメッセージ */}
            <p className="text-xs text-white/60 animate-pulse">
              このメッセージは自動で閉じます
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
