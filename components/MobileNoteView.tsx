import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Note, Cluster } from '../types';
import StickyNote from './StickyNote';
import Starfield from './Onboarding/Starfield';
import { useMobileGestures } from '../hooks/useMobileGestures';
import { parseBigPoint, getRelativeOffset, BigPoint, formatSectorCoord } from '../utils/bigCoords';
import { ToolType } from '../types';
import { Plus, Minus, Navigation, ChevronDown, Star, MapPin, Trash2, Infinity, GraduationCap, Shuffle } from 'lucide-react';
import { useSavedPlaces } from '../hooks/useSavedPlaces';

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
  onShowTutorial?: () => void;
  onRandomLocation?: () => void;
  onReset?: () => void;
  onShare?: (id: string) => void;
  onAIExpand?: (id: string, text: string) => void;
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
  onShowTutorial,
  onRandomLocation,
  onReset,
  onShare,
  onAIExpand,
}) => {
  const [showNavigator, setShowNavigator] = useState(false);
  const [targetX, setTargetX] = useState<string>('0');
  const [targetY, setTargetY] = useState<string>('0');
  const [error, setError] = useState<string | null>(null);
  const [isAddingPlace, setIsAddingPlace] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState('');
  const [showSavedPlaces, setShowSavedPlaces] = useState(true);
  const focusedNote = notes.find(n => n.id === focusedNoteId);
  const { savedPlaces, addPlace, removePlace } = useSavedPlaces();
  
  // Calculate dynamic note size based on viewport (85% of smallest dimension with 24px padding)
  const calculateNoteSize = useCallback(() => {
    const padding = 24;
    const minDimension = Math.min(window.innerWidth, window.innerHeight);
    const maxSize = Math.floor((minDimension - padding * 2) * 0.85);
    return Math.max(200, Math.min(400, maxSize)); // Clamp between 200 and 400
  }, []);
  
  const [noteSize, setNoteSize] = useState(calculateNoteSize());
  
  // Update note size on resize
  useEffect(() => {
    const handleResize = () => {
      setNoteSize(calculateNoteSize());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateNoteSize]);
  
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
  
  const isFullscreen = zoomLevel >= 0.95; // Use 0.95 for smoother transitions

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
    // Allow zoom range from 5% to 300%
    const newZoom = Math.max(0.05, Math.min(3.0, zoomLevel * scale));
    onZoomChange(newZoom);
  }, [zoomLevel, onZoomChange]);
  
  // Zoom button handlers - prevent note selection when zooming
  const handleZoomIn = useCallback((e?: React.SyntheticEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const newZoom = Math.min(3.0, zoomLevel + 0.1);
    onZoomChange(newZoom);
  }, [zoomLevel, onZoomChange]);
  
  const handleZoomOut = useCallback((e?: React.SyntheticEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const newZoom = Math.max(0.05, zoomLevel - 0.1);
    onZoomChange(newZoom);
  }, [zoomLevel, onZoomChange]);
  
  // Navigator handlers
  const sanitizeInput = (value: string) => {
    if (value === '' || value === '-') return value;
    const cleaned = value.replace(/[^0-9-]/g, '');
    if (cleaned.includes('-')) {
      const parts = cleaned.split('-');
      if (parts[0] === '') {
        return '-' + parts.slice(1).join('');
      }
      return parts.join('');
    }
    return cleaned;
  };
  
  const formatCoord = (coord: string) => {
    if (coord.length <= 12) return coord;
    const isNegative = coord.startsWith('-');
    const absCoord = isNegative ? coord.slice(1) : coord;
    return `${isNegative ? '-' : ''}${absCoord.slice(0, 4)}...${absCoord.slice(-4)}`;
  };
  
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
  
  const handleGo = () => {
    setError(null);
    try {
      BigInt(targetX || '0');
      BigInt(targetY || '0');
      onViewportChange(targetX || '0', targetY || '0');
      setShowNavigator(false);
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
      addPlace(newPlaceName || 'My Place', viewportCenter.x, viewportCenter.y);
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


  const gestures = useMobileGestures({
    onPinch: handlePinch,
    onDoubleTap: handleDoubleTap,
    onPan: handlePan,
  });

  // Update viewport center to focused note when it changes
  useEffect(() => {
    if (focusedNote && isFullscreen) {
      // Center viewport on focused note using dynamic note size
      const noteCenterX = (BigInt(focusedNote.x) + BigInt(noteSize) / 2n).toString();
      const noteCenterY = (BigInt(focusedNote.y) + BigInt(noteSize) / 2n).toString();
      onViewportChange(noteCenterX, noteCenterY);
    }
  }, [focusedNoteId, isFullscreen, focusedNote, onViewportChange, noteSize]);

  // Auto-focus first note when notes are created (if no focused note)
  useEffect(() => {
    if (notes.length > 0 && !focusedNoteId) {
      // Set first note as focused
      onNoteChange(notes[0].id);
      onZoomChange(1.0);
    }
  }, [notes, focusedNoteId, onNoteChange, onZoomChange]);


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
          <div className="w-full h-full flex items-center justify-center" style={{ padding: '24px' }}>
            <div 
              className="relative flex items-center justify-center"
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              <div className="relative" style={{ width: noteSize, height: noteSize }}>
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
                  showControls={true}
                  onShare={onShare}
                  onAIExpand={onAIExpand}
                />
              </div>
            </div>
            
          </div>
        ) : isFullscreen && !focusedNote && notes.length === 0 ? (
          // Empty state - no notes yet
          <div className="w-full h-full flex flex-col items-center justify-center p-6">
            <div className="text-center text-white/60 mb-8">
              <p className="text-xl mb-4">Welcome to Infinity Board</p>
              <p className="text-sm mb-6">Double tap anywhere to create your first note</p>
              <p className="text-xs text-white/40">Pinch to zoom • Use toolbar to navigate</p>
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
                    left: screenPos.x - (note.width || noteSize) / 2,
                    top: screenPos.y - (note.height || noteSize) / 2,
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
          </div>
        ) : (
          // Empty state when zoomed out but no notes
          <div className="w-full h-full flex flex-col items-center justify-center p-6">
            <div className="text-center text-white/60 mb-8">
              <p className="text-xl mb-4">No notes yet</p>
              <p className="text-sm mb-6">Double tap to create your first note</p>
              <p className="text-xs text-white/40">Pinch to zoom • Use toolbar to navigate</p>
            </div>
          </div>
        )}
        
        {/* Toolbar - Compact mobile version at top */}
        {onShowTutorial && onRandomLocation && onReset && (
          <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 w-full max-w-[95vw] px-2">
            <div className="bg-gray-900/90 backdrop-blur-xl rounded-lg shadow-lg border border-white/10 px-2 py-2 flex items-center justify-center gap-2 overflow-x-auto">
              <button
                onClick={onShowTutorial}
                className="flex items-center gap-1.5 p-3 rounded-lg text-xs font-medium transition-colors bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white active:bg-white/20 whitespace-nowrap"
                title="Show Tutorial Notes"
              >
                <GraduationCap size={14} />
                <span className="hidden sm:inline">Tutorial</span>
              </button>
              
              <button
                onClick={onRandomLocation}
                className="flex items-center gap-1.5 p-3 rounded-lg text-xs font-medium transition-colors bg-white/5 text-white/70 border border-white/10 hover:bg-purple-500/20 hover:text-purple-300 active:bg-purple-500/30 whitespace-nowrap"
                title="Teleport to a random private location"
              >
                <Shuffle size={14} />
                <span className="hidden sm:inline">Random</span>
              </button>
              
              <button
                onClick={onReset}
                className="flex items-center gap-1.5 p-3 rounded-lg text-xs font-medium transition-colors bg-white/5 text-white/70 border border-white/10 hover:bg-blue-500/20 hover:text-blue-300 active:bg-blue-500/30 whitespace-nowrap"
                title="Reset to Origin"
              >
                <Navigation size={14} />
                <span className="hidden sm:inline">Reset</span>
              </button>
              
              <div className="text-xs text-white/40 font-mono ml-1 px-2">
                {notes.length}
              </div>
            </div>
          </div>
        )}
        
        {/* Zoom Buttons - Bottom right */}
        <div 
          className="fixed bottom-20 right-4 z-40 flex flex-col gap-2" 
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="bg-gray-900/80 backdrop-blur-xl rounded-lg shadow-xl border border-white/10 flex flex-col overflow-hidden">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleZoomIn(e);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onTouchMove={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleZoomIn(e);
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              className="p-3 hover:bg-white/10 border-b border-white/10 flex items-center justify-center text-white/80 active:bg-white/20 pointer-events-auto touch-none"
              style={{ touchAction: 'manipulation' }}
            >
              <Plus size={20} />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleZoomOut(e);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onTouchMove={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleZoomOut(e);
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              className="p-3 hover:bg-white/10 flex items-center justify-center text-white/80 active:bg-white/20 pointer-events-auto touch-none"
              style={{ touchAction: 'manipulation' }}
            >
              <Minus size={20} />
            </button>
          </div>
        </div>
        
        {/* Navigator Panel Toggle Button */}
        <button
          onClick={() => setShowNavigator(!showNavigator)}
          className="fixed bottom-4 right-4 z-[60] bg-gray-900/80 backdrop-blur-xl rounded-lg shadow-xl border border-white/10 p-3 text-white/80 hover:bg-white/10 active:bg-white/20 transition-all"
        >
          {showNavigator ? <ChevronDown size={20} /> : <Navigation size={20} />}
        </button>
        
        {/* Navigator Panel - Slides up from bottom */}
        {showNavigator && (
          <div className="fixed bottom-0 left-0 right-0 z-[60] bg-gray-900/95 backdrop-blur-xl border-t border-white/10 rounded-t-2xl shadow-2xl max-h-[60vh] overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white/80 text-sm flex items-center gap-2">
                  <Navigation size={16} className="text-blue-400"/> 
                  Navigator
                </h3>
                <button
                  onClick={() => setShowNavigator(false)}
                  className="text-white/60 hover:text-white/80"
                >
                  <ChevronDown size={20} />
                </button>
              </div>
              
              {/* Current Coordinates */}
              <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="text-xs text-white/50 mb-2">Current Position</div>
                <div className="text-sm font-mono text-white/80">
                  <div>X: {formatSectorCoord(viewportCenter.x)}</div>
                  <div>Y: {formatSectorCoord(viewportCenter.y)}</div>
                </div>
              </div>
              
              {/* Go To Coordinates */}
              <div className="mb-4">
                <div className="text-xs text-white/50 mb-2">Go To Coordinates</div>
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
                      className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white/90 placeholder:text-white/30 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none font-mono"
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
                      className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white/90 placeholder:text-white/30 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none font-mono"
                      placeholder="Y coordinate"
                    />
                  </div>
                  <button 
                    onClick={handleGo}
                    className="h-full bg-blue-500/80 text-white px-4 py-2 rounded hover:bg-blue-500 flex items-center justify-center shadow-sm active:translate-y-0.5 transition-all"
                  >
                    Go
                  </button>
                </div>
                {error && (
                  <p className="text-xs text-red-400 mt-1">{error}</p>
                )}
              </div>
              
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
                          className="flex-1 bg-white/5 border border-yellow-500/30 rounded px-2 py-1.5 text-sm text-white/90 placeholder:text-white/30 focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 outline-none"
                          placeholder="Name this place..."
                          autoFocus
                        />
                        <button
                          onClick={handleSavePlace}
                          className="bg-yellow-500/80 text-black px-3 py-1.5 rounded text-xs font-medium hover:bg-yellow-400 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelAdd}
                          className="text-white/50 hover:text-white/80 px-2"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleSavePlace}
                        className="w-full flex items-center justify-center gap-2 py-2 mb-2 text-xs text-yellow-400/80 hover:text-yellow-400 hover:bg-yellow-500/10 rounded border border-dashed border-yellow-500/30 transition-colors"
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
                            className="group flex items-center gap-2 p-2 rounded hover:bg-white/5 transition-colors"
                          >
                            <button
                              onClick={() => {
                                onViewportChange(place.x, place.y);
                                setShowNavigator(false);
                              }}
                              className="flex-1 flex items-center gap-2 text-left"
                            >
                              <MapPin size={12} className="text-yellow-400/70 shrink-0" />
                              <span className="text-sm text-white/80 truncate">{place.name}</span>
                              <span className="text-xs text-white/30 font-mono shrink-0">
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
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileNoteView;

