import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface TutorialPopover {
  id: string;
  title: string;
  description: string;
  position: 'top-left' | 'top-center' | 'bottom-center';
}

const POPOVERS: TutorialPopover[] = [
  {
    id: 'move',
    title: 'Move around',
    description: 'Click and drag the space to explore the infinite canvas.',
    position: 'bottom-center',
  },
  {
    id: 'create',
    title: 'Create a note',
    description: 'Click once on the board, type your idea, press Enter.',
    position: 'bottom-center',
  },
  {
    id: 'ephemeral',
    title: 'Notes are alive',
    description: 'Each note has a timer. When time runs out, it fades away. Embrace impermanence.',
    position: 'bottom-center',
  },
];

interface TutorialPopoversProps {
  isActive: boolean;
  onComplete: () => void;
}

const TutorialPopovers: React.FC<TutorialPopoversProps> = ({ isActive, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Delayed start
  useEffect(() => {
    if (!isActive) return;
    
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1500); // Show after 1.5 seconds

    return () => clearTimeout(timer);
  }, [isActive]);

  // Auto-advance on user interaction
  useEffect(() => {
    if (!isVisible) return;

    const handleInteraction = () => {
      if (!hasInteracted) {
        setHasInteracted(true);
        return;
      }

      // Advance to next popover
      if (currentIndex < POPOVERS.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setIsVisible(false);
        onComplete();
      }
    };

    // Listen for meaningful interactions
    const handleMouseDown = () => handleInteraction();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsVisible(false);
        onComplete();
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible, currentIndex, hasInteracted, onComplete]);

  // Auto-dismiss after timeout
  useEffect(() => {
    if (!isVisible) return;

    const timer = setTimeout(() => {
      if (currentIndex < POPOVERS.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setIsVisible(false);
        onComplete();
      }
    }, 6000); // 6 seconds per popover

    return () => clearTimeout(timer);
  }, [isVisible, currentIndex, onComplete]);

  if (!isActive || !isVisible) return null;

  const currentPopover = POPOVERS[currentIndex];

  const positionClasses = {
    'top-left': 'top-24 left-8',
    'top-center': 'top-24 left-1/2 -translate-x-1/2',
    'bottom-center': 'bottom-32 left-1/2 -translate-x-1/2',
  };

  return (
    <div 
      className={`fixed z-50 ${positionClasses[currentPopover.position]} 
                  animate-fade-in-up max-w-sm`}
    >
      <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 
                      rounded-2xl px-6 py-4 shadow-2xl">
        {/* Close button */}
        <button
          onClick={() => {
            setIsVisible(false);
            onComplete();
          }}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <X size={14} />
        </button>

        {/* Content */}
        <h3 className="text-white/90 font-medium text-sm mb-1">
          {currentPopover.title}
        </h3>
        <p className="text-gray-400 text-sm leading-relaxed">
          {currentPopover.description}
        </p>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {POPOVERS.map((_, idx) => (
            <div
              key={idx}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                idx === currentIndex 
                  ? 'bg-white w-4' 
                  : idx < currentIndex 
                    ? 'bg-gray-500' 
                    : 'bg-gray-700'
              }`}
            />
          ))}
        </div>

        {/* Hint */}
        <p className="text-gray-600 text-xs text-center mt-3">
          Click anywhere to continue • Esc to skip
        </p>
      </div>
    </div>
  );
};

export default TutorialPopovers;





