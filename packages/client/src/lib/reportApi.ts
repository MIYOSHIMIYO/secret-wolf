import { getInstallId } from "./installId";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://secret-werewolf-prod.qmdg2pmnw6.workers.dev";

export interface ReportStatus {
  installId: string;
  totalPoints: number;
  isLocked: boolean;
  unlockTime: string | null;
  reportCount: number;
  reports: Array<{
    targetPlayerId: string;
    points: number;
    timestamp: number;
    roomId: string;
  }>;
}

export async function checkReportStatus(): Promise<ReportStatus> {
  try {
    const installId = getInstallId();
    const response = await fetch(`${API_BASE_URL}/report/status/${installId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // タイムアウトを設定（5秒）
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data as ReportStatus;
    
  } catch (error) {
    // ネットワークエラーの場合は静かにデフォルト値を返す
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.warn("通報ステータスAPIに接続できません。デフォルト値を使用します。");
    } else {
      console.error("通報ステータスチェックエラー:", error);
    }
    
    // エラー時はデフォルト値を返す
    return {
      installId: getInstallId(),
      totalPoints: 0,
      isLocked: false,
      unlockTime: null,
      reportCount: 0,
      reports: []
    };
  }
}

export async function syncReportStatus(): Promise<void> {
  try {
    const status = await checkReportStatus();
    
    // unlockTimeを数値に変換（ISO文字列からタイムスタンプへ）
    const lockUntil = status.unlockTime ? new Date(status.unlockTime).getTime() : null;
    
    // ローカルストレージの通報状態を更新
    const reportStore = await import("../state/reportStore");
    reportStore.useReportStore.getState().setLockStatus(status.isLocked, lockUntil);
    
  } catch (error) {
    console.error("通報ステータス同期エラー:", error);
  }
} 