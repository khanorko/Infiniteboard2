import React from 'react';
import { Note } from '../types';

interface MobileNoteBarProps {
  notes: Note[];
  focusedNoteId: string | null;
  onNoteSelect: (noteId: string) => void;
}

const MobileNoteBar: React.FC<MobileNoteBarProps> = ({ notes, focusedNoteId, onNoteSelect }) => {
  const getFirstLine = (text: string): string => {
    const firstLine = text.split('\n')[0];
    return firstLine.length > 30 ? firstLine.substring(0, 30) + '...' : firstLine;
  };

  if (notes.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-xl border-t border-white/10 px-4 py-3">
      <div className="flex gap-3 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {notes.map((note) => {
          const isActive = note.id === focusedNoteId;
          const firstLine = getFirstLine(note.text || 'Empty note');
          
          return (
            <button
              key={note.id}
              onClick={() => onNoteSelect(note.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg transition-all duration-200 ${
                isActive
                  ? `${note.color} text-gray-900 shadow-lg scale-105`
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              <p className={`text-sm font-medium whitespace-nowrap ${isActive ? 'font-semibold' : ''}`}>
                {firstLine || 'Empty note'}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MobileNoteBar;

