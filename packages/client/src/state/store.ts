import { create } from "zustand";
import type { RoomState } from "@secret/shared/src/gameTypes";

type State = {
  room: RoomState | null;
  endsAt: number;
  myId: string | null;
  isCustomMode: boolean; // フロントエンド側でカスタムモードを管理
  setRoom: (room: RoomState) => void;
  setEndsAt: (t: number) => void;
  setMyId: (id: string) => void;
  setIsCustomMode: (isCustomMode: boolean) => void;
  reset: () => void;
};

export const useAppStore = create<State>((set) => ({
  room: null,
  endsAt: 0,
  myId: null,
  isCustomMode: false, // デフォルトはfalse
  setRoom: (room) => set({ room }),
  setEndsAt: (t) => set({ endsAt: t }),
  setMyId: (id) => set({ myId: id }),
  setIsCustomMode: (isCustomMode) => set({ isCustomMode }),
  reset: () => set({ room: null, endsAt: 0, myId: null, isCustomMode: false }),
})); 