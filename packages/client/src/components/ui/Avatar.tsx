import { avatarUrl } from "@/content/avatars";

export function Avatar({
  iconId,
  size = 44,
  alt = "",
  ring = true,
}: { iconId: number; size?: number; alt?: string; ring?: boolean }) {
  const src = avatarUrl(iconId);
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={alt}
      draggable={false}
      className={["rounded-full object-cover select-none", ring ? "ring-2 ring-white/10" : ""].join(" ")}
      loading="eager"
      decoding="async"
    />
  );
} 