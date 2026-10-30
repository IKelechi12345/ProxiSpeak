import React, { useState } from 'react';
import { X, Layers, Plus, Trash2, Save, Check } from 'lucide-react';
import { useOfficeStore } from '../../stores/officeStore';
import { api } from '../../services/api';
import { FurnitureItem, Obstacle, FurnitureType, ObstacleType } from '@proxispeak/shared';

interface LayoutEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LayoutEditorModal: React.FC<LayoutEditorModalProps> = ({ isOpen, onClose }) => {
  const { currentOffice, updateLayout } = useOfficeStore();

  const [furniture, setFurniture] = useState<FurnitureItem[]>(
    currentOffice?.layout?.furniture || []
  );
  const [obstacles, setObstacles] = useState<Obstacle[]>(
    currentOffice?.layout?.obstacles || []
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen || !currentOffice) return null;

  const handleAddFurniture = (type: FurnitureType) => {
    const newItem: FurnitureItem = {
      id: `item-${Date.now()}`,
      type,
      x: 700 + Math.floor(Math.random() * 200 - 100),
      y: 500 + Math.floor(Math.random() * 200 - 100),
      width: type === 'meeting_table' ? 240 : type === 'couch' ? 150 : 120,
      height: type === 'meeting_table' ? 100 : type === 'couch' ? 60 : 60,
      label: `New ${type}`,
    };
    setFurniture([...furniture, newItem]);
  };

  const handleAddObstacle = (type: ObstacleType) => {
    const newObs: Obstacle = {
      id: `obs-${Date.now()}`,
      type,
      x: 750 + Math.floor(Math.random() * 100),
      y: 400 + Math.floor(Math.random() * 100),
      width: type === 'wall' ? 180 : 140,
      height: 16,
      attenuationFactor: type === 'wall' ? 1.0 : 0.65,
      label: type === 'wall' ? 'Soundproof Wall' : 'Acoustic Glass Divider',
    };
    setObstacles([...obstacles, newObs]);
  };

  const handleRemoveFurniture = (id: string) => {
    setFurniture(furniture.filter((f) => f.id !== id));
  };

  const handleRemoveObstacle = (id: string) => {
    setObstacles(obstacles.filter((o) => o.id !== id));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await api.put(`/api/offices/${currentOffice._id}`, {
        layout: {
          ...currentOffice.layout,
          furniture,
          obstacles,
        },
      });
      updateLayout(furniture, obstacles);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save office layout', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="glass-panel w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-700 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Office Layout & Sound Barrier Editor</h2>
              <p className="text-xs text-slate-400">Configure furniture and soundproof acoustic walls</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Quick Add Palette */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Add Office Assets</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => handleAddFurniture('desk')}
                className="p-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-700 text-xs font-medium text-slate-200 flex items-center justify-center space-x-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-sky-400" />
                <span>+ Workstation</span>
              </button>
              <button
                onClick={() => handleAddFurniture('meeting_table')}
                className="p-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-700 text-xs font-medium text-slate-200 flex items-center justify-center space-x-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-sky-400" />
                <span>+ Meeting Table</span>
              </button>
              <button
                onClick={() => handleAddObstacle('wall')}
                className="p-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl border border-rose-500/30 text-xs font-medium text-rose-300 flex items-center justify-center space-x-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-rose-400" />
                <span>+ Soundproof Wall</span>
              </button>
              <button
                onClick={() => handleAddObstacle('glass_partition')}
                className="p-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl border border-sky-500/30 text-xs font-medium text-sky-300 flex items-center justify-center space-x-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-sky-400" />
                <span>+ Acoustic Glass</span>
              </button>
            </div>
          </div>

          {/* Obstacles List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Acoustic Barriers & Walls ({obstacles.length})
              </h4>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {obstacles.map((obs) => (
                <div
                  key={obs.id}
                  className="px-3 py-2 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        obs.attenuationFactor >= 0.9 ? 'bg-rose-400' : 'bg-sky-400'
                      }`}
                    />
                    <span className="font-semibold text-slate-200">{obs.label || obs.type}</span>
                    <span className="text-[10px] text-slate-400">
                      ({obs.x}, {obs.y}) • {Math.round(obs.attenuationFactor * 100)}% sound block
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveObstacle(obs.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Furniture List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Furniture Items ({furniture.length})
              </h4>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {furniture.slice(0, 15).map((f) => (
                <div
                  key={f.id}
                  className="px-3 py-2 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-2">
                    <span className="capitalize font-medium text-slate-300">{f.label || f.type}</span>
                    <span className="text-[10px] text-slate-500">
                      pos: ({f.x}, {f.y})
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveFurniture(f.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {furniture.length > 15 && (
                <div className="text-[11px] text-slate-500 text-center py-1">
                  + {furniture.length - 15} more items configured
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {saveSuccess && (
              <span className="text-emerald-400 flex items-center space-x-1 font-semibold">
                <Check className="w-4 h-4" />
                <span>Layout saved & synced to MongoDB!</span>
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save to MongoDB'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
