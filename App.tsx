import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Note, Point, ToolType, NOTE_COLORS, NOTE_LIFESPAN_MS, Cluster, UserCursor, CLUSTER_PRESETS } from './types';
import StickyNote from './components/StickyNote';
import ClusterGroup from './components/ClusterGroup';
import Toolbar from './components/Toolbar';
import Minimap from './components/Minimap';
import Onboarding from './components/Onboarding/Onboarding';
import Starfield from './components/Onboarding/Starfield';
import TutorialPopovers from './components/TutorialPopovers';
import { brainstormNotes, generateClusterTitle } from './services/geminiService';
import { useAIUsage } from './hooks/useAIUsage';
import { useUserPreferences } from './hooks/useUserPreferences';
import { Loader2, Info, MousePointer2, BoxSelect, Ungroup, Wifi, WifiOff, Sparkles, Trash2 } from 'lucide-react';
import { parseBigPoint, getRelativeOffset, addDeltaToBigPoint, BigPoint } from './utils/bigCoords';
import {
  isSupabaseConfigured,
  fetchNotes,
  fetchClusters,
  createNoteInDb,
  updateNoteInDb,
  deleteNoteFromDb,
  moveNotesInDb,
  createClusterInDb,
  updateClusterInDb,
  deleteClusterFromDb,
  subscribeToBoard,
  unsubscribeFromBoard,
} from './services/supabaseService';
import type { RealtimeChannel } from '@supabase/supabase-js';

// --- Multiplayer Helpers ---
const BROADCAST_CHANNEL_NAME = 'ephemeral-board-sync';
const MY_USER_ID = crypto.randomUUID();
const USE_SUPABASE = isSupabaseConfigured();

// Color map for cursor colors
const COLOR_TO_HEX: Record<string, string> = {
  'bg-note-yellow': '#fff740',
  'bg-note-blue': '#a5ecfa',
  'bg-note-green': '#ccff90',
  'bg-note-pink': '#fdcfe8',
  'bg-note-orange': '#ffc107',
  'bg-note-purple': '#d8b4fe',
  'bg-note-red': '#fca5a5',
  'bg-note-teal': '#5eead4',
  'bg-note-lime': '#bef264',
  'bg-note-gray': '#d1d5db',
};

const App: React.FC = () => {
  // User Preferences (from onboarding)
  const {
    userName,
    userColor,
    skipOnboarding,
    shouldShowOnboarding,
    isLoaded: prefsLoaded,
    setUserName,
    setUserColor,
    setSkipOnboarding,
    completeOnboarding,
  } = useUserPreferences();
  
  const [showTutorialPopovers, setShowTutorialPopovers] = useState(false);
  
  // Board entry animation states
  const [isEnteringBoard, setIsEnteringBoard] = useState(false);
  const [showWelcomeText, setShowWelcomeText] = useState(false);
  const [firstNoteId, setFirstNoteId] = useState<string | null>(null);
  
  // --- State ---
  const [notes, setNotes] = useState<Note[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  
  // Viewport center in BigInt (stored as strings for state)
  const [viewportCenter, setViewportCenter] = useState<{ x: string; y: string }>({ x: '0', y: '0' });
  const [scale, setScale] = useState(1);
  const [activeTool, setActiveTool] = useState<ToolType>(ToolType.HAND);
  
  // Selection & Clustering (screen-space for selection box)
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [selectionBox, setSelectionBox] = useState<{ start: Point; end: Point } | null>(null);

  // Multiplayer
  const [remoteCursors, setRemoteCursors] = useState<Record<string, UserCursor>>({});
  const [isOnline, setIsOnline] = useState(USE_SUPABASE);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'offline'>('connecting');
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const supabaseChannelRef = useRef<RealtimeChannel | null>(null);
  
  // UX State
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  
  // AI Usage Limits
  const { remainingCredits, checkLimit, incrementUsage, isLimitReached } = useAIUsage();
  
  // Interaction State
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const movedNotesDelta = useRef<{ ids: string[], dx: bigint, dy: bigint } | null>(null);
  const updateTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const activelyEditingNotes = useRef<Set<string>>(new Set());
  
  // Starfield motion burst for zoom/teleport feedback
  const starfieldBurstRef = useRef<((intensity: number, duration?: number) => void) | null>(null);

  // --- BigInt Helpers ---
  const centerBig = parseBigPoint(viewportCenter.x, viewportCenter.y);

  // Convert screen position to world coordinates (returns BigInt strings)
  const screenToWorld = useCallback((screenX: number, screenY: number): { x: string; y: string } => {
    const screenCenterX = window.innerWidth / 2;
    const screenCenterY = window.innerHeight / 2;
    const relativeX = Math.round((screenX - screenCenterX) / scale);
    const relativeY = Math.round((screenY - screenCenterY) / scale);
    return {
      x: (centerBig.x + BigInt(relativeX)).toString(),
      y: (centerBig.y + BigInt(relativeY)).toString(),
    };
  }, [centerBig, scale]);

  // Convert world position to screen position
  const worldToScreen = useCallback((worldX: string, worldY: string): Point => {
    const worldBig = parseBigPoint(worldX, worldY);
    const relative = getRelativeOffset(worldBig, centerBig);
    const screenCenterX = window.innerWidth / 2;
    const screenCenterY = window.innerHeight / 2;
    return {
      x: screenCenterX + relative.x * scale,
      y: screenCenterY + relative.y * scale,
    };
  }, [centerBig, scale]);

  const broadcast = (type: string, payload: any) => {
    broadcastChannelRef.current?.postMessage({ type, payload, senderId: MY_USER_ID });
  };

  const createNote = useCallback((worldX: string, worldY: string, content: string = '', aiGenerated: boolean = false, customColor?: string) => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      x: worldX,
      y: worldY,
      text: content,
      color: customColor || userColor || NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
      createdAt: Date.now(),
      expiresAt: Date.now() + NOTE_LIFESPAN_MS,
      rotation: Math.random() * 6 - 3,
      width: 200,
      height: 200,
    };
    setNotes(prev => [...prev, newNote]);
    broadcast('NOTE_CREATE', newNote);
    
    // Save to Supabase if configured
    if (USE_SUPABASE) {
      createNoteInDb(newNote);
    }

    if (!aiGenerated) {
      setSelectedNoteIds(new Set([newNote.id]));
    }
  }, [userColor]);

  // --- Effects ---

  // 0. Load data from Supabase (if configured) or localStorage
  useEffect(() => {
    const loadData = async () => {
      if (USE_SUPABASE) {
        setConnectionStatus('connecting');
        try {
          const [dbNotes, dbClusters] = await Promise.all([
            fetchNotes(),
            fetchClusters(),
          ]);
          setNotes(dbNotes);
          setClusters(dbClusters);
          setConnectionStatus('connected');
          setIsOnline(true);
        } catch (error) {
          console.error('Failed to load from Supabase:', error);
          setConnectionStatus('offline');
          setIsOnline(false);
          // Fall back to localStorage
          loadFromLocalStorage();
        }
      } else {
        setConnectionStatus('offline');
        loadFromLocalStorage();
      }
    };

    const loadFromLocalStorage = () => {
      try {
        const savedNotes = localStorage.getItem('infinity-board-notes');
        const savedClusters = localStorage.getItem('infinity-board-clusters');
        
        if (savedNotes) {
          const parsedNotes: Note[] = JSON.parse(savedNotes);
          const now = Date.now();
          const validNotes = parsedNotes.filter(note => now < note.expiresAt);
          if (validNotes.length > 0) {
            setNotes(validNotes);
          }
        }
        
        if (savedClusters) {
          const parsedClusters: Cluster[] = JSON.parse(savedClusters);
          setClusters(parsedClusters);
        }
      } catch (error) {
        console.error('Failed to load from localStorage:', error);
      }
    };

    loadData();
  }, []);

  // 1. Persist notes to localStorage (as backup)
  useEffect(() => {
    if (!USE_SUPABASE) {
      try {
        localStorage.setItem('infinity-board-notes', JSON.stringify(notes));
      } catch (error) {
        console.error('Failed to save notes:', error);
      }
    }
  }, [notes]);

  // 2. Persist clusters to localStorage (as backup)
  useEffect(() => {
    if (!USE_SUPABASE) {
      try {
        localStorage.setItem('infinity-board-clusters', JSON.stringify(clusters));
      } catch (error) {
        console.error('Failed to save clusters:', error);
      }
    }
  }, [clusters]);

  // 3. URL Params Handling (Deep Link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const x = params.get('x');
    const y = params.get('y');
    if (x && y) {
      try {
        // Validate as BigInt
        BigInt(x);
        BigInt(y);
        setViewportCenter({ x, y });
        
        // Trigger arrival burst after starfield mounts
        setTimeout(() => {
          starfieldBurstRef.current?.(3, 400);
        }, 100);
      } catch {
        // Invalid coordinates, ignore
      }
    }
  }, []);

  // 4. Multiplayer Sync (Supabase Realtime or BroadcastChannel fallback)
  useEffect(() => {
    // Set up Supabase realtime if configured
    if (USE_SUPABASE) {
      supabaseChannelRef.current = subscribeToBoard({
        onNoteInsert: (note) => {
          setNotes(prev => {
            // Avoid duplicates
            if (prev.some(n => n.id === note.id)) return prev;
            return [...prev, note];
          });
        },
        onNoteUpdate: (note) => {
          // Don't apply remote updates to notes the user is actively editing
          if (activelyEditingNotes.current.has(note.id)) {
            return;
          }
          setNotes(prev => prev.map(n => n.id === note.id ? note : n));
        },
        onNoteDelete: (id) => {
          setNotes(prev => prev.filter(n => n.id !== id));
        },
        onClusterInsert: (cluster) => {
          setClusters(prev => {
            if (prev.some(c => c.id === cluster.id)) return prev;
            return [...prev, cluster];
          });
        },
        onClusterUpdate: (cluster) => {
          setClusters(prev => prev.map(c => c.id === cluster.id ? cluster : c));
        },
        onClusterDelete: (id) => {
          setClusters(prev => prev.filter(c => c.id !== id));
        },
      });
    }

    // Always set up BroadcastChannel for same-browser sync (faster for local tabs)
    broadcastChannelRef.current = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    
    broadcastChannelRef.current.onmessage = (event) => {
      const { type, payload, senderId } = event.data;
      if (senderId === MY_USER_ID) return;

      switch (type) {
        case 'CURSOR':
          setRemoteCursors(prev => ({ ...prev, [senderId]: payload }));
          break;
        case 'NOTE_CREATE':
          // Only update from broadcast if not using Supabase (Supabase handles this)
          if (!USE_SUPABASE) {
            setNotes(prev => [...prev, payload]);
          }
          break;
        case 'NOTE_UPDATE':
          if (!USE_SUPABASE) {
            // Don't apply broadcast updates to notes the user is actively editing
            if (activelyEditingNotes.current.has(payload.id)) {
              break;
            }
            setNotes(prev => prev.map(n => n.id === payload.id ? { ...n, ...payload } : n));
          }
          break;
        case 'NOTE_DELETE':
          if (!USE_SUPABASE) {
            setNotes(prev => prev.filter(n => n.id !== payload));
          }
          break;
        case 'NOTE_MOVE_BATCH': 
          if (!USE_SUPABASE) {
            setNotes(prev => prev.map(n => {
              if (payload.ids.includes(n.id)) {
                const newX = (BigInt(n.x) + BigInt(payload.dx)).toString();
                const newY = (BigInt(n.y) + BigInt(payload.dy)).toString();
                return { ...n, x: newX, y: newY };
              }
              return n;
            }));
          }
          break;
        case 'CLUSTER_CREATE':
          if (!USE_SUPABASE) {
            setClusters(prev => [...prev, payload]);
          }
          break;
        case 'CLUSTER_DELETE':
          if (!USE_SUPABASE) {
            setClusters(prev => prev.filter(c => c.id !== payload));
          }
          break;
        case 'CLUSTER_UPDATE':
          if (!USE_SUPABASE) {
            setClusters(prev => prev.map(c => c.id === payload.id ? { ...c, ...payload.updates } : c));
          }
          break;
      }
    };

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
      unsubscribeFromBoard(supabaseChannelRef.current);
      broadcastChannelRef.current?.close();
      clearInterval(cursorInterval);
    };
  }, []);

  // 5. Cleanup expired notes
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

  // 6. Bot Simulation - REMOVED
  // The simulation effect has been removed as requested.

  // --- Logic: Clustering ---

  const handleCreateCluster = async () => {
    if (selectedNoteIds.size < 2) return;
    
    const selectedNotes = notes.filter(n => selectedNoteIds.has(n.id));
    
    // Calculate bounds using BigInt
    let minX = BigInt(selectedNotes[0].x);
    let minY = BigInt(selectedNotes[0].y);
    let maxX = BigInt(selectedNotes[0].x) + 200n;
    let maxY = BigInt(selectedNotes[0].y) + 200n;
    
    selectedNotes.forEach(n => {
      const nx = BigInt(n.x);
      const ny = BigInt(n.y);
      if (nx < minX) minX = nx;
      if (ny < minY) minY = ny;
      if (nx + 200n > maxX) maxX = nx + 200n;
      if (ny + 200n > maxY) maxY = ny + 200n;
    });

    // Add padding
    const padding = 40n;
    minX -= padding;
    minY -= padding * 2n;
    maxX += padding;
    maxY += padding;

    const noteTexts = selectedNotes.map(n => n.text).filter(t => t.length > 0);
    
    // Check AI usage limit for cluster title generation
    let title = "New Group";
    if (checkLimit()) {
      setIsProcessingAI(true);
      title = await generateClusterTitle(noteTexts);
      incrementUsage();
      setIsProcessingAI(false);
    } else {
      setToast(`✨ AI limit reached! (${remainingCredits}/5 credits) - Using default title`);
      setTimeout(() => setToast(null), 3000);
    }

    const newCluster: Cluster = {
      id: crypto.randomUUID(),
      title: title,
      x: minX.toString(),
      y: minY.toString(),
      width: Number(maxX - minX),
      height: Number(maxY - minY),
      color: CLUSTER_PRESETS[0].class
    };

    setClusters(prev => [...prev, newCluster]);
    broadcast('CLUSTER_CREATE', newCluster);
    if (USE_SUPABASE) {
      createClusterInDb(newCluster);
    }
    setSelectedNoteIds(new Set());
  };

  const handleUngroup = () => {
    if (selectedNoteIds.size === 0) return;

    const clustersToRemove = new Set<string>();
    const selectedNotes = notes.filter(n => selectedNoteIds.has(n.id));
    
    clusters.forEach(c => {
      const cx = BigInt(c.x);
      const cy = BigInt(c.y);
      const hasNote = selectedNotes.some(n => {
        const nx = BigInt(n.x);
        const ny = BigInt(n.y);
        return nx > cx && nx < cx + BigInt(c.width) &&
               ny > cy && ny < cy + BigInt(c.height);
      });
      if (hasNote) clustersToRemove.add(c.id);
    });

    clustersToRemove.forEach(cid => {
      broadcast('CLUSTER_DELETE', cid);
      if (USE_SUPABASE) {
        deleteClusterFromDb(cid);
      }
    });
    setClusters(prev => prev.filter(c => !clustersToRemove.has(c.id)));
  };

  const handleClusterDelete = (id: string) => {
    setClusters(prev => prev.filter(c => c.id !== id));
    broadcast('CLUSTER_DELETE', id);
    if (USE_SUPABASE) {
      deleteClusterFromDb(id);
    }
    setToast('Cluster deleted (notes remain)');
    setTimeout(() => setToast(null), 2000);
  };

  const handleClusterUpdate = (id: string, updates: Partial<Cluster>) => {
    setClusters(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    broadcast('CLUSTER_UPDATE', { id, updates });
    if (USE_SUPABASE) {
      updateClusterInDb(id, updates);
    }
  };

  // --- Handlers ---

  // --- Tutorial ---
  const handleShowTutorial = () => {
    // Coordinates for the tutorial area
    const startX = 10000n;
    const startY = 10000n;
    const spacing = 300n;
    const cols = 4;
    
    const tutorialNotesContent = [
      "👋 Welcome to Ephemeral Infinity Board!\n\nThis is a cosmic canvas where ideas flourish and fade after π×10⁴ seconds (≈8.7 hours).\n\nEverything you see is REAL and syncs worldwide! 🌐",
      "✏️ Create Notes\n\nClick anywhere on the canvas to drop a new sticky note.\n\nTry it now! Click the canvas and start writing. ➡️",
      "🗺️ Navigate the Infinite Canvas\n\n• Drag background = Pan around\n• Mouse wheel = Zoom in/out\n• This board is TRULY infinite!\n\nTry zooming out to see everything! 🔍",
      "🔧 Tools (top toolbar)\n\n✋ Hand - Pan the canvas\n🔲 Select - Multi-select notes\n📝 Note - Create new notes\n\nSwitch tools to explore! →",
      "🎯 Multi-Select Magic\n\n1. Click the Select tool (□)\n2. Drag a box around notes\n3. Or hold Shift + click notes\n\nSelected? Try grouping them! ⬇️",
      "🤖 AI-Powered Grouping\n\nSelect 2+ notes, then click:\n'Group & Label' \n\nGemini AI will create a smart title for your cluster!\n\nMagic! ✨",
      "💡 AI Brainstorm\n\n1. Click a note to select it\n2. Click the ✨ sparkle icon\n3. Gemini generates related ideas!\n\nThey spread around like a mind map 🧠",
      "🔗 Share a Note\n\nSelect a note → Click the 🔗 icon\n\nCopies a direct link! Anyone clicking it will teleport to that exact note location.\n\nTry it! →",
      "📦 Clusters = Smart Groups\n\nHover over a cluster to:\n• Edit the title\n• Change the color\n• Click X to ungroup\n\nOrganize your cosmic chaos! 🌈",
      "⏳ Everything Fades...\n\nNotes disappear after π×10,000 seconds\n(that's 8h 43m in human time)\n\nFOMO = engagement! \nIdeas that matter, capture elsewhere 📸",
      "🥧 Why π×10⁴ seconds?\n\nBecause cosmic order matters!\n\n31,415 seconds = a perfect mathematical cycle. Ideas flourish, then return to the void.\n\nEmbrace impermanence ✨"
    ];

    tutorialNotesContent.forEach((content, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      
      const noteX = (startX + BigInt(col) * spacing).toString();
      const noteY = (startY + BigInt(row) * spacing).toString();
      
      createNote(noteX, noteY, content, true);
    });

    // Jump to tutorial area
    setViewportCenter({ x: (startX + spacing).toString(), y: (startY + spacing).toString() });
    starfieldBurstRef.current?.(5, 200); // Teleport burst
    setToast("Teleporting to Tutorial Area... 🎓");
    setTimeout(() => setToast(null), 3000);
  };

  // --- Random Location (Privacy through Obscurity) ---
  const handleRandomLocation = () => {
    // Generate random coordinates in range ±10^12 (trillion)
    // This ensures coordinates are far enough apart to be effectively private
    const range = 1000000000000n; // 1 trillion
    const randomX = BigInt(Math.floor(Math.random() * Number(range * 2n))) - range;
    const randomY = BigInt(Math.floor(Math.random() * Number(range * 2n))) - range;
    
    const newX = randomX.toString();
    const newY = randomY.toString();
    
    // Set the viewport to the new location
    setViewportCenter({ x: newX, y: newY });
    starfieldBurstRef.current?.(8, 300); // Big random teleport burst
    
    // Create shareable URL
    const url = new URL(window.location.origin);
    url.searchParams.set('x', newX);
    url.searchParams.set('y', newY);
    
    // Copy to clipboard
    navigator.clipboard.writeText(url.toString()).then(() => {
      setToast("🎲 Teleported to a private spot! Link copied 📋");
    }).catch(() => {
      setToast(`🎲 Teleported to (${newX.slice(0, 8)}..., ${newY.slice(0, 8)}...)`);
    });
    
    setTimeout(() => setToast(null), 4000);
  };

  // --- Onboarding Complete Handler ---
  const handleOnboardingComplete = useCallback((data: { userName: string; userColor: string; firstNoteText: string; startCoordinates: { x: string; y: string } }) => {
    // Save user preferences
    setUserName(data.userName);
    setUserColor(data.userColor);
    completeOnboarding();
    
    // Use coordinates from onboarding
    // Start camera entry animation
    setIsEnteringBoard(true);
    setScale(0.3); // Start zoomed out
    setViewportCenter({ x: data.startCoordinates.x, y: data.startCoordinates.y });
    
    // After a brief moment, start the zoom-in and show welcome text
    setTimeout(() => {
      setShowWelcomeText(true);
      
      // Animate zoom to 1 over 1.5 seconds
      const startTime = Date.now();
      const duration = 1500;
      const startScale = 0.3;
      const endScale = 1;
      
      const animateZoom = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setScale(startScale + (endScale - startScale) * eased);
        
        if (progress < 1) {
          requestAnimationFrame(animateZoom);
        } else {
          // Zoom complete - create the first note with glow
          const noteId = crypto.randomUUID();
          const newNote: Note = {
            id: noteId,
            x: data.startCoordinates.x,
            y: data.startCoordinates.y,
            text: data.firstNoteText,
            color: data.userColor,
            createdAt: Date.now(),
            expiresAt: Date.now() + NOTE_LIFESPAN_MS,
            rotation: Math.random() * 6 - 3,
            width: 200,
            height: 200,
          };
          setNotes(prev => [...prev, newNote]);
          setFirstNoteId(noteId);
          
          if (USE_SUPABASE) {
            createNoteInDb(newNote);
          }
          
          // Hide welcome text and end entering state
          setTimeout(() => {
            setShowWelcomeText(false);
            setIsEnteringBoard(false);
            
            // Show tutorial popovers
            setTimeout(() => {
              setShowTutorialPopovers(true);
              // Clear first note glow after a few seconds
              setTimeout(() => setFirstNoteId(null), 6000);
            }, 500);
          }, 1500);
        }
      };
      
      requestAnimationFrame(animateZoom);
    }, 500);
  }, [setUserName, setUserColor, completeOnboarding]);

  const handleShare = (id: string) => {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    
    // Share the CENTER of the note (not top-left corner) so it appears centered on screen
    const centerX = (BigInt(note.x) + 100n).toString(); // 100 = half of 200px note width
    const centerY = (BigInt(note.y) + 100n).toString(); // 100 = half of 200px note height
    
    const url = new URL(window.location.href);
    url.searchParams.set('x', centerX);
    url.searchParams.set('y', centerY);
    
    navigator.clipboard.writeText(url.toString()).then(() => {
      setToast("Link with coordinates copied to clipboard!");
      setTimeout(() => setToast(null), 3000);
    });
  };

  const handleZoomBtn = (delta: number) => {
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    
    let targetWorldX: bigint, targetWorldY: bigint;
    
    if (selectedNoteIds.size > 0) {
      // Find center of selection
      const selectedNotes = notes.filter(n => selectedNoteIds.has(n.id));
      if (selectedNotes.length > 0) {
        let minX = BigInt(selectedNotes[0].x);
        let maxX = BigInt(selectedNotes[0].x) + 200n;
        let minY = BigInt(selectedNotes[0].y);
        let maxY = BigInt(selectedNotes[0].y) + 200n;
        
        selectedNotes.forEach(n => {
          const nx = BigInt(n.x);
          const ny = BigInt(n.y);
          if (nx < minX) minX = nx;
          if (nx + 200n > maxX) maxX = nx + 200n;
          if (ny < minY) minY = ny;
          if (ny + 200n > maxY) maxY = ny + 200n;
        });
        
        targetWorldX = (minX + maxX) / 2n;
        targetWorldY = (minY + maxY) / 2n;
      } else {
        targetWorldX = centerBig.x;
        targetWorldY = centerBig.y;
      }
    } else {
      targetWorldX = centerBig.x;
      targetWorldY = centerBig.y;
    }
    
    const newScale = Math.min(Math.max(0.1, scale + delta), 5);
    
    // Keep viewport centered on target
    setScale(newScale);
    setViewportCenter({ x: targetWorldX.toString(), y: targetWorldY.toString() });
    
    // Star burst feedback for zoom
    starfieldBurstRef.current?.(delta > 0 ? 2 : -1, 300);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      const zoomSensitivity = 0.001;
      const delta = -e.deltaY * zoomSensitivity;
      setScale(s => Math.min(Math.max(0.1, s + delta), 5));
    } else {
      // Pan: move viewport center in opposite direction of scroll
      const dx = Math.round(e.deltaX / scale);
      const dy = Math.round(e.deltaY / scale);
      setViewportCenter(prev => ({
        x: (BigInt(prev.x) + BigInt(dx)).toString(),
        y: (BigInt(prev.y) + BigInt(dy)).toString(),
      }));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTool === ToolType.HAND) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (activeTool === ToolType.NOTE) {
      const worldPos = screenToWorld(e.clientX, e.clientY);
      // Offset by half note size
      const noteX = (BigInt(worldPos.x) - 100n).toString();
      const noteY = (BigInt(worldPos.y) - 100n).toString();
      createNote(noteX, noteY);
    } else if (activeTool === ToolType.SELECT) {
      if (e.target === e.currentTarget) {
        setIsDragging(true);
        // Selection box uses screen coordinates for simplicity
        setDragStart({ x: e.clientX, y: e.clientY });
        setSelectionBox({ start: { x: e.clientX, y: e.clientY }, end: { x: e.clientX, y: e.clientY } });
        
        if (!e.shiftKey) {
          setSelectedNoteIds(new Set());
        }
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const worldPos = screenToWorld(e.clientX, e.clientY);
    
    // Broadcast Cursor (throttled)
    if (Math.random() > 0.5) {
      broadcast('CURSOR', {
        id: MY_USER_ID,
        name: userName || 'Anonymous',
        x: worldPos.x,
        y: worldPos.y,
        color: COLOR_TO_HEX[userColor] || '#fff740',
        lastActive: Date.now()
      });
    }

    if (isDragging) {
      if (activeTool === ToolType.HAND) {
        const dx = Math.round((e.clientX - dragStart.x) / scale);
        const dy = Math.round((e.clientY - dragStart.y) / scale);
        // Move viewport center in opposite direction
        setViewportCenter(prev => ({
          x: (BigInt(prev.x) - BigInt(dx)).toString(),
          y: (BigInt(prev.y) - BigInt(dy)).toString(),
        }));
        setDragStart({ x: e.clientX, y: e.clientY });
      } else if (activeTool === ToolType.SELECT && selectionBox) {
        setSelectionBox({ start: dragStart, end: { x: e.clientX, y: e.clientY } });
      }
    }
  };
  
  // Note dragging state
  const lastMousePos = useRef<{ x: string; y: string } | null>(null);

  const onGlobalMouseMove = useCallback((e: MouseEvent) => {
    const currentWorld = screenToWorld(e.clientX, e.clientY);
    
    // Update Selection Box Visual
    if (isDragging && selectionBox) {
      setSelectionBox(prev => prev ? { start: prev.start, end: { x: e.clientX, y: e.clientY } } : null);
    }

    // Move Selected Notes
    if (isDragging && !selectionBox && selectedNoteIds.size > 0 && lastMousePos.current) {
      const dx = BigInt(currentWorld.x) - BigInt(lastMousePos.current.x);
      const dy = BigInt(currentWorld.y) - BigInt(lastMousePos.current.y);
      
      if (dx !== 0n || dy !== 0n) {
        setNotes(prev => prev.map(n => {
          if (selectedNoteIds.has(n.id)) {
            return {
              ...n,
              x: (BigInt(n.x) + dx).toString(),
              y: (BigInt(n.y) + dy).toString(),
            };
          }
          return n;
        }));
        
        broadcast('NOTE_MOVE_BATCH', { 
          ids: Array.from(selectedNoteIds), 
          dx: dx.toString(), 
          dy: dy.toString() 
        });
        
        // Track total delta for Supabase sync on mouseUp
        if (USE_SUPABASE) {
          const ids = Array.from(selectedNoteIds);
          if (!movedNotesDelta.current) {
            movedNotesDelta.current = { ids, dx, dy };
          } else {
            movedNotesDelta.current.dx += dx;
            movedNotesDelta.current.dy += dy;
          }
        }
      }
    }
    lastMousePos.current = currentWorld;
  }, [isDragging, selectionBox, selectedNoteIds, screenToWorld]);

  const handleMouseUp = useCallback(() => {
    // Finalize Selection Box
    if (activeTool === ToolType.SELECT && selectionBox) {
      const x1 = Math.min(selectionBox.start.x, selectionBox.end.x);
      const y1 = Math.min(selectionBox.start.y, selectionBox.end.y);
      const x2 = Math.max(selectionBox.start.x, selectionBox.end.x);
      const y2 = Math.max(selectionBox.start.y, selectionBox.end.y);

      const newSelection = new Set(selectedNoteIds);
      notes.forEach(n => {
        // Get note center in screen space
        const screenPos = worldToScreen(n.x, n.y);
        const cx = screenPos.x + 100 * scale;
        const cy = screenPos.y + 100 * scale;
        if (cx >= x1 && cx <= x2 && cy >= y1 && cy <= y2) {
          newSelection.add(n.id);
        }
      });
      setSelectedNoteIds(newSelection);
      setSelectionBox(null);
    }

    // Sync moved notes to Supabase
    if (USE_SUPABASE && movedNotesDelta.current) {
      const { ids, dx, dy } = movedNotesDelta.current;
      moveNotesInDb(ids, dx.toString(), dy.toString());
      movedNotesDelta.current = null;
    }

    setIsDragging(false);
    lastMousePos.current = null;
  }, [activeTool, selectionBox, selectedNoteIds, notes, worldToScreen, scale]);

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', onGlobalMouseMove);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', onGlobalMouseMove);
    };
  }, [handleMouseUp, onGlobalMouseMove]);

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
    // Mark this note as actively being edited
    activelyEditingNotes.current.add(id);
    
    // Update local state immediately (smooth typing)
    setNotes(prev => prev.map(n => n.id === id ? { ...n, text: newText } : n));
    broadcast('NOTE_UPDATE', { id, text: newText });
    
    // Debounce Supabase updates (wait 500ms after typing stops)
    if (USE_SUPABASE) {
      if (updateTimers.current[id]) {
        clearTimeout(updateTimers.current[id]);
      }
      updateTimers.current[id] = setTimeout(() => {
        updateNoteInDb(id, { text: newText });
        delete updateTimers.current[id];
        // Remove from actively editing after save completes
        activelyEditingNotes.current.delete(id);
      }, 500);
    }
  };

  const handleNoteResize = (id: string, width: number, height: number) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, width, height } : n));
    broadcast('NOTE_UPDATE', { id, width, height });
    if (USE_SUPABASE) {
      updateNoteInDb(id, { width, height });
    }
  };

  const handleNoteDelete = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    broadcast('NOTE_DELETE', id);
    if (USE_SUPABASE) {
      deleteNoteFromDb(id);
    }
  };

  // Bulk operations for selected notes
  const handleBulkColorChange = (color: string) => {
    if (selectedNoteIds.size === 0) return;
    
    setNotes(prev => prev.map(n => 
      selectedNoteIds.has(n.id) ? { ...n, color } : n
    ));
    
    // Broadcast and save each note's color change
    selectedNoteIds.forEach(id => {
      broadcast('NOTE_UPDATE', { id, color });
      if (USE_SUPABASE) {
        updateNoteInDb(id, { color });
      }
    });
    
    setToast(`Changed color of ${selectedNoteIds.size} notes`);
    setTimeout(() => setToast(null), 2000);
  };

  const handleBulkDelete = () => {
    if (selectedNoteIds.size === 0) return;
    
    const count = selectedNoteIds.size;
    
    // Delete all selected notes
    selectedNoteIds.forEach(id => {
      broadcast('NOTE_DELETE', id);
      if (USE_SUPABASE) {
        deleteNoteFromDb(id);
      }
    });
    
    setNotes(prev => prev.filter(n => !selectedNoteIds.has(n.id)));
    setSelectedNoteIds(new Set());
    
    setToast(`Deleted ${count} notes`);
    setTimeout(() => setToast(null), 2000);
  };

  const handleGeminiExpand = async (id: string, text: string) => {
    if (!text || text.length < 3) return;
    
    // Check AI usage limit
    if (!checkLimit()) {
      setToast(`✨ AI limit reached! (${remainingCredits}/5 credits) - Upgrade for unlimited`);
      setTimeout(() => setToast(null), 4000);
      return;
    }
    
    setIsProcessingAI(true);
    const parentNote = notes.find(n => n.id === id);
    if (!parentNote) {
      setIsProcessingAI(false);
      return;
    }

    const ideas = await brainstormNotes(text);
    
    // Only increment usage if we got results
    if (ideas.length > 0) {
      incrementUsage();
    }
    
    const parentX = BigInt(parentNote.x);
    const parentY = BigInt(parentNote.y);
    
    ideas.forEach((idea, index) => {
      const angle = (index / ideas.length) * Math.PI * 2;
      const distance = 250;
      const nx = (parentX + BigInt(Math.round(Math.cos(angle) * distance))).toString();
      const ny = (parentY + BigInt(Math.round(Math.sin(angle) * distance))).toString();
      createNote(nx, ny, idea, true);
    });
    setIsProcessingAI(false);
  };

  // Calculate background grid offset based on viewport center
  const gridOffsetX = -Number(centerBig.x % 1000n) * scale;
  const gridOffsetY = -Number(centerBig.y % 1000n) * scale;

  // Show loading state while preferences are loading
  if (!prefsLoaded) {
    return (
      <div className="w-screen h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white/50 text-lg animate-pulse">Loading...</div>
      </div>
    );
  }

  // Show onboarding if not completed
  if (shouldShowOnboarding) {
    return (
      <Onboarding
        initialUserName={userName}
        initialUserColor={userColor}
        skipOnboarding={skipOnboarding}
        onSkipChange={setSkipOnboarding}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  // Calculate parallax offset for stars (stars move slower than canvas)
  const parallaxX = Number(centerBig.x % 10000n);
  const parallaxY = Number(centerBig.y % 10000n);

  return (
    <>
      {/* Persistent Starfield Background */}
      <Starfield 
        mode="board" 
        parallaxOffsetX={parallaxX}
        parallaxOffsetY={parallaxY}
        triggerBurstRef={starfieldBurstRef}
      />
      
      <div 
        ref={containerRef}
        className={`w-screen h-screen overflow-hidden relative dot-grid ${activeTool === ToolType.HAND ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'} ${isEnteringBoard ? 'animate-zoom-in' : ''}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        style={{
          backgroundPosition: `${gridOffsetX}px ${gridOffsetY}px`,
          backgroundSize: `${40 * scale}px ${40 * scale}px`
        }}
      >
      {/* Welcome Text Overlay */}
      {showWelcomeText && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <p className="text-white/70 text-xl font-light tracking-wider animate-welcome">
            You are in your space now.
          </p>
        </div>
      )}
      
      {/* Render Clusters */}
      {clusters.map(cluster => {
        const screenPos = worldToScreen(cluster.x, cluster.y);
        // Culling: skip if too far off screen
        if (screenPos.x < -2000 || screenPos.x > window.innerWidth + 2000 ||
            screenPos.y < -2000 || screenPos.y > window.innerHeight + 2000) {
          return null;
        }
        return (
          <ClusterGroup 
            key={cluster.id}
            cluster={cluster}
            screenX={screenPos.x}
            screenY={screenPos.y}
            scale={scale}
            onUpdate={handleClusterUpdate}
            onDelete={handleClusterDelete}
          />
        );
      })}

      {/* Render Notes */}
      {notes.map(note => {
        const screenPos = worldToScreen(note.x, note.y);
        // Culling: skip if too far off screen
        if (screenPos.x < -500 || screenPos.x > window.innerWidth + 500 ||
            screenPos.y < -500 || screenPos.y > window.innerHeight + 500) {
          return null;
        }
        
        // Calculate distance from screen center for fog effect
        const screenCenterX = window.innerWidth / 2;
        const screenCenterY = window.innerHeight / 2;
        const distanceFromCenter = Math.sqrt(
          Math.pow(screenPos.x + 100 - screenCenterX, 2) + 
          Math.pow(screenPos.y + 100 - screenCenterY, 2)
        );
        const maxDistance = Math.sqrt(Math.pow(screenCenterX, 2) + Math.pow(screenCenterY, 2));
        // Fade from 100% at center to 40% at edges
        const distanceOpacity = Math.max(0.4, 1 - (distanceFromCenter / maxDistance) * 0.6);
        
        return (
          <StickyNote 
            key={note.id} 
            note={note}
            screenX={screenPos.x}
            screenY={screenPos.y}
            scale={scale}
            tool={activeTool}
            selected={selectedNoteIds.has(note.id)}
            onUpdate={handleNoteUpdate}
            onDelete={handleNoteDelete}
            onResize={handleNoteResize}
            onMouseDown={onNoteMouseDown}
            onAIExpand={handleGeminiExpand}
            onShare={handleShare}
            isFirstNote={note.id === firstNoteId}
            distanceOpacity={distanceOpacity}
          />
        );
      })}

      {/* Render Selection Box (screen space) */}
      {selectionBox && (
        <div 
          className="absolute border-2 border-blue-400 bg-blue-200/20 z-50 pointer-events-none"
          style={{
            left: Math.min(selectionBox.start.x, selectionBox.end.x),
            top: Math.min(selectionBox.start.y, selectionBox.end.y),
            width: Math.abs(selectionBox.end.x - selectionBox.start.x),
            height: Math.abs(selectionBox.end.y - selectionBox.start.y),
          }}
        />
      )}

      {/* Render Remote Cursors */}
      {(Object.entries(remoteCursors) as [string, UserCursor][]).map(([id, cursor]) => {
        const screenPos = worldToScreen(cursor.x, cursor.y);
        return (
          <div 
            key={id}
            className="absolute pointer-events-none z-[100] flex flex-col items-start transition-all duration-100 ease-linear"
            style={{
              left: screenPos.x,
              top: screenPos.y
            }}
          >
            <MousePointer2 
              size={20} 
              fill={cursor.color} 
              color="white" 
              className="drop-shadow-md"
              style={{ transform: `scale(${1/Math.max(0.5, scale)})` }}
            />
            <span 
              className="ml-4 -mt-2 text-xs font-medium px-2 py-0.5 rounded text-white shadow-sm whitespace-nowrap"
              style={{ backgroundColor: cursor.color, transform: `scale(${1/Math.max(0.5, scale)})`, transformOrigin: 'top left' }}
            >
              {cursor.name}
            </span>
          </div>
        );
      })}

      {/* UI Overlay Layer */}
      <Toolbar 
        activeTool={activeTool} 
        onSelectTool={setActiveTool} 
        onReset={() => { 
          setViewportCenter({ x: '0', y: '0' }); 
          setScale(1); 
          starfieldBurstRef.current?.(5, 200); // Reset to origin burst
        }}
        onShowTutorial={handleShowTutorial}
        onRandomLocation={handleRandomLocation}
        noteCount={notes.length}
      />

      <Minimap 
        centerX={viewportCenter.x}
        centerY={viewportCenter.y}
        scale={scale} 
        onMoveTo={(x, y) => {
          setViewportCenter({ x, y });
          starfieldBurstRef.current?.(5, 200); // Navigator/Saved Places teleport burst
        }}
        onZoom={handleZoomBtn}
      />

      {/* Floating Context Menu for Selection */}
      {selectedNoteIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-gray-900/90 backdrop-blur-xl rounded-xl shadow-xl border border-white/10 p-2 z-50 animate-in fade-in slide-in-from-bottom-4">
          <span className="text-xs font-semibold text-white/60 px-2">{selectedNoteIds.size} Selected</span>
          <div className="h-4 w-px bg-white/10 mx-1" />
          
          {/* Color Picker */}
          <div className="flex items-center gap-1 px-1">
            {NOTE_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => handleBulkColorChange(color)}
                className={`w-5 h-5 rounded-full ${color} border-2 border-gray-800 shadow-sm hover:scale-125 transition-transform`}
                title={`Change to ${color.replace('bg-note-', '')}`}
              />
            ))}
          </div>
          
          <div className="h-4 w-px bg-white/10 mx-1" />
          
          <button 
            onClick={handleCreateCluster}
            disabled={selectedNoteIds.size < 2 || isProcessingAI}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-blue-500/20 text-blue-400 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessingAI ? <Loader2 className="animate-spin" size={14}/> : <BoxSelect size={14} />}
            Group & Label
          </button>
          
          <button 
            onClick={handleUngroup}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-orange-500/20 text-orange-400 font-medium text-sm transition-colors"
            title="Ungroup overlapping clusters"
          >
            <Ungroup size={14} />
            Ungroup
          </button>
          
          <div className="h-4 w-px bg-white/10 mx-1" />
          
          <button 
            onClick={handleBulkDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-500/20 text-red-400 font-medium text-sm transition-colors"
            title="Delete all selected notes"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900/90 text-white px-4 py-2 rounded-full shadow-lg z-[100] text-sm animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}

      {/* Tutorial Popovers (after onboarding) */}
      <TutorialPopovers
        isActive={showTutorialPopovers}
        onComplete={() => setShowTutorialPopovers(false)}
      />

      {/* AI Loading Indicator */}
      {isProcessingAI && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur-xl px-4 py-2 rounded-full shadow-lg border border-purple-500/30 flex items-center gap-2 z-50 text-purple-300 animate-pulse">
          <Loader2 className="animate-spin" size={16} />
          <span className="text-sm font-medium">Gemini is thinking...</span>
        </div>
      )}

      {/* Connection Status */}
      <div className="fixed top-6 left-6 flex items-center gap-2 bg-gray-900/80 backdrop-blur-xl border border-white/10 px-3 py-2 rounded-lg shadow-sm text-sm z-40">
        {connectionStatus === 'connected' ? (
          <>
            <Wifi className="text-green-400" size={16} />
            <span className="text-green-400 font-medium">Online</span>
          </>
        ) : connectionStatus === 'connecting' ? (
          <>
            <Loader2 className="text-blue-400 animate-spin" size={16} />
            <span className="text-blue-400 font-medium">Connecting...</span>
          </>
        ) : (
          <>
            <WifiOff className="text-white/40" size={16} />
            <span className="text-white/60 font-medium">Local Mode</span>
          </>
        )}
      </div>

      {/* AI Credits Indicator */}
      <div className="fixed top-16 left-6 flex items-center gap-2 bg-gray-900/80 backdrop-blur-xl border border-white/10 px-3 py-2 rounded-lg shadow-sm text-sm z-40">
        <Sparkles className={isLimitReached ? 'text-white/40' : 'text-purple-400'} size={16} />
        <span className={isLimitReached ? 'text-white/50' : 'text-purple-300'}>
          {remainingCredits}/5 AI credits
        </span>
        {isLimitReached && (
          <span className="text-xs text-orange-400 font-medium ml-1">
            (resets tomorrow)
          </span>
        )}
      </div>

      {/* Info Toast */}
      <div className="fixed top-6 right-6 max-w-xs bg-gray-900/80 backdrop-blur-xl border border-white/10 p-4 rounded-lg shadow-sm text-sm text-white/60 pointer-events-none select-none z-40">
        <div className="flex items-start gap-2">
          <Info className="shrink-0 mt-0.5 text-blue-400" size={16} />
          <div>
            <p className="font-semibold text-white/90">Ephemeral Infinity Board</p>
            <p className="mt-1">
              {USE_SUPABASE 
                ? "🌐 Real multiplayer! Notes sync across all users worldwide." 
                : "Multiplayer syncs locally. Open a second tab to see it."}
            </p>
            <p className="mt-1 text-xs text-white/40">Hold Shift to multi-select. Group notes to auto-label them with AI. Hover over clusters to edit title or color.</p>
          </div>
        </div>
      </div>
      
    </div>
    </>
  );
};

export default App;
