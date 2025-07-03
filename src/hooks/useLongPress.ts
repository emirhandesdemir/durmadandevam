'use client';
import { useCallback, useRef } from 'react';

type Event = React.MouseEvent | React.TouchEvent;

export const useLongPress = (
  onLongPress: (event: Event) => void,
  onClick: (event: Event) => void,
  { delay = 400 } = {}
) => {
  const timeout = useRef<NodeJS.Timeout>();
  const longPressTriggered = useRef(false);

  const start = useCallback((event: Event) => {
    // If we're using a mouse, we can ignore the event if it's not the left button.
    if ('button' in event && (event as React.MouseEvent).button !== 0) {
      return;
    }
    longPressTriggered.current = false;
    timeout.current = setTimeout(() => {
      onLongPress(event);
      longPressTriggered.current = true;
    }, delay);
  }, [onLongPress, delay]);

  const clear = useCallback((event: Event) => {
    timeout.current && clearTimeout(timeout.current);
    if (longPressTriggered.current === false) {
      onClick(event);
    }
  }, [onClick]);

  const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      onLongPress(e);
  };

  return {
    onMouseDown: (e: React.MouseEvent) => start(e),
    onTouchStart: (e: React.TouchEvent) => start(e),
    onMouseUp: (e: React.MouseEvent) => clear(e),
    onMouseLeave: (e: React.MouseEvent) => {
      timeout.current && clearTimeout(timeout.current);
    },
    onTouchEnd: (e: React.TouchEvent) => clear(e),
    onContextMenu: handleContextMenu,
  };
};

export default useLongPress;
