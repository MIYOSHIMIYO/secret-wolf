import { useCallback, useRef } from "react";

interface UseLongPressOptions {
  onLongPress: () => void;
  onPress?: () => void;
  ms?: number;
  preventDefault?: boolean;
}

export function useLongPress({
  onLongPress,
  onPress,
  ms = 500,
  preventDefault = true
}: UseLongPressOptions) {
  const timerRef = useRef<NodeJS.Timeout>();
  const isLongPress = useRef(false);

  const start = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (preventDefault) {
      e.preventDefault();
    }
    
    isLongPress.current = false;
    
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      onLongPress();
    }, ms);
  }, [onLongPress, ms, preventDefault]);

  const stop = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (preventDefault) {
      e.preventDefault();
    }
    
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    if (!isLongPress.current && onPress) {
      onPress();
    }
  }, [onPress, preventDefault]);

  const handlers = {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: start,
    onTouchEnd: stop,
    onTouchCancel: stop,
  };

  return handlers;
} 