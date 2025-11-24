import React from 'react';
import { Hand, MousePointer2, StickyNote, RefreshCw, Users } from 'lucide-react';
import { ToolType } from '../types';

interface ToolbarProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  onReset: () => void;
  toggleSimulation: () => void;
  isSimulating: boolean;
  noteCount: number;
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  activeTool, 
  onSelectTool, 
  onReset,
  toggleSimulation,
  isSimulating,
  noteCount
}) => {
  const tools = [
    { id: ToolType.HAND, icon: Hand, label: 'Pan (H)' },
    { id: ToolType.SELECT, icon: MousePointer2, label: 'Select (V)' },
    { id: ToolType.NOTE, icon: StickyNote, label: 'Post-it (N)' },
  ];

  return (
    <div 
      className="fixed top-6 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-lg border border-gray-200 px-4 py-2 flex items-center gap-4 z-50"
      onMouseDown={(e) => e.stopPropagation()} // Prevent canvas interaction
    >
      <div className="flex items-center gap-1 border-r border-gray-200 pr-4">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            className={`p-2.5 rounded-full transition-all duration-200 flex items-center justify-center tooltip-trigger relative group ${
              activeTool === tool.id 
                ? 'bg-blue-100 text-blue-600 scale-110 shadow-sm' 
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
            title={tool.label}
          >
            <tool.icon size={20} />
            {/* Tooltip */}
            <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {tool.label}
            </span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
         <button
          onClick={toggleSimulation}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
            isSimulating 
              ? 'bg-green-100 text-green-700 border-green-200' 
              : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
          }`}
         >
           <Users size={14} />
           {isSimulating ? 'Live Mode' : 'Solo Mode'}
         </button>

         <div className="text-xs text-gray-400 font-mono ml-2">
            {noteCount} Active
         </div>
      </div>
    </div>
  );
};

export default Toolbar;