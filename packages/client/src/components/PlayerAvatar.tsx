/// <reference types="vite/client" />
import { useMemo, useState } from "react";
import { avatarById } from "@/assets/avatars";

type Props = { iconId: number; size?: number };

function svgDataUrl(seed: number, size: number): string {
  const h = (seed * 9301 + 49297) % 233280;
  const hue = (h / 233280) * 360;
  const s1 = 65 + (seed % 20);
  const l1 = 50 + (seed % 10);
  const s2 = 55 + ((seed >> 2) % 20);
  const l2 = 40 + ((seed >> 3) % 15);
  const rects = [0, 1, 2, 3, 4].map((i) => {
    const on = ((seed >> i) & 1) === 1;
    const x = (i % 3) * (size / 3);
    const y = Math.floor(i / 3) * (size / 3);
    return on ? `<rect x="${x}" y="${y}" width="${size / 3}" height="${size / 3}" fill="hsl(${hue + i * 12}, ${s2}%, ${l2}%)"/>` : "";
  }).join("");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'>
    <defs><radialGradient id='g' cx='50%' cy='35%'><stop offset='0%' stop-color='hsl(${hue}, ${s1}%, ${l1}%)'/><stop offset='100%' stop-color='hsl(${hue+30}, ${s1-10}%, ${l1-20}%)'/></radialGradient></defs>
    <rect width='100%' height='100%' rx='${size/2}' fill='url(#g)'/>
    ${rects}
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export default function PlayerAvatar({ iconId, size = 40 }: Props) {
  const [fallback, setFallback] = useState<string | null>(null);
  const style: React.CSSProperties = { width: size, height: size };
  const svg = useMemo(() => svgDataUrl(iconId | 0, size), [iconId, size]);

  // アバター画像のURLを取得（iconIdは1-20の範囲、0-19に変換）
  const avatarUrl = avatarById(iconId - 1);
  const src = fallback ?? avatarUrl ?? svg; // 最後はSVGで確実に表示

  return (
    <div className="rounded-full bg-black/50 border border-white/10 overflow-hidden" style={style}>
      <img
        src={src}
        width={size}
        height={size}
        alt="avatar"
        onError={() => setFallback(svg)}
        className="block object-cover w-full h-full"
      />
    </div>
  );
} 