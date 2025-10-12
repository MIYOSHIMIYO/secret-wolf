// content/avatars.ts
// 画像をビルド時に一括取り込み。数が増えても自動で拾う。
const mods = import.meta.glob<{ default: string }>(
  "../assets/avatars/icon*.png",
  { eager: true }
);

const map = new Map<number, string>(); // id -> URL
for (const [path, mod] of Object.entries(mods)) {
  const m = path.match(/icon(\d+)\.png$/i);
  if (m) map.set(Number(m[1]), (mod as any).default as string);
}

export const AVATAR_COUNT = map.size; // 例: 20

export function avatarUrl(id: number): string {
  if (map.size === 0) return "";
  const safe = ((id - 1) % AVATAR_COUNT) + 1; // 範囲外対策
  return map.get(safe)!;
} 