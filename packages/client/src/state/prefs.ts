import { create } from "zustand";

export type PrefsState = {
  noVideoAds: boolean; // 購入により動画広告のみ非表示
  adFreeAll: boolean;  // 購入により全広告非表示
  setNoVideoAds: (v: boolean) => void;
  setAdFreeAll: (v: boolean) => void;
};

export const usePrefs = create<PrefsState>((set) => ({
  noVideoAds: false,
  adFreeAll: false,
  setNoVideoAds: (v) => set({ noVideoAds: v }),
  setAdFreeAll: (v) => set({ adFreeAll: v }),
})); 