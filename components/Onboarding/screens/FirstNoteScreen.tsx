import React, { useState, useEffect, useRef } from 'react';

interface FirstNoteScreenProps {
  userColor: string;
  onCreateNote: (text: string) => void;
}

// Map Tailwind bg classes to actual colors
const COLOR_HEX_MAP: Record<string, string> = {
  'bg-note-yellow': '#fef08a',
  'bg-note-blue': '#93c5fd',
  'bg-note-green': '#86efac',
  'bg-note-pink': '#f9a8d4',
  'bg-note-orange': '#fdba74',
  'bg-note-purple': '#c4b5fd',
  'bg-note-red': '#fca5a5',
  'bg-note-teal': '#5eead4',
  'bg-note-lime': '#bef264',
  'bg-note-gray': '#d1d5db',
};

const FirstNoteScreen: React.FC<FirstNoteScreenProps> = ({ userColor, onCreateNote }) => {
  const [noteText, setNoteText] = useState('');
  const [isLaunching, setIsLaunching] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const handleCreate = () => {
    if (!noteText.trim()) return;
    setIsLaunching(true);
    // Let the launch animation play
    setTimeout(() => {
      onCreateNote(noteText.trim());
    }, 800);
  };

  const bgColor = COLOR_HEX_MAP[userColor] || '#fef08a';

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center px-6">
      <div className="animate-fade-in-up w-full max-w-2xl relative">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Left: Input Card */}
          <div className="flex-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
            <h2 className="text-2xl md:text-3xl font-light text-white/90 mb-2 tracking-wide">
              What are you working on today?
            </h2>
            
            <p className="text-white/40 text-sm mb-4">
              Write a short note to start your journey.
            </p>

            <p className="text-white/30 text-xs mb-6 italic font-light animate-fade-in">
              Ideas appear, drift, and fade. That's the beauty.
            </p>

            <textarea
              ref={inputRef}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Write a short note..."
              rows={3}
              maxLength={200}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4
                         text-white/90 placeholder:text-white/30 text-base
                         focus:outline-none focus:border-white/30 focus:bg-white/10
                         transition-all duration-300 resize-none"
            />

            <button
              onClick={handleCreate}
              disabled={!noteText.trim() || isLaunching}
              className="w-full mt-6 px-8 py-4 text-base font-light tracking-wider text-white/80 
                         bg-white/10 rounded-xl border border-white/10
                         hover:bg-white/15 hover:border-white/20 hover:text-white
                         transition-all duration-300
                         disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isLaunching ? 'Launching...' : 'Create my first note'}
            </button>
          </div>

          {/* Right: Live Preview */}
          <div className="flex-shrink-0 w-48 md:w-56">
            <div 
              className={`
                w-full aspect-square rounded-lg shadow-xl p-4
                transform transition-all duration-700 ease-out
                ${noteText ? 'opacity-100 translate-y-0 rotate-2' : 'opacity-30 translate-y-4 rotate-0'}
                ${isLaunching ? 'scale-50 -translate-y-32 opacity-0' : ''}
              `}
              style={{ 
                backgroundColor: bgColor,
                boxShadow: `0 10px 40px ${bgColor}40`
              }}
            >
              <p className="text-gray-800 text-sm font-medium leading-relaxed break-words">
                {noteText || 'Your note preview...'}
              </p>
            </div>
            
            {noteText && !isLaunching && (
              <p className="text-center text-white/30 text-xs mt-4 animate-pulse">
                ↑ Your first note
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FirstNoteScreen;





