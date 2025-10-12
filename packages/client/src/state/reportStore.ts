import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ReportState {
  // 当日の通報履歴（端末単位）
  dailyReports: Set<string>; // targetPlayerIdの集合
  // 通報ポイント（当日の合計）
  dailyPoints: number;
  // ロック状態
  isLocked: boolean;
  // ロック解除時刻
  lockUntil: number | null;
  
  // アクション
  addReport: (targetPlayerId: string, points: number) => void;
  setLockStatus: (isLocked: boolean, lockUntil: number | null) => void;
  resetDaily: () => void;
  canReport: (targetPlayerId: string) => boolean;
}

export const useReportStore = create<ReportState>()(
  persist(
    (set, get) => ({
      dailyReports: new Set(),
      dailyPoints: 0,
      isLocked: false,
      lockUntil: null,

      addReport: (targetPlayerId: string, points: number) => {
        const state = get();
        const newReports = new Set(state.dailyReports);
        newReports.add(targetPlayerId);
        
        set({
          dailyReports: newReports,
          dailyPoints: state.dailyPoints + points,
        });
      },

      setLockStatus: (isLocked: boolean, lockUntil: number | null) => {
        set({ isLocked, lockUntil });
      },

      resetDaily: () => {
        set({
          dailyReports: new Set(),
          dailyPoints: 0,
          isLocked: false,
          lockUntil: null,
        });
      },

      canReport: (targetPlayerId: string) => {
        const state = get();
        return !state.dailyReports.has(targetPlayerId);
      },
    }),
    {
      name: "report-storage",
      // SetオブジェクトをJSONに変換
      serialize: (state) => {
        const safeState = state as any;
        return JSON.stringify({
          ...safeState,
          dailyReports: Array.from(safeState.dailyReports || new Set()),
        });
      },
      // JSONからSetオブジェクトに復元
      deserialize: (str) => {
        const parsed = JSON.parse(str) as any;
        return {
          ...parsed,
          dailyReports: new Set(parsed.dailyReports || []),
        };
      },
    }
  )
);

// 日次リセットのためのヘルパー関数
export const checkAndResetDaily = () => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  
  const state = useReportStore.getState();
  
  // 安全な初期化チェック
  if (!state.dailyReports) {
    state.resetDaily();
    return;
  }
  
  const lastReset = state.lockUntil ? new Date(state.lockUntil).getTime() : 0;
  
  // 日付が変わった場合はリセット
  if (today > lastReset) {
    state.resetDaily();
  }
}; 