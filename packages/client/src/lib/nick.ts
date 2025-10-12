const KEY = "app.nick";

export function getNick(): string {
  try {
    const v = localStorage.getItem(KEY);
    if (v && v.trim()) return v;
  } catch {}
  return "ゲスト";
}

export function setNick(nick: string) {
  try {
    localStorage.setItem(KEY, nick);
  } catch {}
} 