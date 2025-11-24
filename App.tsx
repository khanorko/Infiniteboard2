import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Note, Point, ToolType, NOTE_COLORS, NOTE_LIFESPAN_MS, Cluster, UserCursor, CLUSTER_PRESETS } from './types';
import StickyNote from './components/StickyNote';
import ClusterGroup from './components/ClusterGroup';
import Toolbar from './components/Toolbar';
import Minimap from './components/Minimap';
import { brainstormNotes, generateClusterTitle } from './services/geminiService';
import { Sparkles, Loader2, Info, MousePointer2, BoxSelect, Ungroup } from 'lucide-react';

// --- Multiplayer Helpers ---
const BROADCAST_CHANNEL_NAME = 'ephemeral-board-sync';
const MY_USER_ID = crypto.randomUUID();
const MY_USER_NAME = `Guest ${Math.floor(Math.random() * 1000)}`;
const MY_CURSOR_COLOR = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'][Math.floor(Math.random() * 5)];

const App: React.FC = () => {
  // --- State ---
  const [notes, setNotes] = useState<Note[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [activeTool, setActiveTool] = useState<ToolType>(ToolType.HAND);
  
  // Selection & Clustering
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [selectionBox, setSelectionBox] = useState<{ start: Point; end: Point } | null>(null);

  // Multiplayer
  const [remoteCursors, setRemoteCursors] = useState<Record<string, UserCursor>>({});
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  
  // UX State
  const [isSimulating, setIsSimulating] = useState(false); // Bot mode
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  
  // Interaction State
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Helpers ---
  const screenToWorld = useCallback((sx: number, sy: number) => {
    return {
      x: (sx / scale) - offset.x,
      y: (sy / scale) - offset.y,
    };
  }, [offset, scale]);

  const broadcast = (type: string, payload: any) => {
    broadcastChannelRef.current?.postMessage({ type, payload, senderId: MY_USER_ID });
  };

  const createNote = useCallback((x: number, y: number, content: string = '', aiGenerated: boolean = false) => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      x,
      y,
      text: content,
      color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
      createdAt: Date.now(),
      expiresAt: Date.now() + NOTE_LIFESPAN_MS,
      rotation: Math.random() * 6 - 3,
    };
    setNotes(prev => [...prev, newNote]);
    broadcast('NOTE_CREATE', newNote);

    // Auto-select manually created notes so user can type immediately
    if (!aiGenerated) {
        setSelectedNoteIds(new Set([newNote.id]));
    }
  }, []);

  // --- Effects ---

  // 1. URL Params Handling (Deep Link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const x = params.get('x');
    const y = params.get('y');
    if (x && y) {
      const targetX = parseInt(x);
      const targetY = parseInt(y);
      if (!isNaN(targetX) && !isNaN(targetY)) {
        // Center view on target coordinates
        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;
        // scale is 1 initially
        setOffset({
          x: -targetX + viewportW / 2,
          y: -targetY + viewportH / 2
        });
      }
    }
  }, []);

  // 2. Multiplayer Sync
  useEffect(() => {
    broadcastChannelRef.current = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    
    broadcastChannelRef.current.onmessage = (event) => {
      const { type, payload, senderId } = event.data;
      if (senderId === MY_USER_ID) return;

      switch (type) {
        case 'CURSOR':
          setRemoteCursors(prev => ({ ...prev, [senderId]: payload }));
          break;
        case 'NOTE_CREATE':
          setNotes(prev => [...prev, payload]);
          break;
        case 'NOTE_UPDATE':
          setNotes(prev => prev.map(n => n.id === payload.id ? { ...n, ...payload } : n));
          break;
        case 'NOTE_DELETE':
          setNotes(prev => prev.filter(n => n.id !== payload));
          break;
        case 'NOTE_MOVE_BATCH': 
          // Payload: { ids: string[], dx: number, dy: number }
          setNotes(prev => prev.map(n => 
             payload.ids.includes(n.id) ? { ...n, x: n.x + payload.dx, y: n.y + payload.dy } : n
          ));
          break;
        case 'CLUSTER_CREATE':
            setClusters(prev => [...prev, payload]);
            break;
        case 'CLUSTER_DELETE':
            setClusters(prev => prev.filter(c => c.id !== payload));
            break;
        case 'CLUSTER_UPDATE':
            setClusters(prev => prev.map(c => c.id === payload.id ? { ...c, ...payload.updates } : c));
            break;
      }
    };

    // Cleanup cursors
    const cursorInterval = setInterval(() => {
        const now = Date.now();
        setRemoteCursors(prev => {
            const next = { ...prev };
            let changed = false;
            Object.keys(next).forEach(key => {
                if (now - next[key].lastActive > 5000) {
                    delete next[key];
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
    }, 1000);

    return () => {
        broadcastChannelRef.current?.close();
        clearInterval(cursorInterval);
    };
  }, []);

  // 3. Cleanup expired notes
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const now = Date.now();
      setNotes(prev => {
        const remaining = [];
        let changed = false;
        for (const note of prev) {
          if (now > note.expiresAt) {
             if (!note.isFalling) {
                note.isFalling = true;
                remaining.push(note);
                changed = true;
             } else {
                 if (now > note.expiresAt + 1000) {
                     changed = true;
                     continue; 
                 } else {
                     remaining.push(note);
                 }
             }
          } else {
            remaining.push(note);
          }
        }
        return changed ? [...remaining] : prev;
      });
    }, 500);
    return () => clearInterval(checkInterval);
  }, []);

  // 4. Bot Simulation
  useEffect(() => {
    if (!isSimulating) return;
    const interval = setInterval(() => {
        const viewportW = window.innerWidth / scale;
        const viewportH = window.innerHeight / scale;
        const centerX = -offset.x + viewportW / 2;
        const centerY = -offset.y + viewportH / 2;
        const rX = centerX + (Math.random() * 800 - 400);
        const rY = centerY + (Math.random() * 600 - 300);
        const dummyTexts = ["Idea A", "Review", "Deploy", "Docs", "Refactor", "Test"];
        createNote(rX, rY, dummyTexts[Math.floor(Math.random() * dummyTexts.length)]);
    }, 2000);
    return () => clearInterval(interval);
  }, [isSimulating, createNote, offset, scale]);

  // --- Logic: Clustering ---

  const handleCreateCluster = async () => {
      if (selectedNoteIds.size < 2) return;
      
      setIsProcessingAI(true);
      const selectedNotes = notes.filter(n => selectedNoteIds.has(n.id));
      
      // Calculate Bounds
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      selectedNotes.forEach(n => {
          minX = Math.min(minX, n.x);
          minY = Math.min(minY, n.y);
          maxX = Math.max(maxX, n.x + 200); // 200 is note width
          maxY = Math.max(maxY, n.y + 200);
      });

      // Add padding
      const padding = 40;
      minX -= padding; minY -= padding * 2; maxX += padding; maxY += padding;

      // Get Title
      const noteTexts = selectedNotes.map(n => n.text).filter(t => t.length > 0);
      const title = await generateClusterTitle(noteTexts);

      const newCluster: Cluster = {
          id: crypto.randomUUID(),
          title: title,
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
          color: CLUSTER_PRESETS[0].class
      };

      setClusters(prev => [...prev, newCluster]);
      broadcast('CLUSTER_CREATE', newCluster);
      setIsProcessingAI(false);
      setSelectedNoteIds(new Set()); // Deselect after grouping
  };

  const handleUngroup = () => {
      const selectedArr = Array.from(selectedNoteIds);
      if (selectedArr.length === 0) return;

      const clustersToRemove = new Set<string>();
      
      const selectedNotes = notes.filter(n => selectedNoteIds.has(n.id));
      
      clusters.forEach(c => {
          const hasNote = selectedNotes.some(n => 
              n.x > c.x && n.x < c.x + c.width &&
              n.y > c.y && n.y < c.y + c.height
          );
          if (hasNote) clustersToRemove.add(c.id);
      });

      clustersToRemove.forEach(cid => {
          broadcast('CLUSTER_DELETE', cid);
      });
      setClusters(prev => prev.filter(c => !clustersToRemove.has(c.id)));
  };

  const handleClusterUpdate = (id: string, updates: Partial<Cluster>) => {
      setClusters(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
      broadcast('CLUSTER_UPDATE', { id, updates });
  };

  // --- Handlers ---

  const handleShare = (id: string) => {
      const note = notes.find(n => n.id === id);
      if (!note) return;
      
      const url = new URL(window.location.href);
      url.searchParams.set('x', Math.round(note.x).toString());
      url.searchParams.set('y', Math.round(note.y).toString());
      
      navigator.clipboard.writeText(url.toString()).then(() => {
          setToast("Link with coordinates copied to clipboard!");
          setTimeout(() => setToast(null), 3000);
      });
  };

  // Smart Zoom Handler
  const handleZoomBtn = (delta: number) => {
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    
    let targetWorldX, targetWorldY;
    
    // 1. Determine Target Center (Selection or Screen Center)
    if (selectedNoteIds.size > 0) {
        // Find center of selection
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        let found = false;
        notes.forEach(n => {
            if (selectedNoteIds.has(n.id)) {
                minX = Math.min(minX, n.x);
                maxX = Math.max(maxX, n.x + 200);
                minY = Math.min(minY, n.y);
                maxY = Math.max(maxY, n.y + 200);
                found = true;
            }
        });
        if (found) {
            targetWorldX = (minX + maxX) / 2;
            targetWorldY = (minY + maxY) / 2;
        } else {
             // Fallback to screen center
             targetWorldX = -offset.x + (viewportW/2)/scale;
             targetWorldY = -offset.y + (viewportH/2)/scale;
        }
    } else {
        // Screen center
        targetWorldX = -offset.x + (viewportW/2)/scale;
        targetWorldY = -offset.y + (viewportH/2)/scale;
    }
    
    // 2. Calculate New Scale
    const newScale = Math.min(Math.max(0.1, scale + delta), 5);
    
    // 3. Adjust Offset to keep Target at Screen Center
    // screenCenterX = (targetWorldX + newOffsetX) * newScale
    // newOffsetX = (screenCenterX / newScale) - targetWorldX
    const newOffsetX = ((viewportW / 2) / newScale) - targetWorldX;
    const newOffsetY = ((viewportH / 2) / newScale) - targetWorldY;
    
    setScale(newScale);
    setOffset({ x: newOffsetX, y: newOffsetY });
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
        const zoomSensitivity = 0.001;
        const delta = -e.deltaY * zoomSensitivity;
        // Basic mouse wheel zoom (not anchored to mouse yet for simplicity in this specific update)
        setScale(s => Math.min(Math.max(0.1, s + delta), 5));
    } else {
        setOffset(prev => ({
            x: prev.x - e.deltaX / scale,
            y: prev.y - e.deltaY / scale
        }));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTool === ToolType.HAND) {
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
    } else if (activeTool === ToolType.NOTE) {
        const worldPos = screenToWorld(e.clientX, e.clientY);
        createNote(worldPos.x - 100, worldPos.y - 100);
    } else if (activeTool === ToolType.SELECT) {
        if (e.target === e.currentTarget) {
            // Clicked on empty canvas -> Start selection box
            setIsDragging(true);
            const worldPos = screenToWorld(e.clientX, e.clientY);
            setDragStart(worldPos);
            setSelectionBox({ start: worldPos, end: worldPos });
            
            // Clear selection if not holding shift
            if (!e.shiftKey) {
                setSelectedNoteIds(new Set());
            }
        }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const worldPos = screenToWorld(e.clientX, e.clientY);
    
    // Broadcast Cursor
    // Throttle slightly
    if (Math.random() > 0.5) { 
        broadcast('CURSOR', {
            id: MY_USER_ID,
            name: MY_USER_NAME,
            x: worldPos.x,
            y: worldPos.y,
            color: MY_CURSOR_COLOR,
            lastActive: Date.now()
        });
    }

    if (isDragging) {
        if (activeTool === ToolType.HAND) {
             const dx = (e.clientX - dragStart.x) / scale;
             const dy = (e.clientY - dragStart.y) / scale;
             setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
             setDragStart({ x: e.clientX, y: e.clientY });
        } 
        else if (activeTool === ToolType.SELECT) {
             if (selectionBox) {
                 // Update Selection Box
                 setSelectionBox({ start: dragStart, end: worldPos });
             } 
        }
    }
  };
  
  // Re-implementing dragging specifically for notes to be smoother
  const lastMousePos = useRef<Point | null>(null);

  const onGlobalMouseMove = (e: MouseEvent) => {
      const currentWorld = screenToWorld(e.clientX, e.clientY);
      
      // Update Selection Box Visual
      if (isDragging && selectionBox) {
          setSelectionBox({ start: selectionBox.start, end: currentWorld });
      }

      // Move Selected Notes
      if (isDragging && !selectionBox && selectedNoteIds.size > 0 && lastMousePos.current) {
          const dx = currentWorld.x - lastMousePos.current.x;
          const dy = currentWorld.y - lastMousePos.current.y;
          
          if (dx !== 0 || dy !== 0) {
              setNotes(prev => prev.map(n => 
                 selectedNoteIds.has(n.id) ? { ...n, x: n.x + dx, y: n.y + dy } : n
              ));
              
              // Broadcast movement
              broadcast('NOTE_MOVE_BATCH', { ids: Array.from(selectedNoteIds), dx, dy });
          }
      }
      lastMousePos.current = currentWorld;
  };

  const handleMouseUp = () => {
    // Finalize Selection Box
    if (activeTool === ToolType.SELECT && selectionBox) {
        // Calculate Intersection
        const x1 = Math.min(selectionBox.start.x, selectionBox.end.x);
        const y1 = Math.min(selectionBox.start.y, selectionBox.end.y);
        const x2 = Math.max(selectionBox.start.x, selectionBox.end.x);
        const y2 = Math.max(selectionBox.start.y, selectionBox.end.y);

        const newSelection = new Set(selectedNoteIds);
        notes.forEach(n => {
            // Note center
            const cx = n.x + 100; // 200w
            const cy = n.y + 100; // 200h
            if (cx >= x1 && cx <= x2 && cy >= y1 && cy <= y2) {
                newSelection.add(n.id);
            }
        });
        setSelectedNoteIds(newSelection);
        setSelectionBox(null);
    }

    setIsDragging(false);
    lastMousePos.current = null;
  };

  useEffect(() => {
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('mousemove', onGlobalMouseMove);
      return () => {
          window.removeEventListener('mouseup', handleMouseUp);
          window.removeEventListener('mousemove', onGlobalMouseMove);
      }
  });

  const onNoteMouseDown = (e: React.MouseEvent, id: string) => {
      if (activeTool === ToolType.SELECT || activeTool === ToolType.NOTE) {
          e.stopPropagation();
          
          const isTextArea = (e.target as HTMLElement).tagName.toLowerCase() === 'textarea';
          
          if (!isTextArea) {
             setIsDragging(true);
             lastMousePos.current = screenToWorld(e.clientX, e.clientY);
          }

          if (e.shiftKey) {
              const newSet = new Set(selectedNoteIds);
              if (newSet.has(id)) newSet.delete(id);
              else newSet.add(id);
              setSelectedNoteIds(newSet);
          } else {
              if (!selectedNoteIds.has(id)) {
                  setSelectedNoteIds(new Set([id]));
              }
          }
      }
  };

  const handleNoteUpdate = (id: string, newText: string) => {
      setNotes(prev => {
          const next = prev.map(n => n.id === id ? { ...n, text: newText } : n);
          return next;
      });
      broadcast('NOTE_UPDATE', { id, text: newText });
  };

  const handleNoteDelete = (id: string) => {
      setNotes(prev => prev.filter(n => n.id !== id));
      broadcast('NOTE_DELETE', id);
  };

  const handleGeminiExpand = async (id: string, text: string) => {
      if (!text || text.length < 3) return;
      setIsProcessingAI(true);
      const parentNote = notes.find(n => n.id === id);
      if(!parentNote) return;

      const ideas = await brainstormNotes(text);
      ideas.forEach((idea, index) => {
         const angle = (index / ideas.length) * Math.PI * 2;
         const distance = 250;
         const nx = parentNote.x + Math.cos(angle) * distance;
         const ny = parentNote.y + Math.sin(angle) * distance;
         createNote(nx, ny, idea, true);
      });
      setIsProcessingAI(false);
  };

  return (
    <div 
        ref={containerRef}
        className={`w-screen h-screen overflow-hidden relative dot-grid ${activeTool === ToolType.HAND ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        // IMPORTANT: We do NOT use a transform on a container div anymore. 
        // Background grid position
        style={{
            backgroundPosition: `${offset.x * scale}px ${offset.y * scale}px`,
            backgroundSize: `${40 * scale}px ${40 * scale}px`
        }}
    >
       {/* All content is now absolute positioned relative to screen */}
       
         {/* Render Clusters */}
         {clusters.map(cluster => (
             <ClusterGroup 
                key={cluster.id}
                cluster={cluster}
                offset={offset}
                scale={scale}
                onUpdate={handleClusterUpdate}
             />
         ))}

         {/* Render Notes */}
         {notes.map(note => (
             <StickyNote 
                key={note.id} 
                note={note} 
                scale={scale} 
                offset={offset}
                tool={activeTool}
                selected={selectedNoteIds.has(note.id)}
                onUpdate={handleNoteUpdate}
                onDelete={handleNoteDelete}
                onMouseDown={onNoteMouseDown}
                onAIExpand={handleGeminiExpand}
                onShare={handleShare}
             />
         ))}

         {/* Render Selection Box */}
         {selectionBox && (
             <div 
                className="absolute border-2 border-blue-400 bg-blue-200/20 z-50 pointer-events-none"
                style={{
                    left: (Math.min(selectionBox.start.x, selectionBox.end.x) + offset.x) * scale,
                    top: (Math.min(selectionBox.start.y, selectionBox.end.y) + offset.y) * scale,
                    width: Math.abs(selectionBox.end.x - selectionBox.start.x) * scale,
                    height: Math.abs(selectionBox.end.y - selectionBox.start.y) * scale,
                }}
             />
         )}

         {/* Render Remote Cursors */}
         {Object.values(remoteCursors).map(cursor => (
             <div 
                key={cursor.id}
                className="absolute pointer-events-none z-[100] flex flex-col items-start transition-all duration-100 ease-linear"
                style={{
                    left: (cursor.x + offset.x) * scale,
                    top: (cursor.y + offset.y) * scale
                }}
             >
                 <MousePointer2 
                    size={20} 
                    fill={cursor.color} 
                    color="white" 
                    className="drop-shadow-md"
                    style={{ transform: `scale(${1/Math.max(0.5, scale)})` }} // Keep cursor size relatively consistent
                 />
                 <span 
                    className="ml-4 -mt-2 text-xs font-medium px-2 py-0.5 rounded text-white shadow-sm whitespace-nowrap"
                    style={{ backgroundColor: cursor.color, transform: `scale(${1/Math.max(0.5, scale)})`, transformOrigin: 'top left' }}
                 >
                     {cursor.name}
                 </span>
             </div>
         ))}


      {/* UI Overlay Layer */}
      <Toolbar 
        activeTool={activeTool} 
        onSelectTool={setActiveTool} 
        onReset={() => { setOffset({x:0, y:0}); setScale(1); }}
        toggleSimulation={() => setIsSimulating(!isSimulating)}
        isSimulating={isSimulating}
        noteCount={notes.length}
      />

      <Minimap 
        offset={offset} 
        scale={scale} 
        onMoveTo={(x, y) => {
            // x, y are destination World Coordinates.
            // Center the view on x,y
            const viewportW = window.innerWidth / scale;
            const viewportH = window.innerHeight / scale;
            setOffset({ x: -x + viewportW/2, y: -y + viewportH/2 });
        }}
        onZoom={handleZoomBtn}
      />

      {/* Floating Context Menu for Selection */}
      {selectedNoteIds.size > 0 && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white rounded-xl shadow-xl border border-gray-200 p-2 z-50 animate-in fade-in slide-in-from-bottom-4">
              <span className="text-xs font-semibold text-gray-500 px-2">{selectedNoteIds.size} Selected</span>
              <div className="h-4 w-px bg-gray-200 mx-1" />
              
              <button 
                onClick={handleCreateCluster}
                disabled={selectedNoteIds.size < 2 || isProcessingAI}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-blue-50 text-blue-600 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                  {isProcessingAI ? <Loader2 className="animate-spin" size={14}/> : <BoxSelect size={14} />}
                  Group & Label
              </button>
              
              <button 
                 onClick={handleUngroup}
                 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-50 text-red-600 font-medium text-sm transition-colors"
                 title="Ungroup overlapping clusters"
              >
                  <Ungroup size={14} />
                  Ungroup
              </button>
          </div>
      )}

      {/* Toast Notification */}
      {toast && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900/90 text-white px-4 py-2 rounded-full shadow-lg z-[100] text-sm animate-in fade-in slide-in-from-bottom-2">
              {toast}
          </div>
      )}

      {/* AI Loading Indicator */}
      {isProcessingAI && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-purple-200 flex items-center gap-2 z-50 text-purple-700 animate-pulse">
            <Loader2 className="animate-spin" size={16} />
            <span className="text-sm font-medium">Gemini is thinking...</span>
        </div>
      )}

      {/* Info Toast */}
      <div className="fixed top-6 right-6 max-w-xs bg-white/80 backdrop-blur border border-gray-200 p-4 rounded-lg shadow-sm text-sm text-gray-600 pointer-events-none select-none z-40">
        <div className="flex items-start gap-2">
            <Info className="shrink-0 mt-0.5 text-blue-400" size={16} />
            <div>
                <p className="font-semibold text-gray-800">Ephemeral Infinity Board</p>
                <p className="mt-1">Multiplayer is active. Open a second tab to see it.</p>
                <p className="mt-1 text-xs text-gray-500">Hold Shift to multi-select. Group notes to auto-label them with AI. Hover over clusters to edit title or color.</p>
            </div>
        </div>
      </div>
      
    </div>
  );
};

export default App;