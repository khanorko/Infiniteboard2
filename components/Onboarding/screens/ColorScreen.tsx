import React, { useState } from 'react';
import { NOTE_COLORS } from '../../../types';

interface ColorScreenProps {
  initialColor: string;
  onContinue: (color: string) => void;
}

// Map Tailwind bg classes to actual colors for the pulse effect
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

const ColorScreen: React.FC<ColorScreenProps> = ({ initialColor, onContinue }) => {
  const [selectedColor, setSelectedColor] = useState(initialColor);
  const [isPulsing, setIsPulsing] = useState(false);

  const handleContinue = () => {
    setIsPulsing(true);
    // Let the pulse animation play, then continue
    setTimeout(() => {
      onContinue(selectedColor);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center px-6">
      {/* Pulse effect */}
      {isPulsing && (
        <div 
          className="fixed inset-0 z-0 animate-pulse-expand"
          style={{ 
            background: `radial-gradient(circle at center, ${COLOR_HEX_MAP[selectedColor]}40 0%, transparent 70%)` 
          }}
        />
      )}

      <div className="animate-fade-in-up w-full max-w-md relative z-10">
        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl">
          <h2 className="text-2xl md:text-3xl font-light text-white/90 mb-2 tracking-wide">
            Pick your color
          </h2>
          
          <p className="text-white/40 text-sm mb-8">
            Your notes and cursor will use this color.
          </p>

          {/* Color Grid */}
          <div className="grid grid-cols-5 gap-4 mb-8">
            {NOTE_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`
                  aspect-square rounded-xl ${color} 
                  transition-all duration-300 
                  hover:scale-110 hover:shadow-lg
                  ${selectedColor === color 
                    ? 'ring-4 ring-white/50 scale-110 shadow-lg' 
                    : 'ring-2 ring-white/10'
                  }
                `}
                style={{
                  boxShadow: selectedColor === color 
                    ? `0 0 20px ${COLOR_HEX_MAP[color]}60` 
                    : undefined
                }}
              />
            ))}
          </div>

          <button
            onClick={handleContinue}
            disabled={isPulsing}
            className="w-full px-8 py-4 text-base font-light tracking-wider text-white/80 
                       bg-white/10 rounded-xl border border-white/10
                       hover:bg-white/15 hover:border-white/20 hover:text-white
                       transition-all duration-300 disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default ColorScreen;

