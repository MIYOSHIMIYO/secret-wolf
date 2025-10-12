type Kind = "info" | "error" | "success";

let offset = 10;

export function showToast(message: string, kind: Kind = "info", ms = 1800) {
  const el = document.createElement("div");
  el.textContent = message;
  el.style.position = "fixed";
  el.style.left = "50%";
  el.style.top = `${offset}px`;
  el.style.transform = "translateX(-50%)";
  el.style.background = kind === "error" ? "rgba(239,68,68,0.95)" : 
                       kind === "success" ? "rgba(34,197,94,0.95)" : 
                       "rgba(59,130,246,0.95)"; // red-500 / green-500 / blue-500
  el.style.color = "white";
  el.style.padding = "8px 12px";
  el.style.borderRadius = "8px";
  el.style.zIndex = "9999";
  el.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
  document.body.appendChild(el);
  offset += 42;
  setTimeout(() => {
    el.remove();
    offset = Math.max(10, offset - 42);
  }, ms);
} 