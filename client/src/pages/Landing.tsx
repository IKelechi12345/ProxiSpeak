import React from 'react';
import { Link } from 'react-router-dom';
import {
  Radio,
  Volume2,
  Users,
  Shield,
  Zap,
  ArrowRight,
  Layers,
  Sparkles,
  CheckCircle,
} from 'lucide-react';

export const Landing: React.FC = () => {
  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col overflow-x-hidden selection:bg-sky-500 selection:text-white">
      {/* Navbar */}
      <nav className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-emerald-400 flex items-center justify-center shadow-glow-cyan">
              <Radio className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-white">ProxiSpeak</span>
              <span className="text-[10px] text-sky-400 font-semibold block leading-none">Spatial Audio Ecosystem</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              to="/login"
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-glow-cyan transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 pt-20 pb-24 max-w-7xl mx-auto text-center flex flex-col items-center">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-r from-sky-500/15 via-indigo-500/10 to-emerald-500/15 blur-3xl rounded-full pointer-events-none" />

        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-700 text-sky-400 text-xs font-semibold mb-6 shadow-md">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Natural Proximity Voice Collaboration Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight max-w-4xl leading-tight">
          Communicate in Virtual Space{' '}
          <span className="bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
            Like in the Physical World
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
          No meeting links. No breakout rooms. Walk your avatar up to a coworker to start talking. Hear nearby colleagues fade in, sense stereo direction, and step into glass conference rooms to muffle outside chatter.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/register"
            className="px-7 py-3.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white rounded-2xl text-sm font-bold shadow-glow-cyan flex items-center space-x-2 transition-all transform hover:-translate-y-0.5"
          >
            <span>Launch Virtual Office</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/login"
            className="px-7 py-3.5 glass-panel hover:bg-slate-800 text-slate-200 rounded-2xl text-sm font-semibold transition-all border border-slate-700"
          >
            Sign In with Demo
          </Link>
        </div>
      </section>

      {/* Feature Breakdown Grid */}
      <section className="px-6 py-16 max-w-7xl mx-auto w-full">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-white">Engineered for High-Fidelity Spatial Immersion</h2>
          <p className="text-xs text-slate-400 mt-1">Full-stack real-time architecture built on WebRTC, Web Audio API, and MongoDB 2D Indexing</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Volume2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Dynamic Distance Attenuation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Volume smoothly drops with Euclidean distance. At 0px gain is 100%, at 50px gain is 50%, and at 100px voice seamlessly attenuates with gain ramps to prevent clicks.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Radio className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">2D Stereo Panning</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Using the Web Audio StereoPannerNode, peers to your left sound in your left ear and peers to your right sound in your right ear, creating true spatial awareness.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Acoustic Sound Blocking</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Geometric line-of-sight algorithms check for intersecting walls and glass partitions, realistically dampening or completely blocking audio between rooms.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 py-8 text-center text-xs text-slate-500">
        <p>ProxiSpeak – Geospatial Proximity Audio Ecosystem. Production-Ready Full-Stack MERN Architecture.</p>
      </footer>
    </div>
  );
};
