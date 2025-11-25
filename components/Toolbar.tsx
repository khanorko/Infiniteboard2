import React from 'react';
import { Hand, MousePointer2, StickyNote, GraduationCap, Shuffle } from 'lucide-react';
import { ToolType } from '../types';

interface ToolbarProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  onReset: () => void;
  onShowTutorial: () => void;
  onRandomLocation: () => void;
  noteCount: number;
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  activeTool, 
  onSelectTool, 
  onReset,
  onShowTutorial,
  onRandomLocation,
  noteCount
}) => {
  const tools = [
    { id: ToolType.HAND, icon: Hand, label: 'Pan (H)' },
    { id: ToolType.SELECT, icon: MousePointer2, label: 'Select (V)' },
    { id: ToolType.NOTE, icon: StickyNote, label: 'Post-it (N)' },
  ];

  return (
    <div 
      className="fixed top-6 left-1/2 -translate-x-1/2 bg-gray-900/80 backdrop-blur-xl rounded-full shadow-lg border border-white/10 px-4 py-2 flex items-center gap-4 z-50"
      onMouseDown={(e) => e.stopPropagation()} // Prevent canvas interaction
    >
      <div className="flex items-center gap-1 border-r border-white/10 pr-4">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            className={`p-2.5 rounded-full transition-all duration-200 flex items-center justify-center tooltip-trigger relative group ${
              activeTool === tool.id 
                ? 'bg-white/20 text-white scale-110 shadow-sm' 
                : 'text-white/60 hover:bg-white/10 hover:text-white'
            }`}
            title={tool.label}
          >
            <tool.icon size={20} />
            {/* Tooltip */}
            <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {tool.label}
            </span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
         <button
          onClick={onShowTutorial}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20"
          title="Show Tutorial Notes"
         >
           <GraduationCap size={14} />
           Tutorial
         </button>

         <button
          onClick={onRandomLocation}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border bg-white/5 text-white/60 border-white/10 hover:bg-purple-500/20 hover:text-purple-300 hover:border-purple-500/30"
          title="Teleport to a random private location"
         >
           <Shuffle size={14} />
           Random
         </button>

         <div className="text-xs text-white/40 font-mono ml-2">
            {noteCount} Active
         </div>
      </div>
    </div>
  );
};

export default Toolbar;