import { useEffect, useState } from "react";

export function useViewportCompact() {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const vv = (window as any).visualViewport;
    const decide = () => {
      const h = vv ? vv.height : window.innerHeight;
      const kbOpen = vv ? vv.height < window.innerHeight - 80 : false;
      setCompact(h < 720 || kbOpen);
      document.documentElement.style.setProperty("--vvh", `${h}px`);
    };
    decide();
    vv?.addEventListener("resize", decide);
    window.addEventListener("resize", decide);
    return () => {
      vv?.removeEventListener("resize", decide);
      window.removeEventListener("resize", decide);
    };
  }, []);
  return compact;
} 