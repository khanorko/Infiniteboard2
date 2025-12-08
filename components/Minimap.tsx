import React, { useState } from 'react';
import { Navigation, Plus, Minus, Infinity, Star, Trash2, MapPin, ChevronDown } from 'lucide-react';
import { useSavedPlaces } from '../hooks/useSavedPlaces';

interface MinimapProps {
  centerX: string;  // Viewport center as BigInt string
  centerY: string;
  scale: number;
  onMoveTo: (x: string, y: string) => void;
  onZoom: (delta: number) => void;
}

const Minimap: React.FC<MinimapProps> = ({ centerX = '0', centerY = '0', scale, onMoveTo, onZoom }) => {
  const [targetX, setTargetX] = useState<string>('0');
  const [targetY, setTargetY] = useState<string>('0');
  const [error, setError] = useState<string | null>(null);
  const [showNavigator, setShowNavigator] = useState(false);

  // Defensive: ensure coordinates are defined
  const safeCenterX = centerX || '0';
  const safeCenterY = centerY || '0';

  // Saved places
  const { savedPlaces, addPlace, removePlace } = useSavedPlaces();
  const [isAddingPlace, setIsAddingPlace] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState('');
  const [showSavedPlaces, setShowSavedPlaces] = useState(true);

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

  const handleSavePlace = () => {
    if (isAddingPlace) {
      addPlace(newPlaceName || 'My Place', safeCenterX, safeCenterY);
      setNewPlaceName('');
      setIsAddingPlace(false);
    } else {
      setIsAddingPlace(true);
    }
  };

  const handleCancelAdd = () => {
    setNewPlaceName('');
    setIsAddingPlace(false);
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
  const formatCoord = (coord: string | undefined) => {
    if (!coord) return '0';
    if (coord.length <= 12) return coord;
    const isNegative = coord.startsWith('-');
    const absCoord = isNegative ? coord.slice(1) : coord;
    return `${isNegative ? '-' : ''}${absCoord.slice(0, 4)}...${absCoord.slice(-4)}`;
  };

  // Format coordinates for saved place display
  const formatPlaceCoords = (x: string, y: string) => {
    const formatNum = (n: string) => {
      const num = parseInt(n);
      if (Math.abs(num) >= 1000) {
        return `${(num / 1000).toFixed(1)}k`;
      }
      return n;
    };
    return `${formatNum(x)}, ${formatNum(y)}`;
  };

  return (
    <div
        className="fixed bottom-6 right-6 flex flex-col items-end gap-2 z-50"
        onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Zoom Controls - Compact stacked buttons */}
      <div className="bg-gray-900/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/10 flex flex-col overflow-hidden">
        <button
          onClick={() => onZoom(0.1)}
          className="min-w-[48px] min-h-[48px] p-3 hover:bg-white/10 border-b border-white/10 flex items-center justify-center text-white/80 active:bg-white/20 active:scale-95 transition-all"
        >
          <Plus size={24} />
        </button>
        <button
          onClick={() => onZoom(-0.1)}
          className="min-w-[48px] min-h-[48px] p-3 hover:bg-white/10 flex items-center justify-center text-white/80 active:bg-white/20 active:scale-95 transition-all"
        >
          <Minus size={24} />
        </button>
      </div>

      {/* Zoom level indicator */}
      <div className="bg-gray-900/70 backdrop-blur-sm rounded-lg px-2 py-1 text-center">
        <span className="text-white/50 text-xs font-mono">{Math.round(scale * 100)}%</span>
      </div>

      {/* Navigator Toggle Button */}
      <button
        onClick={() => setShowNavigator(!showNavigator)}
        className="min-w-[48px] min-h-[48px] bg-gray-900/90 backdrop-blur-xl rounded-full shadow-xl border border-white/10 p-3 text-white/80 hover:bg-white/10 active:bg-white/20 active:scale-95 transition-all flex items-center justify-center"
      >
        {showNavigator ? <ChevronDown size={22} /> : <Navigation size={22} />}
      </button>

      {/* Navigator Panel - Shows when toggle is clicked */}
      {showNavigator && (
        <div className="bg-gray-900/80 backdrop-blur-xl p-4 rounded-lg shadow-xl border border-white/10 w-72 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-white/80 text-sm flex items-center gap-2">
                  <Navigation size={16} className="text-blue-400"/>
                  Navigator
              </h3>
              <button
                  onClick={() => onMoveTo('0', '0')}
                  className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
              >
                  Reset to Origin
              </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono text-white/50 mb-3 bg-white/5 p-2 rounded overflow-hidden">
              <div className="truncate" title={`X: ${safeCenterX}`}>X: {formatCoord(safeCenterX)}</div>
              <div className="truncate" title={`Y: ${safeCenterY}`}>Y: {formatCoord(safeCenterY)}</div>
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
                      className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white/90 placeholder:text-white/30 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none font-mono"
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
                      className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white/90 placeholder:text-white/30 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none font-mono"
                      placeholder="Y coordinate"
                  />
              </div>
              <button
                  onClick={handleGo}
                  className="h-full bg-blue-500/80 text-white p-2 rounded hover:bg-blue-500 flex items-center justify-center shadow-sm active:translate-y-0.5 transition-all"
              >
                  Go
              </button>
          </div>

          {error && (
            <p className="text-xs text-red-400 mt-1">{error}</p>
          )}

          {/* Divider */}
          <div className="border-t border-white/10 my-3" />

          {/* Saved Places Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => setShowSavedPlaces(!showSavedPlaces)}
                className="font-semibold text-white/80 text-sm flex items-center gap-2 hover:text-white transition-colors"
              >
                <Star size={14} className="text-yellow-400" />
                Saved Places
                <span className="text-white/40 text-xs">({savedPlaces.length})</span>
              </button>
            </div>

            {showSavedPlaces && (
              <>
                {/* Add Place Form */}
                {isAddingPlace ? (
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newPlaceName}
                      onChange={(e) => setNewPlaceName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSavePlace();
                        if (e.key === 'Escape') handleCancelAdd();
                      }}
                      className="flex-1 bg-white/5 border border-yellow-500/30 rounded px-2 py-1 text-sm text-white/90 placeholder:text-white/30 focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 outline-none"
                      placeholder="Name this place..."
                      autoFocus
                    />
                    <button
                      onClick={handleSavePlace}
                      className="bg-yellow-500/80 text-black px-2 py-1 rounded text-xs font-medium hover:bg-yellow-400 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelAdd}
                      className="text-white/50 hover:text-white/80 px-1"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleSavePlace}
                    className="w-full flex items-center justify-center gap-2 py-1.5 mb-2 text-xs text-yellow-400/80 hover:text-yellow-400 hover:bg-yellow-500/10 rounded border border-dashed border-yellow-500/30 transition-colors"
                  >
                    <Plus size={12} />
                    Save current location
                  </button>
                )}

                {/* Saved Places List */}
                {savedPlaces.length > 0 ? (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {savedPlaces.map((place) => (
                      <div
                        key={place.id}
                        className="group flex items-center gap-2 p-1.5 rounded hover:bg-white/5 transition-colors"
                      >
                        <button
                          onClick={() => onMoveTo(place.x, place.y)}
                          className="flex-1 flex flex-col text-left overflow-hidden"
                        >
                          <div className="flex items-center gap-2">
                            <MapPin size={12} className="text-yellow-400/70 shrink-0" />
                            <span className="text-sm text-white/80 truncate">{place.name}</span>
                          </div>
                          <span className="text-xs text-white/30 font-mono ml-5">
                            {formatPlaceCoords(place.x, place.y)}
                          </span>
                        </button>
                        <button
                          onClick={() => removePlace(place.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-white/30 hover:text-red-400 transition-all"
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-white/30 text-center py-2">
                    No saved places yet
                  </p>
                )}
              </>
            )}
          </div>

          <p className="text-xs text-white/40 mt-3 flex items-center gap-1">
            <Infinity size={12} className="text-blue-400" />
            Truly infinite coordinates!
          </p>
        </div>
      )}
    </div>
  );
};

export default Minimap;
