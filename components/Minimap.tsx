import React, { useState } from 'react';
import { Point } from '../types';
import { Locate, Navigation, Plus, Minus } from 'lucide-react';

interface MinimapProps {
  offset: Point;
  scale: number;
  onMoveTo: (x: number, y: number) => void;
  onZoom: (delta: number) => void;
}

const Minimap: React.FC<MinimapProps> = ({ offset, scale, onMoveTo, onZoom }) => {
  const [targetX, setTargetX] = useState<string>('0');
  const [targetY, setTargetY] = useState<string>('0');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleGo = () => {
    const x = parseInt(targetX, 10);
    const y = parseInt(targetY, 10);
    if (!isNaN(x) && !isNaN(y)) {
      // Move offset so that (x, y) is in the center
      // If we want world X to be at screen center:
      // screenCenter = (worldX + offsetX) * scale
      // offsetX = (screenCenter / scale) - worldX
      // But simple relative move logic in App handles this simpler if we just pass inverted coords
      // However, with the new rendering logic, onMoveTo sets the offset directly.
      // Let's assume onMoveTo expects the new Center World Coordinates.
      onMoveTo(-x, -y); 
    }
  };

  const currentX = Math.round(-offset.x);
  const currentY = Math.round(-offset.y);

  return (
    <div 
        className="fixed bottom-6 right-6 flex flex-col items-end gap-2 z-50"
        onMouseDown={(e) => e.stopPropagation()} // Prevent canvas interaction
    >
      
      {/* Zoom Controls */}
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col overflow-hidden mb-2">
         <button 
           onClick={() => onZoom(0.1)} 
           className="p-2 hover:bg-gray-100 border-b border-gray-100 flex items-center justify-center text-gray-700 active:bg-gray-200"
         >
            <Plus size={20} />
         </button>
         <button 
            onClick={() => onZoom(-0.1)}
            className="p-2 hover:bg-gray-100 flex items-center justify-center text-gray-700 active:bg-gray-200"
         >
            <Minus size={20} />
         </button>
      </div>

      {/* Navigator Panel */}
      <div className="bg-white p-4 rounded-lg shadow-xl border border-gray-200 w-64 transition-all duration-300">
        <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-700 text-sm flex items-center gap-2">
                <Navigation size={16} className="text-blue-500"/> 
                Navigator
            </h3>
            <button 
                onClick={() => onMoveTo(0, 0)}
                className="text-xs text-blue-500 hover:text-blue-700 hover:underline"
            >
                Reset to Origin
            </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono text-gray-500 mb-3 bg-gray-50 p-2 rounded">
            <div>X: {currentX}</div>
            <div>Y: {currentY}</div>
        </div>
        
        <div className="flex gap-2 items-center">
            <div className="flex flex-col gap-1 flex-1">
                <input 
                    type="number" 
                    value={targetX} 
                    onChange={e => setTargetX(e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                    placeholder="X"
                />
                 <input 
                    type="number" 
                    value={targetY} 
                    onChange={e => setTargetY(e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                    placeholder="Y"
                />
            </div>
            <button 
                onClick={handleGo}
                className="h-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 flex items-center justify-center shadow-sm active:translate-y-0.5 transition-all"
            >
                Go
            </button>
        </div>
      </div>
    </div>
  );
};

export default Minimap;