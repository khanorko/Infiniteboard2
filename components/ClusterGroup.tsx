import React, { useState, useEffect } from 'react';
import { Cluster, CLUSTER_PRESETS } from '../types';
import { Check, Edit2, X } from 'lucide-react';

interface ClusterGroupProps {
  cluster: Cluster;
  screenX: number;  // Pre-calculated screen position
  screenY: number;
  scale: number;
  onUpdate: (id: string, updates: Partial<Cluster>) => void;
  onDelete: (id: string) => void;
}

const ClusterGroup: React.FC<ClusterGroupProps> = ({ cluster, screenX, screenY, scale, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(cluster.title);

  useEffect(() => {
    setTitle(cluster.title);
  }, [cluster.title]);

  const handleTitleSubmit = () => {
    setIsEditing(false);
    if (title.trim() !== cluster.title) {
      onUpdate(cluster.id, { title: title.trim() || "Untitled Cluster" });
    } else {
      setTitle(cluster.title);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    }
  };

  const screenWidth = cluster.width * scale;
  const screenHeight = cluster.height * scale;

  return (
    <div 
      className={`absolute rounded-xl border-2 border-dashed flex flex-col items-start p-2 transition-all duration-300 group ${cluster.color}`}
      style={{
        transform: `translate(${screenX}px, ${screenY}px)`,
        width: screenWidth,
        height: screenHeight,
        zIndex: 1
      }}
    >
      {/* Title Section */}
      <div 
        className="absolute left-4 bg-white/95 backdrop-blur px-3 py-1.5 rounded-full shadow-sm border border-gray-200 flex items-center gap-2 z-10 hover:shadow-md transition-shadow"
        style={{ top: -16 * scale }}
        onMouseDown={e => e.stopPropagation()}
      >
        {isEditing ? (
          <div className="flex items-center gap-1">
            <input 
              autoFocus
              className="text-xs font-bold text-gray-700 bg-transparent outline-none min-w-[120px]"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={handleKeyDown}
              placeholder="Cluster Name"
            />
            <button onClick={handleTitleSubmit} className="text-green-600 hover:bg-green-50 rounded-full p-0.5">
              <Check size={12} />
            </button>
          </div>
        ) : (
          <div 
            className="flex items-center gap-2 cursor-pointer group/title"
            onDoubleClick={() => setIsEditing(true)}
          >
            <span className="text-xs font-bold text-gray-600 select-none max-w-[200px] truncate">
              {cluster.title}
            </span>
            <Edit2 
              size={10} 
              className="text-gray-400 opacity-0 group-hover/title:opacity-100 transition-opacity" 
              onClick={() => setIsEditing(true)}
            />
          </div>
        )}
      </div>

      {/* Color Picker & Delete (Visible on hover) */}
      <div 
        className="absolute right-4 bg-white/95 backdrop-blur px-2 py-1.5 rounded-full shadow-sm border border-gray-200 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        style={{ top: -16 * scale }}
        onMouseDown={e => e.stopPropagation()}
      >
        {CLUSTER_PRESETS.map((preset) => (
          <button
            key={preset.name}
            onClick={() => onUpdate(cluster.id, { color: preset.class })}
            className={`w-3 h-3 rounded-full border border-gray-300 ${preset.dotColor} hover:scale-125 hover:border-gray-400 transition-all ${cluster.color === preset.class ? 'ring-2 ring-gray-400 scale-110' : ''}`}
            title={preset.name}
          />
        ))}
        <div className="w-px h-3 bg-gray-300 mx-0.5" />
        <button
          onClick={() => onDelete(cluster.id)}
          className="w-4 h-4 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          title="Delete cluster (notes will remain)"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
};

export default ClusterGroup;
