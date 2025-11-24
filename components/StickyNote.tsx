import React, { useRef, useEffect, useState } from 'react';
import { Note, ToolType, Point } from '../types';
import { Trash2, Sparkles, Link } from 'lucide-react';

interface StickyNoteProps {
  note: Note;
  scale: number;
  offset: Point;
  selected: boolean;
  tool: ToolType;
  onUpdate: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onAIExpand?: (id: string, text: string) => void;
  onShare?: (id: string) => void;
}

const StickyNote: React.FC<StickyNoteProps> = ({
  note,
  scale,
  offset,
  selected,
  tool,
  onUpdate,
  onDelete,
  onMouseDown,
  onAIExpand,
  onShare
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [timeLeft, setTimeLeft] = useState(60);

  // Handle countdown for visual feedback
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((note.expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
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

  const isEditable = selected;

  // Calculate screen position
  // (WorldPos + Offset) * Scale
  const screenX = (note.x + offset.x) * scale;
  const screenY = (note.y + offset.y) * scale;

  return (
    <div
      className={`absolute flex flex-col transition-transform ${note.isFalling ? 'animate-fall pointer-events-none' : ''}`}
      style={{
        transform: `translate(${screenX}px, ${screenY}px) rotate(${note.rotation}deg) scale(${scale})`,
        transformOrigin: 'top left',
        width: '200px',
        height: '200px',
        backgroundColor: 'transparent',
        zIndex: selected ? 50 : 10,
        opacity: note.isFalling ? 0 : 1,
        transition: note.isFalling ? 'none' : 'opacity 0.5s ease-out' // Disable transform transition for smooth dragging
      }}
      onMouseDown={handleMouseDown}
    >
      <div 
        className={`w-full h-full p-4 flex flex-col ${note.color} ${selected ? 'ring-4 ring-blue-500 shadow-2xl scale-[1.02]' : 'shadow-lg'}`}
        style={{
            transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        }}
      >
        <div className="flex justify-between items-start mb-2 opacity-50 text-[10px] font-mono select-none">
           <span>{timeLeft}s</span>
           {selected && (
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
      </div>
      
      {/* Falling animation adjusted for screen coordinates */}
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