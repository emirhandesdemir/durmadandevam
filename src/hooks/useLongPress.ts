
'use client';
import { useCallback, useRef, MouseEvent, TouchEvent } from 'react';

type Event = MouseEvent | TouchEvent;

// A type guard to check if an event is a touch event.
function isTouchEvent(event: Event): event is TouchEvent {
  return "touches" in event;
}

// A type guard to check if an event is a mouse event.
function isMouseEvent(event: Event): event is MouseEvent {
  return "button" in event;
}


export const useLongPress = (
  onLongPress: (event: Event) => void,
  onClick: (event: Event) => void,
  { delay = 300 } = {}
) => {
  const timeout = useRef<NodeJS.Timeout>();
  const longPressTriggered = useRef(false);

  const start = useCallback(
    (event: Event) => {
      // Prevent activating on right-click
      if (isMouseEvent(event) && event.button !== 0) {
        return;
      }
      
      longPressTriggered.current = false;
      timeout.current = setTimeout(() => {
        onLongPress(event);
        longPressTriggered.current = true;
      }, delay);
    },
    [onLongPress, delay]
  );

  const clear = useCallback(
    (event: Event) => {
      timeout.current && clearTimeout(timeout.current);
      // Prevent click from firing after a long press
      if (longPressTriggered.current === false) {
        onClick(event);
      }
    },
    [onClick]
  );
  
   const handleContextMenu = (e: MouseEvent) => {
      // This will be handled by the start/clear logic for left-click-and-hold
      e.preventDefault();
  };

  return {
    onMouseDown: (e: MouseEvent) => start(e),
    onTouchStart: (e: TouchEvent) => start(e),
    onMouseUp: (e: MouseEvent) => clear(e),
    onTouchEnd: (e: TouchEvent) => clear(e),
    onMouseLeave: (e: MouseEvent) => {
        timeout.current && clearTimeout(timeout.current);
    },
    onContextMenu: handleContextMenu
  };
};

export default useLongPress;
