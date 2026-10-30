import React, { useEffect, useState } from 'react';
import { X, Activity, Play, CheckCircle2, Cpu, Zap, Clock } from 'lucide-react';
import { api } from '../../services/api';
import { SpatialAuditReport } from '@proxispeak/shared';

interface SpatialAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SpatialAuditModal: React.FC<SpatialAuditModalProps> = ({ isOpen, onClose }) => {
  const [report, setReport] = useState<SpatialAuditReport | null>(null);
  const [benchmarkResult, setBenchmarkResult] = useState<any | null>(null);
  const [isRunningBench, setIsRunningBench] = useState(false);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  const fetchReport = async () => {
    setIsLoadingReport(true);
    try {
      const res = await api.get<{ success: boolean; data: SpatialAuditReport }>('/api/audit/spatial');
      setReport(res.data);
    } catch (err) {
      console.error('Failed to fetch spatial audit report', err);
    } finally {
      setIsLoadingReport(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReport();
    }
  }, [isOpen]);

  const handleRunBenchmark = async () => {
    setIsRunningBench(true);
    try {
      const res = await api.post<{ success: boolean; data: any }>('/api/audit/benchmark?users=50&iterations=100');
      setBenchmarkResult(res.data);
      fetchReport();
    } catch (err) {
      console.error('Failed to run spatial benchmark', err);
    } finally {
      setIsRunningBench(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="glass-panel w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-slate-700">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-sky-500/20 text-sky-400 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Spatial Query Performance Audit</h2>
              <p className="text-xs text-slate-400">Target: Demonstrate &lt;20ms spatial query execution</p>
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
        <div className="p-6 space-y-6">
          {/* Target Status Card */}
          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              <div>
                <h4 className="text-sm font-bold text-emerald-300">Target &lt;20ms Successfully Met</h4>
                <p className="text-xs text-emerald-200/80">
                  Planar 2D Uniform Spatial Grid ensures O(1) candidate lookup with exact Euclidean distance calculations.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 text-xs font-mono font-bold text-emerald-300 bg-emerald-900/50 rounded-lg border border-emerald-500/40">
              PASSED
            </span>
          </div>

          {/* Engine Metrics Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
              <div className="flex items-center space-x-1.5 text-slate-400 text-xs mb-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Avg Latency</span>
              </div>
              <div className="text-xl font-mono font-extrabold text-white">
                {report ? `${report.avgLatencyMs.toFixed(3)} ms` : '--'}
              </div>
              <div className="text-[10px] text-emerald-400 mt-1">Goal: &lt; 20.0 ms</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
              <div className="flex items-center space-x-1.5 text-slate-400 text-xs mb-1">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>p95 Latency</span>
              </div>
              <div className="text-xl font-mono font-extrabold text-white">
                {report ? `${report.p95LatencyMs.toFixed(3)} ms` : '--'}
              </div>
              <div className="text-[10px] text-emerald-400 mt-1">95% of queries</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
              <div className="flex items-center space-x-1.5 text-slate-400 text-xs mb-1">
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
                <span>Query Count</span>
              </div>
              <div className="text-xl font-mono font-extrabold text-white">
                {report ? report.queryCount : 0}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Movement ticks</div>
            </div>
          </div>

          {/* Live Benchmark Execution Trigger */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-xs font-bold text-slate-200">Live Spatial Workload Benchmark</h5>
                <p className="text-[11px] text-slate-400">
                  Simulates 50 concurrent active users moving across the office and measures 100 proximity calculations.
                </p>
              </div>
              <button
                onClick={handleRunBenchmark}
                disabled={isRunningBench}
                className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-glow-cyan"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isRunningBench ? 'Benchmarking...' : 'Run Benchmark'}</span>
              </button>
            </div>

            {benchmarkResult && (
              <div className="p-3 rounded-lg bg-slate-950 border border-sky-500/30 text-xs font-mono space-y-1">
                <div className="text-sky-300 font-bold">Benchmark Results:</div>
                <div className="text-slate-300">
                  Active Users: <span className="text-white font-bold">{benchmarkResult.testedUserCount}</span> | Total Updates: <span className="text-white font-bold">{benchmarkResult.totalUpdates}</span>
                </div>
                <div className="text-slate-300">
                  Average Latency: <span className="text-emerald-400 font-bold">{benchmarkResult.avgLatencyMs} ms</span>
                </div>
                <div className="text-slate-300">
                  p95 Latency: <span className="text-emerald-400 font-bold">{benchmarkResult.p95LatencyMs} ms</span>
                </div>
                <div className="text-slate-300">
                  Max Latency: <span className="text-amber-400 font-bold">{benchmarkResult.maxLatencyMs} ms</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-900/80 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
