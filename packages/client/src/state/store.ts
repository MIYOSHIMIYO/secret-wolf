import { create } from "zustand";
import type { RoomState } from "@secret/shared/src/gameTypes";

type State = {
  room: RoomState | null;
  endsAt: number;
  myId: string | null;
  setRoom: (room: RoomState) => void;
  setEndsAt: (t: number) => void;
  setMyId: (id: string) => void;
  reset: () => void;
};

export const useAppStore = create<State>((set) => ({
  room: null,
  endsAt: 0,
  myId: null,
  setRoom: (room) => set({ room }),
  setEndsAt: (t) => set({ endsAt: t }),
  setMyId: (id) => set({ myId: id }),
  reset: () => set({ room: null, endsAt: 0, myId: null }),
})); 