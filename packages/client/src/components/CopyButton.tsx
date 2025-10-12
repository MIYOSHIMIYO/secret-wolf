import { showToast } from "@/components/Toast";

type Props = { 
  text: string; 
  label?: string;
  onCopySuccess?: () => void;
};

export default function CopyButton({ text, label = "コピー", onCopySuccess }: Props) {
  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      // コピー成功時のコールバックを呼び出し
      if (onCopySuccess) {
        onCopySuccess();
      } else {
        // デフォルトの動作（既存のshowToast）
        showToast("コピーしました");
      }
    } catch {
      showToast("コピーに失敗しました", "error");
    }
  }
  return (
    <button
      onClick={onCopy}
      className="h-8 px-2 text-xs rounded-lg bg-white/10 hover:bg-white/15 text-white focus-visible:ring-2 ring-primary-400"
    >
      {label}
    </button>
  );
} 