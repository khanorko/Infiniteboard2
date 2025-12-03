import { useRef, useCallback } from 'react';

interface GestureCallbacks {
  onPinch?: (scale: number, centerX: number, centerY: number) => void;
  onDoubleTap?: (x: number, y: number) => void;
  onPan?: (dx: number, dy: number) => void;
}

export const useMobileGestures = (callbacks: GestureCallbacks) => {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapRef = useRef<number>(0);
  const pinchStartRef = useRef<{ distance: number; centerX: number; centerY: number } | null>(null);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const isPinchingRef = useRef(false);
  const isPanningRef = useRef(false);

  const getDistance = (touches: TouchList): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getCenter = (touches: TouchList): { x: number; y: number } => {
    if (touches.length === 0) return { x: 0, y: 0 };
    if (touches.length === 1) {
      return { x: touches[0].clientX, y: touches[0].clientY };
    }
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touches = e.touches;
    
    if (touches.length === 2) {
      // Pinch start
      isPinchingRef.current = true;
      const distance = getDistance(touches);
      const center = getCenter(touches);
      pinchStartRef.current = { distance, centerX: center.x, centerY: center.y };
    } else if (touches.length === 1) {
      // Single touch - could be swipe, tap, or pan
      const touch = touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
      panStartRef.current = { x: touch.clientX, y: touch.clientY };
      isPanningRef.current = false;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touches = e.touches;
    
    if (touches.length === 2 && isPinchingRef.current && pinchStartRef.current) {
      // Pinch zoom
      const currentDistance = getDistance(touches);
      const center = getCenter(touches);
      const scale = currentDistance / pinchStartRef.current.distance;
      callbacks.onPinch?.(scale, center.x, center.y);
    } else if (touches.length === 1 && panStartRef.current) {
      // Pan/drag
      const touch = touches[0];
      const dx = touch.clientX - panStartRef.current.x;
      const dy = touch.clientY - panStartRef.current.y;
      
      // Only trigger pan if movement is significant (avoid accidental pans)
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        isPanningRef.current = true;
        callbacks.onPan?.(dx, dy);
        panStartRef.current = { x: touch.clientX, y: touch.clientY };
      }
    }
  }, [callbacks]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const touches = e.changedTouches;
    
    if (touches.length === 1 && touchStartRef.current) {
      const touch = touches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const time = Date.now() - touchStartRef.current.time;
      
      // Check for double tap
      const timeSinceLastTap = Date.now() - lastTapRef.current;
      if (timeSinceLastTap < 300 && distance < 10) {
        // Double tap
        callbacks.onDoubleTap?.(touch.clientX, touch.clientY);
        lastTapRef.current = 0;
      } else if (distance < 10 && time < 300) {
        // Single tap - store for potential double tap
        lastTapRef.current = Date.now();
      }
      // Swipe gestures removed - no longer needed
    }
    
    // Reset
    if (e.touches.length === 0) {
      isPinchingRef.current = false;
      isPanningRef.current = false;
      pinchStartRef.current = null;
      panStartRef.current = null;
      touchStartRef.current = null;
    }
  }, [callbacks]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
};

