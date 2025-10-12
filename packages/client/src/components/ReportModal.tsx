import { useState } from "react";
import { send } from "@/net/ws";
import { getInstallId } from "@/lib/installId";
import { showToast } from "@/lib/toast";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPlayerId: string;
  targetNick: string;
  messageId?: string;
}

export default function ReportModal({
  isOpen,
  onClose,
  targetPlayerId,
  targetNick,
  messageId
}: ReportModalProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReport = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      const installId = getInstallId();
      
      // 通報メッセージを送信
      send("report", {
        targetPlayerId,
        messageId,
        installId
      });
      
      // 成功トーストを表示
      showToast("通報しました", "info");
      
      // モーダルを閉じる
      onClose();
      
    } catch (error) {
      console.error("通報送信エラー:", error);
      showToast("送信に失敗しました。通信状況をご確認ください", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isConfirming) {
      setIsConfirming(false);
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-2xl p-6 max-w-sm mx-4 ring-1 ring-white/10 shadow-2xl">
        {!isConfirming ? (
          // 初回モーダル
          <div className="text-center space-y-4">
            <div className="text-white text-lg font-medium">
              通報しますか？
            </div>
            <div className="text-white/70 text-sm leading-relaxed">
              通報は匿名で送信されます。一定ポイントに達すると、その日はプレイできなくなります。
            </div>
            <div className="text-white/60 text-xs">
              対象: {targetNick}
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleCancel}
                className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-xl font-semibold transition-colors"
              >
                戻る
              </button>
              <button
                onClick={() => setIsConfirming(true)}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors"
              >
                通報
              </button>
            </div>
          </div>
        ) : (
          // 確認モーダル
          <div className="text-center space-y-4">
            <div className="text-white text-lg font-medium">
              本当に通報しますか？
            </div>
            <div className="text-white/70 text-sm leading-relaxed">
              この操作は取り消せません。
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleCancel}
                className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-xl font-semibold transition-colors"
              >
                いいえ
              </button>
              <button
                onClick={handleReport}
                disabled={isSubmitting}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white rounded-xl font-semibold transition-colors"
              >
                {isSubmitting ? "送信中..." : "はい"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 