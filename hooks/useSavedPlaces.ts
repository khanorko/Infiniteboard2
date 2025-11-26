import { useState, useEffect, useCallback } from 'react';

export interface SavedPlace {
  id: string;
  name: string;
  x: string;
  y: string;
  createdAt: number;
}

const STORAGE_KEY = 'infinity_savedPlaces';

export const useSavedPlaces = () => {
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved places on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSavedPlaces(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load saved places:', e);
    }
    setIsLoaded(true);
  }, []);

  // Persist to localStorage whenever savedPlaces changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPlaces));
    }
  }, [savedPlaces, isLoaded]);

  const addPlace = useCallback((name: string, x: string, y: string) => {
    const newPlace: SavedPlace = {
      id: crypto.randomUUID(),
      name: name.trim() || `Location ${savedPlaces.length + 1}`,
      x,
      y,
      createdAt: Date.now(),
    };
    setSavedPlaces(prev => [newPlace, ...prev]);
    return newPlace;
  }, [savedPlaces.length]);

  const removePlace = useCallback((id: string) => {
    setSavedPlaces(prev => prev.filter(p => p.id !== id));
  }, []);

  const renamePlace = useCallback((id: string, newName: string) => {
    setSavedPlaces(prev => 
      prev.map(p => p.id === id ? { ...p, name: newName.trim() } : p)
    );
  }, []);

  return {
    savedPlaces,
    isLoaded,
    addPlace,
    removePlace,
    renamePlace,
  };
};

