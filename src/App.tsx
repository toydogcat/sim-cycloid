/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Activity, Disc, Info, GraduationCap, Github, Waves, Triangle, Compass } from 'lucide-react';
import BrachistochroneSimulator from './components/BrachistochroneSimulator';
import CycloidsExplorer from './components/CycloidsExplorer';
import LissajousExplorer from './components/LissajousExplorer';
import FractalsExplorer from './components/FractalsExplorer';
import ClassicCurvesExplorer from './components/ClassicCurvesExplorer';

declare global {
  interface Window {
    vercount?: {
      fetch: () => void;
    };
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'brachistochrone' | 'cycloids' | 'lissajous' | 'fractals' | 'classic'>('brachistochrone');

  React.useEffect(() => {
    if (window.vercount && typeof window.vercount.fetch === 'function') {
      window.vercount.fetch();
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Elegantly Proportioned Top Navigation Bar */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 shadow-md shadow-cyan-900/30">
              <Activity className="w-5.5 h-5.5 text-white animate-pulse" />
              <div className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition duration-300" />
            </div>
            <div>
              <h1 id="app-title" className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                擺線與最速降線模擬器
              </h1>
              <p className="text-[10px] sm:text-xs text-slate-400 font-mono tracking-wide">
                Cycloid & Brachistochrone Interactive Simulator
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[10px] sm:text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg font-medium shadow-inner flex items-center gap-1.5 select-none">
              <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
              互動科學教具
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Concept Introduction banner */}
        <div className="bg-gradient-to-r from-slate-900/80 to-slate-900/30 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row gap-6 items-center justify-between">
          <div className="space-y-2 max-w-2xl text-center md:text-left">
            <h2 className="text-white text-lg font-bold flex items-center justify-center md:justify-start gap-1.5">
              歡迎來到幾何與力學探索空間 🌐
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-sans">
              擺線（Cycloid）是人類科學史上「最著名」的曲線之一。它身兼<strong>最速降線（Brachistochrone）</strong>與<strong>等時降線（Tautochrone）</strong>的完美物理屬性，同時也是編織多種美麗對稱幾何輪廓軌跡的源頭。
            </p>
          </div>
          
          <div className="h-px w-full md:w-px md:h-12 bg-slate-800" />

          {/* Interactive tab controllers */}
          <div className="flex flex-wrap sm:flex-nowrap bg-slate-950 p-1.5 rounded-xl border border-slate-850 gap-1 shadow-inner self-stretch md:self-auto justify-center">
            <button
              id="tab-brachistochrone"
              onClick={() => setActiveTab('brachistochrone')}
              className={`flex items-center gap-1.5 px-4.5 py-2.5 rounded-lg text-xs font-medium tracking-wide transition duration-200 cursor-pointer ${
                activeTab === 'brachistochrone'
                  ? 'bg-slate-900 text-cyan-400 border border-slate-800 shadow-md font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <Activity className="w-4 h-4" />
              最速降線重力模擬
            </button>
            <button
              id="tab-cycloids"
              onClick={() => setActiveTab('cycloids')}
              className={`flex items-center gap-1.5 px-4.5 py-2.5 rounded-lg text-xs font-medium tracking-wide transition duration-200 cursor-pointer ${
                activeTab === 'cycloids'
                  ? 'bg-slate-900 text-cyan-400 border border-slate-800 shadow-md font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <Disc className="w-4 h-4" />
              各種多樣擺線探索
            </button>
            <button
              id="tab-lissajous"
              onClick={() => setActiveTab('lissajous')}
              className={`flex items-center gap-1.5 px-4.5 py-2.5 rounded-lg text-xs font-medium tracking-wide transition duration-200 cursor-pointer ${
                activeTab === 'lissajous'
                  ? 'bg-slate-900 text-cyan-400 border border-slate-800 shadow-md font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <Waves className="w-4 h-4" />
              利薩茹諧振曲線
            </button>
            <button
              id="tab-fractals"
              onClick={() => setActiveTab('fractals')}
              className={`flex items-center gap-1.5 px-4.5 py-2.5 rounded-lg text-xs font-medium tracking-wide transition duration-200 cursor-pointer ${
                activeTab === 'fractals'
                  ? 'bg-slate-900 text-cyan-400 border border-slate-800 shadow-md font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <Triangle className="w-4 h-4" />
              無限碎形與極限自相似
            </button>
            <button
              id="tab-classic"
              onClick={() => setActiveTab('classic')}
              className={`flex items-center gap-1.5 px-4.5 py-2.5 rounded-lg text-xs font-medium tracking-wide transition duration-200 cursor-pointer ${
                activeTab === 'classic'
                  ? 'bg-slate-900 text-cyan-400 border border-slate-800 shadow-md font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <Compass className="w-4 h-4" />
              更多經典極坐標曲線
            </button>
          </div>
        </div>

        {/* Dynamic Display Area based on tabs state */}
        <div className="transition-all duration-300">
          {activeTab === 'brachistochrone' ? (
            <BrachistochroneSimulator />
          ) : activeTab === 'cycloids' ? (
            <CycloidsExplorer />
          ) : activeTab === 'lissajous' ? (
            <LissajousExplorer />
          ) : activeTab === 'fractals' ? (
            <FractalsExplorer />
          ) : (
            <ClassicCurvesExplorer />
          )}
        </div>

      </main>

      {/* Modern, Clean Scientific Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/40 mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 font-mono gap-4">
          <div className="text-center md:text-left space-y-1">
            <p>© 2026 互動幾何學與古典力學探索套件 / 物理模擬器</p>
            <p className="text-[10px]">基於常規拉格朗日運動方程式與物理有限元前向歐拉法求解</p>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex gap-4">
              <span className="hover:text-slate-400 select-none">等時性 (Tautochrone)</span>
              <span>•</span>
              <span className="hover:text-slate-400 select-none">外輪線 (Epitrochoid)</span>
              <span>•</span>
              <span className="hover:text-slate-400 select-none">內輪線 (Hypotrochoid)</span>
              <span>•</span>
              <span className="hover:text-slate-400 select-none">利薩茹 (Lissajous)</span>
              <span>•</span>
              <span className="hover:text-slate-400 select-none">自相似碎形 (Fractals)</span>
            </div>
            <div className="flex items-center gap-3 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-800/50">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Views</span>
                <span id="vercount_value_site_pv" className="text-cyan-400 font-mono font-bold tracking-widest min-w-[20px] text-center">--</span>
              </div>
              <div className="h-3 w-px bg-slate-800" />
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Visitors</span>
                <span id="vercount_value_site_uv" className="text-indigo-400 font-mono font-bold tracking-widest min-w-[20px] text-center">--</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
