import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { api } from '../services/api';
import {
  Radio,
  Plus,
  Users,
  DoorOpen,
  LogOut,
  Sparkles,
  Layers,
  Shield,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { Office } from '@proxispeak/shared';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [offices, setOffices] = useState<Office[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newOfficeName, setNewOfficeName] = useState('');
  const [newOfficeDesc, setNewOfficeDesc] = useState('');
  const [newOfficeMaxUsers, setNewOfficeMaxUsers] = useState(50);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchOffices = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: Office[] }>('/api/offices');
      setOffices(res.data);
    } catch (err) {
      console.error('Failed to fetch offices', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOffices();
  }, []);

  const handleCreateOffice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfficeName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await api.post<{ success: boolean; data: Office }>('/api/offices', {
        name: newOfficeName.trim(),
        description: newOfficeDesc.trim(),
        maxUsers: newOfficeMaxUsers,
      });

      setIsCreateOpen(false);
      setNewOfficeName('');
      setNewOfficeDesc('');
      navigate(`/office/${res.data._id}`);
    } catch (err) {
      console.error('Failed to create office', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSeedDefault = async () => {
    try {
      await api.post('/api/offices/seed-default');
      fetchOffices();
    } catch (err) {
      console.error('Seed error', err);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-emerald-400 flex items-center justify-center shadow-glow-cyan">
              <Radio className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-white">ProxiSpeak</span>
              <span className="text-[10px] text-sky-400 font-semibold block leading-none">Spatial Audio Ecosystem</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* User Profile Pill */}
            <div className="flex items-center space-x-2.5 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-white truncate max-w-[130px]">{user?.username}</div>
                <div className="text-[10px] text-slate-400">Online</div>
              </div>
            </div>

            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
        {/* Welcome Hero Banner */}
        <div className="relative rounded-3xl p-8 bg-gradient-to-r from-sky-950/60 via-slate-900 to-emerald-950/40 border border-slate-800 overflow-hidden shadow-2xl">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Real-Time WebRTC Spatial Voice Engine</span>
            </div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              Welcome, {user?.username}
            </h2>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              Step into high-fidelity 2D virtual workspaces. Move your avatar naturally using WASD to hear colleagues dynamically with real distance attenuation, stereo panning, and acoustic wall muffling.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsCreateOpen(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-glow-cyan flex items-center space-x-2 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Office</span>
              </button>
              {offices.length === 0 && (
                <button
                  onClick={handleSeedDefault}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
                >
                  Seed Demo Campus
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Office Selection Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Active Virtual Workspaces</h3>
              <p className="text-xs text-slate-400">Join a space to start collaborating with spatial voice</p>
            </div>
            <span className="text-xs font-mono font-medium text-slate-400">
              {offices.length} {offices.length === 1 ? 'Workspace' : 'Workspaces'} Available
            </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-56 glass-panel rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : offices.length === 0 ? (
            <div className="text-center py-16 glass-panel rounded-2xl border border-slate-800">
              <DoorOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h4 className="text-base font-bold text-white">No Virtual Offices Available</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Create your first enterprise workspace or seed the default campus to get started.
              </p>
              <button
                onClick={handleSeedDefault}
                className="mt-4 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-glow-cyan"
              >
                Seed Default Office
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {offices.map((office) => {
                const activeCount = office.activeUsersCount || 0;
                const furnitureCount = office.layout?.furniture?.length || 0;
                const obstacleCount = office.layout?.obstacles?.length || 0;

                return (
                  <div
                    key={office._id}
                    className="glass-panel glass-panel-hover rounded-2xl p-5 border border-slate-800 flex flex-col justify-between transition-all group"
                  >
                    <div>
                      {/* Top Meta */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>{activeCount} active user{activeCount !== 1 ? 's' : ''}</span>
                        </span>
                        <span className="text-[11px] text-slate-500">Max: {office.maxUsers}</span>
                      </div>

                      <h4 className="text-base font-bold text-white group-hover:text-sky-300 transition-colors">
                        {office.name}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">
                        {office.description || 'Virtual office workspace with proximity-based voice chat.'}
                      </p>

                      {/* Floor Layout Stats */}
                      <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                        <div className="flex items-center space-x-1.5">
                          <Layers className="w-3.5 h-3.5 text-purple-400" />
                          <span>{furnitureCount} Furniture items</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <Shield className="w-3.5 h-3.5 text-rose-400" />
                          <span>{obstacleCount} Acoustic walls</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5">
                      <button
                        onClick={() => navigate(`/office/${office._id}`)}
                        className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-glow-cyan"
                      >
                        <DoorOpen className="w-4 h-4" />
                        <span>Enter Workspace</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Create Office Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-slate-700 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Create Virtual Office</h3>
            <p className="text-xs text-slate-400 mb-5">Set up a real-time collaborative workspace</p>

            <form onSubmit={handleCreateOffice} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Office Name</label>
                <input
                  type="text"
                  required
                  value={newOfficeName}
                  onChange={(e) => setNewOfficeName(e.target.value)}
                  placeholder="e.g. Design & Research Hub"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Description (optional)</label>
                <textarea
                  value={newOfficeDesc}
                  onChange={(e) => setNewOfficeDesc(e.target.value)}
                  placeholder="Brief summary of this office environment..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1.5">
                  <span>Capacity Limit</span>
                  <span className="font-mono text-sky-400">{newOfficeMaxUsers} Users</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={newOfficeMaxUsers}
                  onChange={(e) => setNewOfficeMaxUsers(parseInt(e.target.value, 10))}
                  className="w-full accent-sky-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition-colors shadow-glow-cyan disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
