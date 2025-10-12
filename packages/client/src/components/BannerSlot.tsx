import React from "react";
import { usePrefs } from "@/state/prefs";

type Props = { place: string; height?: number; hidden?: boolean };

export default function BannerSlot({ place, height = 56, hidden = false }: Props) {
  const adFreeAll = usePrefs((s) => s.adFreeAll);
  if (hidden || adFreeAll) return null;
  return <div style={{ height }} aria-label={`banner-${place}`} />;
} 