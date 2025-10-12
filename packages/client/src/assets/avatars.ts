// アバター画像の管理
export const AVATARS: string[] = Array.from({ length: 20 }, (_, i) =>
  new URL(`./avatars/icon${i + 1}.png`, import.meta.url).toString()
);

// iconId は 0..19 を想定
export const avatarById = (id: number) => AVATARS[id % AVATARS.length];

