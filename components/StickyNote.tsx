import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Note, ToolType } from '../types';
import { Trash2, Sparkles, Link, GripHorizontal } from 'lucide-react';

interface StickyNoteProps {
  note: Note;
  screenX: number;  // Pre-calculated screen position
  screenY: number;
  scale: number;
  selected: boolean;
  tool: ToolType;
  onUpdate: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onResize?: (id: string, width: number, height: number) => void;
  onAIExpand?: (id: string, text: string) => void;
  onShare?: (id: string) => void;
  isFirstNote?: boolean;
  distanceOpacity?: number;
  showControls?: boolean; // For mobile: control visibility of timer and delete
  onTap?: () => void; // For mobile: handle tap to show controls
}

const StickyNote: React.FC<StickyNoteProps> = ({
  note,
  screenX,
  screenY,
  scale,
  selected,
  tool,
  onUpdate,
  onDelete,
  onMouseDown,
  onResize,
  onAIExpand,
  onShare,
  isFirstNote = false,
  distanceOpacity = 1,
  showControls = true, // Default to showing controls (desktop behavior)
  onTap,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [timeDisplay, setTimeDisplay] = useState('π×10⁴');
  
  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const [localWidth, setLocalWidth] = useState(note.width || 200);
  const [localHeight, setLocalHeight] = useState(note.height || 200);
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  
  // Sync local size with note props
  useEffect(() => {
    setLocalWidth(note.width || 200);
    setLocalHeight(note.height || 200);
  }, [note.width, note.height]);

  // Format time remaining into readable format
  const formatTime = (seconds: number): string => {
    if (seconds >= 3600) {
      // Hours + minutes for times over 1 hour
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    } else if (seconds >= 60) {
      // Minutes + seconds for times over 1 minute
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${minutes}m ${secs}s`;
    } else {
      // Just seconds
      return `${seconds}s`;
    }
  };

  // Handle countdown for visual feedback
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((note.expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      setTimeDisplay(formatTime(remaining));
    }, 1000);
    return () => clearInterval(interval);
  }, [note.expiresAt]);

  // Auto-focus when selected
  useEffect(() => {
    if (selected && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [selected]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMouseDown(e, note.id);
  };
  
  // Resize handlers - use ref to track current size during drag
  const currentSizeRef = useRef({ width: localWidth, height: localHeight });
  
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: localWidth,
      height: localHeight,
    };
    currentSizeRef.current = { width: localWidth, height: localHeight };
    
    const handleResizeMove = (moveEvent: MouseEvent) => {
      if (!resizeStartRef.current) return;
      
      const deltaX = (moveEvent.clientX - resizeStartRef.current.x) / scale;
      const deltaY = (moveEvent.clientY - resizeStartRef.current.y) / scale;
      
      const newWidth = Math.max(150, Math.min(400, resizeStartRef.current.width + deltaX));
      const newHeight = Math.max(150, Math.min(400, resizeStartRef.current.height + deltaY));
      
      // Update both state and ref
      setLocalWidth(newWidth);
      setLocalHeight(newHeight);
      currentSizeRef.current = { width: newWidth, height: newHeight };
    };
    
    const handleResizeEnd = () => {
      setIsResizing(false);
      if (onResize) {
        // Read from ref to get the latest values
        onResize(note.id, currentSizeRef.current.width, currentSizeRef.current.height);
      }
      resizeStartRef.current = null;
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
    };
    
    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeEnd);
  }, [scale, localWidth, localHeight, note.id, onResize]);

  const isEditable = selected && !note.isTutorial;

  // For mobile centered view, use relative positioning when screenX and screenY are 0
  const isCentered = screenX === 0 && screenY === 0;
  
  return (
    <div
      className={`${isCentered ? 'relative' : 'absolute'} flex flex-col transition-transform ${note.isFalling ? 'animate-fall pointer-events-none' : ''}`}
      style={{
        transform: isCentered 
          ? `rotate(${note.rotation}deg) scale(${scale})`
          : `translate(${screenX}px, ${screenY}px) rotate(${note.rotation}deg) scale(${scale})`,
        transformOrigin: 'top left',
        width: `${localWidth}px`,
        height: `${localHeight}px`,
        backgroundColor: 'transparent',
        zIndex: selected || isResizing ? 50 : 10,
        opacity: note.isFalling ? 0 : distanceOpacity,
        transition: note.isFalling ? 'none' : (isResizing ? 'none' : (
          note.isTutorial
            ? 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s ease-out'
            : 'opacity 0.5s ease-out'
        )),
        filter: distanceOpacity < 0.7 ? `blur(${(1 - distanceOpacity) * 2}px)` : 'none',
      }}
      onMouseDown={handleMouseDown}
    >
      <div 
        className={`w-full h-full p-4 flex flex-col ${note.color} ${selected ? 'ring-4 ring-blue-500 shadow-2xl scale-[1.02]' : 'shadow-lg'} ${isFirstNote ? 'animate-note-glow' : ''} relative`}
        style={{
          transition: isResizing ? 'none' : 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        }}
        onTouchStart={(e) => {
          // Handle tap on mobile to show controls
          if (onTap && !selected) {
            onTap();
          }
        }}
        onClick={(e) => {
          // Handle click on desktop/mobile to show controls
          if (onTap && !selected) {
            onTap();
          }
        }}
      >
        <div 
          className={`flex justify-between items-start mb-2 text-[10px] font-mono select-none transition-opacity duration-200 ${
            showControls ? 'opacity-50' : 'opacity-0'
          }`}
        >
          <span>{note.isTutorial ? '📚 Tutorial' : timeDisplay}</span>
          {selected && !note.isTutorial && (
            <div className="flex gap-1">
              {onShare && (
                <button
                  onClick={(e) => { e.stopPropagation(); onShare(note.id); }}
                  className="hover:text-blue-600 transition-colors p-1"
                  title="Copy Link"
                >
                  <Link size={14} />
                </button>
              )}
              {onAIExpand && (
                <button
                  onClick={(e) => { e.stopPropagation(); onAIExpand(note.id, note.text); }}
                  className="hover:text-purple-600 transition-colors p-1"
                  title="Gemini Brainstorm"
                >
                  <Sparkles size={14} />
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
                className="hover:text-red-600 transition-colors p-1"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
        
        <textarea
          ref={textareaRef}
          className={`w-full h-full bg-transparent resize-none border-none focus:ring-0 text-gray-800 font-hand text-xl leading-tight outline-none ${!isEditable ? 'cursor-grab active:cursor-grabbing' : 'cursor-text'}`}
          value={note.text}
          onChange={(e) => onUpdate(note.id, e.target.value)}
          placeholder="Write..."
          readOnly={!isEditable}
          spellCheck={false}
          style={{ pointerEvents: isEditable ? 'auto' : 'none' }} 
        />
        
        {/* Resize handle - only show when selected (not for tutorial notes) */}
        {selected && onResize && !note.isTutorial && (
          <div
            className="absolute bottom-1 right-1 w-5 h-5 cursor-se-resize flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity"
            onMouseDown={handleResizeStart}
            title="Drag to resize"
          >
            <GripHorizontal size={14} className="rotate-[-45deg] text-gray-600" />
          </div>
        )}
      </div>
      
      {/* Falling animation */}
      {note.isFalling && (
        <style>{`
          @keyframes fall {
            0% { transform: translate(${screenX}px, ${screenY}px) rotate(${note.rotation}deg) scale(${scale}); opacity: 1; }
            100% { transform: translate(${screenX}px, ${screenY + 800 * scale}px) rotate(${note.rotation + 45}deg) scale(${scale}); opacity: 0; }
          }
          .animate-fall {
            animation: fall 1s ease-in forwards;
          }
        `}</style>
      )}
    </div>
  );
};

export default React.memo(StickyNote);
