import { useEffect, useState } from "react";

export default function useKeyboardVisible(threshold = 120) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const vv = (window as any).visualViewport as VisualViewport | undefined;
    if (!vv) return;
    let base = vv.height;
    const onChange = () => {
      if (!vv) return;
      const dh = Math.max(0, base - vv.height);
      setVisible(dh > threshold);
    };
    vv.addEventListener("resize", onChange);
    vv.addEventListener("scroll", onChange);
    return () => {
      vv.removeEventListener("resize", onChange);
      vv.removeEventListener("scroll", onChange);
    };
  }, [threshold]);
  return visible;
} 