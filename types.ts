export interface Point {
  x: number;
  y: number;
}

export interface Note {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  createdAt: number;
  expiresAt: number;
  rotation: number;
  isFalling?: boolean;
}

export interface Cluster {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string; // TailWind color class for border/bg
}

export interface UserCursor {
  id: string;
  name: string;
  x: number; // World coordinates
  y: number;
  color: string;
  lastActive: number;
}

export enum ToolType {
  HAND = 'HAND',
  SELECT = 'SELECT',
  NOTE = 'NOTE',
}

export const NOTE_COLORS = [
  'bg-note-yellow',
  'bg-note-blue',
  'bg-note-green',
  'bg-note-pink',
  'bg-note-orange',
];

export const NOTE_LIFESPAN_MS = 60000; // 60 seconds

export const CLUSTER_PRESETS = [
  { name: 'Blue', class: 'border-blue-400 bg-blue-50/20', dotColor: 'bg-blue-400' },
  { name: 'Red', class: 'border-red-400 bg-red-50/20', dotColor: 'bg-red-400' },
  { name: 'Green', class: 'border-green-400 bg-green-50/20', dotColor: 'bg-green-400' },
  { name: 'Purple', class: 'border-purple-400 bg-purple-50/20', dotColor: 'bg-purple-400' },
  { name: 'Amber', class: 'border-amber-400 bg-amber-50/20', dotColor: 'bg-amber-400' },
  { name: 'Slate', class: 'border-slate-400 bg-slate-50/20', dotColor: 'bg-slate-400' },
];