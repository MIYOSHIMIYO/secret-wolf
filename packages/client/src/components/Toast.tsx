import { showToast as baseShow } from "@/lib/toast";

export function showToast(message: string, kind: "info" | "error" = "info") {
  // reuse base but override to bottom center
  const el = document.createElement("div");
  el.textContent = message;
  el.style.position = "fixed";
  el.style.left = "50%";
  el.style.bottom = "20px";
  el.style.transform = "translateX(-50%)";
  el.style.background = kind === "error" ? "rgba(239,68,68,0.95)" : "rgba(59,130,246,0.95)";
  el.style.color = "white";
  el.style.padding = "10px 14px";
  el.style.borderRadius = "12px";
  el.style.zIndex = "9999";
  el.style.boxShadow = "0 8px 30px rgba(0,0,0,.25)";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
} 