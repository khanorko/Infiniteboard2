import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Note, Cluster } from '../types';
import StickyNote from './StickyNote';
import MobileNoteBar from './MobileNoteBar';
import Starfield from './Onboarding/Starfield';
import { useMobileGestures } from '../hooks/useMobileGestures';
import { parseBigPoint, getRelativeOffset, BigPoint } from '../utils/bigCoords';
import { ToolType } from '../types';

interface MobileNoteViewProps {
  focusedNoteId: string | null;
  zoomLevel: number;
  notes: Note[];
  clusters: Cluster[];
  onNoteChange: (noteId: string | null) => void;
  onZoomChange: (zoom: number) => void;
  onCreateNote: (x: string, y: string) => void;
  onNoteUpdate: (id: string, text: string) => void;
  onNoteDelete: (id: string) => void;
  onNoteResize?: (id: string, width: number, height: number) => void;
  viewportCenter: { x: string; y: string };
  onViewportChange: (x: string, y: string) => void;
  onExit?: () => void;
}

const MobileNoteView: React.FC<MobileNoteViewProps> = ({
  focusedNoteId,
  zoomLevel,
  notes = [],
  clusters = [],
  onNoteChange,
  onZoomChange,
  onCreateNote,
  onNoteUpdate,
  onNoteDelete,
  onNoteResize,
  viewportCenter,
  onViewportChange,
  onExit,
}) => {
  const [swipeDownCount, setSwipeDownCount] = useState(0);
  const [isControlsVisible, setIsControlsVisible] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const focusedNote = notes.find(n => n.id === focusedNoteId);
  
  // Ensure viewportCenter has valid values
  const safeViewportCenter = {
    x: viewportCenter?.x || '0',
    y: viewportCenter?.y || '0'
  };
  
  let centerBig;
  try {
    centerBig = parseBigPoint(safeViewportCenter.x, safeViewportCenter.y);
  } catch (error) {
    console.error('Error parsing viewport center:', error);
    centerBig = { x: 0n, y: 0n };
  }
  
  const isFullscreen = zoomLevel >= 1.0;

  // Convert world position to screen position
  const worldToScreen = useCallback((worldX: string, worldY: string): { x: number; y: number } => {
    const worldPoint: BigPoint = { x: BigInt(worldX), y: BigInt(worldY) };
    const relative = getRelativeOffset(worldPoint, centerBig);
    const screenCenterX = window.innerWidth / 2;
    const screenCenterY = window.innerHeight / 2;
    return {
      x: screenCenterX + relative.x * zoomLevel,
      y: screenCenterY + relative.y * zoomLevel,
    };
  }, [centerBig, zoomLevel]);

  // Convert screen position to world coordinates
  const screenToWorld = useCallback((screenX: number, screenY: number): { x: string; y: string } => {
    const screenCenterX = window.innerWidth / 2;
    const screenCenterY = window.innerHeight / 2;
    const relativeX = Math.round((screenX - screenCenterX) / zoomLevel);
    const relativeY = Math.round((screenY - screenCenterY) / zoomLevel);
    return {
      x: (centerBig.x + BigInt(relativeX)).toString(),
      y: (centerBig.y + BigInt(relativeY)).toString(),
    };
  }, [centerBig, zoomLevel]);

  // Gesture handlers
  const handlePinch = useCallback((scale: number, centerX: number, centerY: number) => {
    const newZoom = Math.max(0.05, Math.min(1.0, zoomLevel * scale));
    onZoomChange(newZoom);
  }, [zoomLevel, onZoomChange]);

  const handleSwipeUp = useCallback(() => {
    if (isFullscreen) {
      // Zoom out to 0.5x
      onZoomChange(0.5);
    } else {
      // Zoom out further
      onZoomChange(Math.max(0.05, zoomLevel * 0.7));
    }
  }, [isFullscreen, zoomLevel, onZoomChange]);

  const handleSwipeDown = useCallback(() => {
    if (isFullscreen) {
      // First swipe down: zoom out
      onZoomChange(0.5);
      setSwipeDownCount(1);
    } else if (swipeDownCount === 1) {
      // Second swipe down: exit mobile view
      setSwipeDownCount(0);
      onExit?.();
    } else {
      // Zoom in back to fullscreen
      onZoomChange(1.0);
      setSwipeDownCount(0);
    }
  }, [isFullscreen, swipeDownCount, onZoomChange, onNoteChange]);

  const handleDoubleTap = useCallback((x: number, y: number) => {
    const worldPos = screenToWorld(x, y);
    // Create note - App.tsx will handle setting it as focused
    onCreateNote(worldPos.x, worldPos.y);
  }, [screenToWorld, onCreateNote]);

  const handlePan = useCallback((dx: number, dy: number) => {
    if (!isFullscreen) {
      // Pan viewport when zoomed out
      const worldDx = Math.round(-dx / zoomLevel);
      const worldDy = Math.round(-dy / zoomLevel);
      const newX = (centerBig.x + BigInt(worldDx)).toString();
      const newY = (centerBig.y + BigInt(worldDy)).toString();
      onViewportChange(newX, newY);
    }
  }, [isFullscreen, zoomLevel, centerBig, onViewportChange]);

  // Handle note tap to show/hide controls
  const handleNoteTap = useCallback(() => {
    setIsControlsVisible(true);
    // Clear existing timeout
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    // Auto-hide after 4 seconds
    controlsTimeoutRef.current = setTimeout(() => {
      setIsControlsVisible(false);
    }, 4000);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // Hide controls when note changes
  useEffect(() => {
    setIsControlsVisible(false);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
  }, [focusedNoteId]);

  const gestures = useMobileGestures({
    onPinch: handlePinch,
    onSwipeUp: handleSwipeUp,
    onSwipeDown: handleSwipeDown,
    onDoubleTap: handleDoubleTap,
    onPan: handlePan,
  });

  // Update viewport center to focused note when it changes
  useEffect(() => {
    if (focusedNote && isFullscreen) {
      // Center viewport on focused note
      const noteCenterX = (BigInt(focusedNote.x) + BigInt(focusedNote.width || 200) / 2n).toString();
      const noteCenterY = (BigInt(focusedNote.y) + BigInt(focusedNote.height || 200) / 2n).toString();
      onViewportChange(noteCenterX, noteCenterY);
    }
  }, [focusedNoteId, isFullscreen, focusedNote, onViewportChange]);

  // Auto-focus first note when notes are created (if no focused note)
  useEffect(() => {
    if (notes.length > 0 && !focusedNoteId) {
      // Set first note as focused
      onNoteChange(notes[0].id);
      onZoomChange(1.0);
    }
  }, [notes, focusedNoteId, onNoteChange, onZoomChange]);

  // Reset swipe count when zoom changes
  useEffect(() => {
    if (zoomLevel >= 1.0) {
      setSwipeDownCount(0);
    }
  }, [zoomLevel]);

  // Calculate parallax offset for stars (with error handling)
  let parallaxX = 0;
  let parallaxY = 0;
  try {
    parallaxX = Number(centerBig.x % 10000n);
    parallaxY = Number(centerBig.y % 10000n);
  } catch (error) {
    console.error('Error calculating parallax:', error);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#0a0a0f]">
      {/* Starfield Background with error boundary */}
      <Starfield 
        mode="board" 
        parallaxOffsetX={parallaxX}
        parallaxOffsetY={parallaxY}
      />
      
      <div
        className="w-full h-full relative"
        onTouchStart={gestures.onTouchStart}
        onTouchMove={gestures.onTouchMove}
        onTouchEnd={gestures.onTouchEnd}
        style={{ touchAction: 'none' }}
      >
        {isFullscreen && focusedNote ? (
          // Fullscreen note view - centered note-first experience
          <div className="w-full h-full flex items-center justify-center p-6">
            <div 
              className="relative flex items-center justify-center"
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              <div className="relative" style={{ width: focusedNote.width || 200, height: focusedNote.height || 200 }}>
                <StickyNote
                  note={focusedNote}
                  screenX={0}
                  screenY={0}
                  scale={1}
                  selected={true}
                  tool={ToolType.HAND}
                  onUpdate={onNoteUpdate}
                  onDelete={onNoteDelete}
                  onResize={onNoteResize}
                  onMouseDown={() => {}}
                  distanceOpacity={1}
                  showControls={isControlsVisible}
                  onTap={handleNoteTap}
                />
              </div>
            </div>
            
            {/* Subtle hint for swipe - only show when controls are hidden */}
            {!isControlsVisible && (
              <div className="fixed bottom-20 left-1/2 -translate-x-1/2 text-white/30 text-xs text-center pointer-events-none">
                Swipe up to see more • Swipe down to exit
              </div>
            )}
          </div>
        ) : isFullscreen && !focusedNote && notes.length === 0 ? (
          // Empty state - no notes yet
          <div className="w-full h-full flex flex-col items-center justify-center p-6">
            <div className="text-center text-white/60 mb-8">
              <p className="text-xl mb-4">Welcome to Infinity Board</p>
              <p className="text-sm mb-6">Double tap anywhere to create your first note</p>
              <p className="text-xs text-white/40">Swipe up to see more • Swipe down to exit</p>
            </div>
          </div>
        ) : notes.length > 0 ? (
          // Zoomed out mini-canvas view
          <div className="w-full h-full relative">
            {/* Render notes */}
            {notes.map(note => {
              const screenPos = worldToScreen(note.x, note.y);
              const isFocused = note.id === focusedNoteId;
              
              // Culling: skip if too far off screen
              if (screenPos.x < -500 || screenPos.x > window.innerWidth + 500 ||
                  screenPos.y < -500 || screenPos.y > window.innerHeight + 500) {
                return null;
              }
              
              return (
                <div
                  key={note.id}
                  onClick={() => onNoteChange(note.id)}
                  className={`absolute cursor-pointer transition-all ${isFocused ? 'z-10 scale-110' : 'z-0'}`}
                  style={{
                    left: screenPos.x - (note.width || 200) / 2,
                    top: screenPos.y - (note.height || 200) / 2,
                    transform: `scale(${zoomLevel < 0.2 ? 0.5 : zoomLevel})`,
                  }}
                >
                  <StickyNote
                    note={note}
                    screenX={0}
                    screenY={0}
                    scale={1}
                    selected={isFocused}
                    tool={ToolType.HAND}
                    onUpdate={onNoteUpdate}
                    onDelete={onNoteDelete}
                    onResize={onNoteResize}
                    onMouseDown={() => {}}
                    distanceOpacity={zoomLevel < 0.2 ? 0.6 : 1}
                  />
                </div>
              );
            })}
            
            {/* Note bar at bottom - only show when zoomed out */}
            {zoomLevel < 1.0 && (
              <MobileNoteBar
                notes={notes}
                focusedNoteId={focusedNoteId}
                onNoteSelect={onNoteChange}
              />
            )}
          </div>
        ) : (
          // Empty state when zoomed out but no notes
          <div className="w-full h-full flex flex-col items-center justify-center p-6">
            <div className="text-center text-white/60 mb-8">
              <p className="text-xl mb-4">No notes yet</p>
              <p className="text-sm mb-6">Double tap to create your first note</p>
              <p className="text-xs text-white/40">Pinch to zoom • Swipe to navigate</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileNoteView;

