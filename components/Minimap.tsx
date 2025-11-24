import React, { useState } from 'react';
import { Navigation, Plus, Minus, Infinity } from 'lucide-react';

interface MinimapProps {
  centerX: string;  // Viewport center as BigInt string
  centerY: string;
  scale: number;
  onMoveTo: (x: string, y: string) => void;
  onZoom: (delta: number) => void;
}

const Minimap: React.FC<MinimapProps> = ({ centerX, centerY, scale, onMoveTo, onZoom }) => {
  const [targetX, setTargetX] = useState<string>('0');
  const [targetY, setTargetY] = useState<string>('0');
  const [error, setError] = useState<string | null>(null);

  const handleGo = () => {
    setError(null);
    try {
      // Validate it's a valid BigInt string
      BigInt(targetX || '0');
      BigInt(targetY || '0');
      onMoveTo(targetX || '0', targetY || '0');
    } catch {
      setError('Enter valid integers');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleGo();
    }
  };

  // Filter input to only allow digits and minus sign
  const sanitizeInput = (value: string) => {
    // Allow empty, minus sign at start, and digits
    if (value === '' || value === '-') return value;
    // Remove any non-digit characters except leading minus
    const cleaned = value.replace(/[^0-9-]/g, '');
    // Ensure minus is only at the start
    if (cleaned.includes('-')) {
      const parts = cleaned.split('-');
      if (parts[0] === '') {
        // Minus at start is valid
        return '-' + parts.slice(1).join('');
      }
      return parts.join('');
    }
    return cleaned;
  };

  // Format large numbers for display (abbreviate if too long)
  const formatCoord = (coord: string) => {
    if (coord.length <= 16) return coord;
    const isNegative = coord.startsWith('-');
    const absCoord = isNegative ? coord.slice(1) : coord;
    return `${isNegative ? '-' : ''}${absCoord.slice(0, 6)}...${absCoord.slice(-6)}`;
  };

  return (
    <div 
        className="fixed bottom-6 right-6 flex flex-col items-end gap-2 z-50"
        onMouseDown={(e) => e.stopPropagation()}
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
      <div className="bg-white p-4 rounded-lg shadow-xl border border-gray-200 w-72 transition-all duration-300">
        <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-700 text-sm flex items-center gap-2">
                <Navigation size={16} className="text-blue-500"/> 
                Navigator
            </h3>
            <button 
                onClick={() => onMoveTo('0', '0')}
                className="text-xs text-blue-500 hover:text-blue-700 hover:underline"
            >
                Reset to Origin
            </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono text-gray-500 mb-3 bg-gray-50 p-2 rounded overflow-hidden">
            <div className="truncate" title={`X: ${centerX}`}>X: {formatCoord(centerX)}</div>
            <div className="truncate" title={`Y: ${centerY}`}>Y: {formatCoord(centerY)}</div>
        </div>
        
        <div className="flex gap-2 items-center">
            <div className="flex flex-col gap-1 flex-1">
                <input 
                    type="text"
                    value={targetX} 
                    onChange={e => {
                      setTargetX(sanitizeInput(e.target.value));
                      setError(null);
                    }}
                    onKeyDown={handleKeyDown}
                    className="w-full border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-400 outline-none font-mono"
                    placeholder="X coordinate"
                />
                <input 
                    type="text"
                    value={targetY} 
                    onChange={e => {
                      setTargetY(sanitizeInput(e.target.value));
                      setError(null);
                    }}
                    onKeyDown={handleKeyDown}
                    className="w-full border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-400 outline-none font-mono"
                    placeholder="Y coordinate"
                />
            </div>
            <button 
                onClick={handleGo}
                className="h-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 flex items-center justify-center shadow-sm active:translate-y-0.5 transition-all"
            >
                Go
            </button>
        </div>
        
        {error && (
          <p className="text-xs text-red-500 mt-1">{error}</p>
        )}
        
        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
          <Infinity size={12} className="text-blue-400" />
          Truly infinite coordinates!
        </p>
      </div>
    </div>
  );
};

export default Minimap;
