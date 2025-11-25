import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { Note, Cluster } from '../types';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey && supabase);
};

// Board ID - use 'public' for the global board, or generate unique IDs for private boards
const BOARD_ID = 'public';

// --- Notes ---

export interface DbNote {
  id: string;
  board_id: string;
  x: string;
  y: string;
  text: string;
  color: string;
  rotation: number;
  width: number;
  height: number;
  created_at: string;
  expires_at: string;
}

function dbNoteToNote(dbNote: DbNote): Note {
  return {
    id: dbNote.id,
    x: dbNote.x,
    y: dbNote.y,
    text: dbNote.text,
    color: dbNote.color,
    rotation: dbNote.rotation,
    width: dbNote.width || 200,
    height: dbNote.height || 200,
    createdAt: new Date(dbNote.created_at).getTime(),
    expiresAt: new Date(dbNote.expires_at).getTime(),
  };
}

function noteToDbNote(note: Note): Omit<DbNote, 'created_at'> {
  return {
    id: note.id,
    board_id: BOARD_ID,
    x: note.x,
    y: note.y,
    text: note.text,
    color: note.color,
    rotation: note.rotation,
    width: note.width || 200,
    height: note.height || 200,
    expires_at: new Date(note.expiresAt).toISOString(),
  };
}

// Fetch all active notes
export async function fetchNotes(): Promise<Note[]> {
  if (!supabase) return [];
  
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('board_id', BOARD_ID)
    .gt('expires_at', now)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching notes:', error);
    return [];
  }

  return (data || []).map(dbNoteToNote);
}

// Create a note
export async function createNoteInDb(note: Note): Promise<boolean> {
  if (!supabase) return false;
  
  const { error } = await supabase
    .from('notes')
    .insert(noteToDbNote(note));

  if (error) {
    console.error('Error creating note:', error);
    return false;
  }
  return true;
}

// Update a note
export async function updateNoteInDb(id: string, updates: Partial<Note>): Promise<boolean> {
  if (!supabase) return false;
  
  const dbUpdates: Record<string, any> = {};
  if (updates.text !== undefined) dbUpdates.text = updates.text;
  if (updates.x !== undefined) dbUpdates.x = updates.x;
  if (updates.y !== undefined) dbUpdates.y = updates.y;
  if (updates.width !== undefined) dbUpdates.width = updates.width;
  if (updates.height !== undefined) dbUpdates.height = updates.height;

  const { error } = await supabase
    .from('notes')
    .update(dbUpdates)
    .eq('id', id);

  if (error) {
    console.error('Error updating note:', error);
    return false;
  }
  return true;
}

// Delete a note
export async function deleteNoteFromDb(id: string): Promise<boolean> {
  if (!supabase) return false;
  
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting note:', error);
    return false;
  }
  return true;
}

// Batch update note positions
export async function moveNotesInDb(ids: string[], dx: string, dy: string): Promise<boolean> {
  if (!supabase || ids.length === 0) return false;
  
  // Fetch current positions
  const { data, error: fetchError } = await supabase
    .from('notes')
    .select('id, x, y')
    .in('id', ids);

  if (fetchError || !data) return false;

  // Update each note with new position
  const updates = data.map(note => ({
    id: note.id,
    x: (BigInt(note.x) + BigInt(dx)).toString(),
    y: (BigInt(note.y) + BigInt(dy)).toString(),
  }));

  for (const update of updates) {
    await supabase
      .from('notes')
      .update({ x: update.x, y: update.y })
      .eq('id', update.id);
  }

  return true;
}

// --- Clusters ---

export interface DbCluster {
  id: string;
  board_id: string;
  title: string;
  x: string;
  y: string;
  width: number;
  height: number;
  color: string;
}

function dbClusterToCluster(dbCluster: DbCluster): Cluster {
  return {
    id: dbCluster.id,
    title: dbCluster.title,
    x: dbCluster.x,
    y: dbCluster.y,
    width: dbCluster.width,
    height: dbCluster.height,
    color: dbCluster.color,
  };
}

export async function fetchClusters(): Promise<Cluster[]> {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('clusters')
    .select('*')
    .eq('board_id', BOARD_ID);

  if (error) {
    console.error('Error fetching clusters:', error);
    return [];
  }

  return (data || []).map(dbClusterToCluster);
}

export async function createClusterInDb(cluster: Cluster): Promise<boolean> {
  if (!supabase) return false;
  
  const { error } = await supabase
    .from('clusters')
    .insert({
      id: cluster.id,
      board_id: BOARD_ID,
      title: cluster.title,
      x: cluster.x,
      y: cluster.y,
      width: cluster.width,
      height: cluster.height,
      color: cluster.color,
    });

  if (error) {
    console.error('Error creating cluster:', error);
    return false;
  }
  return true;
}

export async function updateClusterInDb(id: string, updates: Partial<Cluster>): Promise<boolean> {
  if (!supabase) return false;
  
  const { error } = await supabase
    .from('clusters')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating cluster:', error);
    return false;
  }
  return true;
}

export async function deleteClusterFromDb(id: string): Promise<boolean> {
  if (!supabase) return false;
  
  const { error } = await supabase
    .from('clusters')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting cluster:', error);
    return false;
  }
  return true;
}

// --- Realtime Subscriptions ---

export interface RealtimeCallbacks {
  onNoteInsert: (note: Note) => void;
  onNoteUpdate: (note: Note) => void;
  onNoteDelete: (id: string) => void;
  onClusterInsert: (cluster: Cluster) => void;
  onClusterUpdate: (cluster: Cluster) => void;
  onClusterDelete: (id: string) => void;
}

export function subscribeToBoard(callbacks: RealtimeCallbacks): RealtimeChannel | null {
  if (!supabase) return null;

  const channel = supabase
    .channel('board-changes')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notes', filter: `board_id=eq.${BOARD_ID}` },
      (payload) => {
        callbacks.onNoteInsert(dbNoteToNote(payload.new as DbNote));
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'notes', filter: `board_id=eq.${BOARD_ID}` },
      (payload) => {
        callbacks.onNoteUpdate(dbNoteToNote(payload.new as DbNote));
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'notes', filter: `board_id=eq.${BOARD_ID}` },
      (payload) => {
        callbacks.onNoteDelete((payload.old as any).id);
      }
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'clusters', filter: `board_id=eq.${BOARD_ID}` },
      (payload) => {
        callbacks.onClusterInsert(dbClusterToCluster(payload.new as DbCluster));
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'clusters', filter: `board_id=eq.${BOARD_ID}` },
      (payload) => {
        callbacks.onClusterUpdate(dbClusterToCluster(payload.new as DbCluster));
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'clusters', filter: `board_id=eq.${BOARD_ID}` },
      (payload) => {
        callbacks.onClusterDelete((payload.old as any).id);
      }
    )
    .subscribe();

  return channel;
}

export function unsubscribeFromBoard(channel: RealtimeChannel | null) {
  if (channel && supabase) {
    supabase.removeChannel(channel);
  }
}

