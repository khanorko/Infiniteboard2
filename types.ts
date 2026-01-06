// Screen-space point (regular numbers for rendering)
export interface Point {
  x: number;
  y: number;
}

// World-space coordinates stored as strings for BigInt serialization
// This allows truly infinite coordinate values
export interface Note {
  id: string;
  x: string;  // BigInt as string for unlimited precision
  y: string;  // BigInt as string for unlimited precision
  text: string;
  color: string;
  createdAt: number;
  expiresAt: number;
  rotation: number;
  width?: number;   // Optional, defaults to 200
  height?: number;  // Optional, defaults to 200
  isFalling?: boolean;
  isTutorial?: boolean;  // Tutorial notes are static and can't be deleted/shared/AI expanded
  isSliding?: boolean;   // Animating slide out of tutorial area
}

export interface Cluster {
  id: string;
  title: string;
  x: string;      // BigInt as string
  y: string;      // BigInt as string
  width: number;  // Regular number (clusters have limited size)
  height: number;
  color: string;  // TailWind color class for border/bg
}

export interface UserCursor {
  id: string;
  name: string;
  x: string; // World coordinates as BigInt string
  y: string;
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
  'bg-note-purple',
  'bg-note-red',
  'bg-note-teal',
  'bg-note-lime',
  'bg-note-gray',
];

export const NOTE_LIFESPAN_MS = 31415000; // π × 10,000 seconds (≈8.7 hours)

export const CLUSTER_PRESETS = [
  { name: 'Blue', class: 'border-blue-400 bg-blue-50/20', dotColor: 'bg-blue-400' },
  { name: 'Red', class: 'border-red-400 bg-red-50/20', dotColor: 'bg-red-400' },
  { name: 'Green', class: 'border-green-400 bg-green-50/20', dotColor: 'bg-green-400' },
  { name: 'Purple', class: 'border-purple-400 bg-purple-50/20', dotColor: 'bg-purple-400' },
  { name: 'Amber', class: 'border-amber-400 bg-amber-50/20', dotColor: 'bg-amber-400' },
  { name: 'Slate', class: 'border-slate-400 bg-slate-50/20', dotColor: 'bg-slate-400' },
];
