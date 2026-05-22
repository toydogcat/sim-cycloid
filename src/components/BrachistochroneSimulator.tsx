/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, AlertCircle, Info, HelpCircle } from 'lucide-react';
import { BrachPathType, PathData, PhysicsParams } from '../types';

// Curve definition for presentation
const PATH_CONFIGS = [
  { id: 'brachistochrone' as BrachPathType, name: '最速降線 (Brachistochrone)', color: '#38bdf8', desc: '最速落體曲線。旋輪線的一種，物理學中最優路徑。' },
  { id: 'broken' as BrachPathType, name: '雙折極速線 (Double Linear)', color: '#34d399', desc: '陡降 95% 高度再橫向滑行，模擬「劇烈俯衝」加速效果。' },
  { id: 'arc' as BrachPathType, name: '圓弧線 (Circular Arc)', color: '#a78bfa', desc: '以定圓圓弧貼合起終點，初始坡度平緩，中段均勻加速。' },
  { id: 'parabola' as BrachPathType, name: '二次拋物線 (Parabola)', color: '#f43f5e', desc: '標準凹形二次函數軌跡，後段加速更陡峭。' },
  { id: 'linear' as BrachPathType, name: '斜直線 (Straight Line)', color: '#fb923c', desc: '起終點的最短幾何路徑，但初始加速度較慢，總時長最大。' }
];

export default function BrachistochroneSimulator() {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  // Grid/Canvas bounds
  const canvasWidth = 720;
  const canvasHeight = 380;

  // Drag states
  const [startPt, setStartPt] = useState({ x: 80, y: 50 });
  const [endPt, setEndPt] = useState({ x: 620, y: 310 });
  const [activeDrag, setActiveDrag] = useState<'start' | 'end' | null>(null);

  // Physics parameters state
  const [physics, setPhysics] = useState<PhysicsParams>({
    g: 9.8,
    drag: 0.15, // Air resistance coefficient
    beadSize: 10,
    speedFactor: 1.0
  });

  // Simulation run state
  const [simTime, setSimTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [completionTimes, setCompletionTimes] = useState<Record<string, number | null>>({});

  // Computed paths data
  const [paths, setPaths] = useState<PathData[]>([]);

  // Pixel scaling constant: 280 pixels represent 1 meter in physical space
  const screenScale = 280;

  // Drag bounds constraint relative to container
  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    if (!activeDrag) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    
    // Support touch coordinates as well
    let clientX = 0;
    let clientY = 0;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const mouseX = Math.round(((clientX - rect.left) / rect.width) * canvasWidth);
    const mouseY = Math.round(((clientY - rect.top) / rect.height) * canvasHeight);

    // Apply strict bounds and distance constraints
    if (activeDrag === 'start') {
      const xClamped = Math.max(30, Math.min(endPt.x - 120, mouseX));
      const yClamped = Math.max(20, Math.min(endPt.y - 80, mouseY));
      setStartPt({ x: xClamped, y: yClamped });
      resetSimulation();
    } else if (activeDrag === 'end') {
      const xClamped = Math.max(startPt.x + 120, Math.min(canvasWidth - 30, mouseX));
      const yClamped = Math.max(startPt.y + 80, Math.min(canvasHeight - 20, mouseY));
      setEndPt({ x: xClamped, y: yClamped });
      resetSimulation();
    }
  };

  const handleDragEnd = () => {
    setActiveDrag(null);
  };

  // Solve transcendental equation for cycloid (Brachistochrone)
  const solveCycloidTheta = (r: number): number => {
    let low = 0.0001;
    let high = 2 * Math.PI;
    // Special check if r is extremely small or large to avoid edge breakdown
    for (let i = 0; i < 60; i++) {
      const mid = (low + high) / 2;
      const v = (1 - Math.cos(mid)) / (mid - Math.sin(mid));
      if (v > r) {
        low = mid;
      } else {
        high = mid;
      }
    }
    return (low + high) / 2;
  };

  // Pre-generate all curves and run physics integration for each
  const regeneratePaths = () => {
    const N = 250; // Integration Steps
    const dx = endPt.x - startPt.x;
    const dy = endPt.y - startPt.y; // Positive dy represents going downward

    const calculated: PathData[] = PATH_CONFIGS.map(({ id, name, color }) => {
      const pts: { x: number; y: number }[] = [];

      switch (id) {
        case 'linear': {
          // Linear line
          for (let i = 0; i < N; i++) {
            const u = i / (N - 1);
            pts.push({
              x: startPt.x + u * dx,
              y: startPt.y + u * dy
            });
          }
          break;
        }

        case 'parabola': {
          // Concave parabola curve: y = H * (x / W)^2
          for (let i = 0; i < N; i++) {
            const u = i / (N - 1);
            pts.push({
              x: startPt.x + u * dx,
              y: startPt.y + Math.pow(u, 2) * dy
            });
          }
          break;
        }

        case 'arc': {
          // Circular Arc tangent to horizontal at start
          const Ry = (dx * dx + dy * dy) / (2 * dy);
          for (let i = 0; i < N; i++) {
            const u = i / (N - 1);
            const lx = u * dx;
            const ly = Ry - Math.sqrt(Math.max(0.001, Ry * Ry - lx * lx));
            pts.push({
              x: startPt.x + lx,
              y: startPt.y + ly
            });
          }
          break;
        }

        case 'broken': {
          // Fast drop split line (Drops 95% at 15% distance, then straight to end)
          const mx = dx * 0.15;
          const my = dy * 0.95;
          const splitIndex = Math.floor(N * 0.25); // Allocate 25% of point density to vertical dash
          
          for (let i = 0; i < N; i++) {
            if (i <= splitIndex) {
              const u = i / splitIndex;
              pts.push({
                x: startPt.x + u * mx,
                y: startPt.y + u * my
              });
            } else {
              const u = (i - splitIndex) / (N - 1 - splitIndex);
              pts.push({
                x: startPt.x + mx + u * (dx - mx),
                y: startPt.y + my + u * (dy - my)
              });
            }
          }
          break;
        }

        case 'brachistochrone': {
          // Solve transcendental equation for (theta_f)
          const targetRatio = dy / dx;
          const theta_f = solveCycloidTheta(targetRatio);

          const C = dx / (theta_f - Math.sin(theta_f));
          for (let i = 0; i < N; i++) {
            const u = i / (N - 1);
            const theta = u * theta_f;
            const lx = C * (theta - Math.sin(theta));
            const ly = C * (1 - Math.cos(theta));
            pts.push({
              x: startPt.x + lx,
              y: startPt.y + ly
            });
          }
          break;
        }
      }

      // Run Physics integration step-by-step
      const pxToM = 1 / screenScale;
      const speeds = new Array(N).fill(0);
      const times = new Array(N).fill(0);

      speeds[0] = 0.05; // Tiny initial boost
      times[0] = 0;

      for (let i = 0; i < N - 1; i++) {
        const p1 = pts[i];
        const p4 = pts[i + 1];

        // Convert coords into physical meters
        const segDx = (p4.x - p1.x) * pxToM;
        const segDy = (p4.y - p1.y) * pxToM; // Downwards is positive
        const ds = Math.sqrt(segDx * segDx + segDy * segDy);

        // Sin phi of slope incline
        const sinPhi = ds > 0 ? (segDy / ds) : 0;
        
        // Acceleration = gravity component - viscous drag damping
        const gAcc = physics.g * sinPhi;
        const currentV = speeds[i];
        const netAcc = gAcc - physics.drag * currentV;

        let nextV2 = currentV * currentV + 2 * netAcc * ds;
        if (nextV2 < 0.0001) nextV2 = 0.0001;
        const nextV = Math.sqrt(nextV2);
        speeds[i + 1] = nextV;

        const avgV = (currentV + nextV) / 2;
        const dt = ds / (avgV > 0.0001 ? avgV : 0.0001);
        times[i + 1] = times[i] + dt;
      }

      return {
        id,
        name,
        color,
        points: pts,
        times,
        speeds,
        arrivalTime: times[N - 1],
        isCompleted: false
      };
    });

    setPaths(calculated);
  };

  // Re-generate on endpoints or physics adjustments
  useEffect(() => {
    regeneratePaths();
  }, [startPt, endPt, physics.g, physics.drag]);

  // Simulation timer tick (Frame-rate bound)
  useEffect(() => {
    let lastTime = performance.now();

    const tick = (now: number) => {
      if (!isPlaying) {
        lastTime = now;
        animationRef.current = requestAnimationFrame(tick);
        return;
      }

      // Multiply dt by safety speed multiplier
      const elapsedSec = ((now - lastTime) / 1000) * physics.speedFactor;
      lastTime = now;

      setSimTime((prevTime) => {
        const nextTime = prevTime + elapsedSec;
        
        // Check completions for each path
        setPaths((prevPaths) => {
          let allFinished = true;
          const updated = prevPaths.map((p) => {
            if (nextTime >= p.arrivalTime) {
              if (!completionTimes[p.id]) {
                setCompletionTimes((prev) => ({ ...prev, [p.id]: p.arrivalTime }));
              }
              return { ...p, isCompleted: true };
            } else {
              allFinished = false;
              return p;
            }
          });

          if (allFinished) {
            setIsPlaying(false);
          }
          return updated;
        });

        return nextTime;
      });

      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, completionTimes, physics.speedFactor, paths]);

  const resetSimulation = () => {
    setIsPlaying(false);
    setSimTime(0);
    setCompletionTimes({});
    setPaths((prev) => prev.map((p) => ({ ...p, isCompleted: false })));
  };

  const getBeadPosition = (p: PathData) => {
    const N = p.points.length;
    // If finished, stick to destination
    if (simTime >= p.arrivalTime) {
      return p.points[N - 1];
    }
    // Binary search bounding segment for current simulation time
    let low = 0;
    let high = N - 1;
    while (low < high - 1) {
      const mid = Math.floor((low + high) / 2);
      if (p.times[mid] <= simTime) {
        low = mid;
      } else {
        high = mid;
      }
    }

    const t1 = p.times[low];
    const t2 = p.times[high];
    const pt1 = p.points[low];
    const pt2 = p.points[high];

    if (t2 === t1) return pt1;
    const ratio = (simTime - t1) / (t2 - t1);
    return {
      x: pt1.x + ratio * (pt2.x - pt1.x),
      y: pt1.y + ratio * (pt2.y - pt1.y)
    };
  };

  const getBeadSpeed = (p: PathData) => {
    if (simTime >= p.arrivalTime) {
      return p.speeds[p.speeds.length - 1];
    }
    if (simTime <= 0) return p.speeds[0];

    // Binary search Segment
    const N = p.speeds.length;
    let low = 0;
    let high = N - 1;
    while (low < high - 1) {
      const mid = Math.floor((low + high) / 2);
      if (p.times[mid] <= simTime) {
        low = mid;
      } else {
        high = mid;
      }
    }
    const t1 = p.times[low];
    const t2 = p.times[high];
    const r = (simTime - t1) / (t2 - t1);
    return p.speeds[low] + r * (p.speeds[high] - p.speeds[low]);
  };

  // Rank paths based on arrival time dynamically (Leaderboard)
  const sortedLeaderboard = [...paths].sort((a, b) => a.arrivalTime - b.arrivalTime);

  return (
    <div className="flex flex-col space-y-6" id="brachistochrone-simulator">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Physics Board container (cols 8 on large) */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <div className="relative bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800/60">
              <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5 select-none">
                <span className="w-2.5 h-2.5 bg-sky-500 rounded-full animate-ping" />
                最速降多路徑力學沙盒 (可點擊拖曳起終點調整軌跡)
              </span>
              <div className="text-xs font-mono text-cyan-400 font-semibold">
                模擬時間: <span className="text-sm text-white bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">{simTime.toFixed(3)}s</span>
              </div>
            </div>

            {/* Interactive SVG Board */}
            <div className="bg-slate-950 rounded-xl relative overflow-hidden select-none border border-slate-950">
              {/* Background instructions trigger */}
              <div className="absolute bottom-3 left-4 text-[10px] text-slate-500 font-mono tracking-wide flex items-center gap-1 bg-slate-950/80 px-2 py-0.5 rounded">
                <HelpCircle className="w-3 h-3 text-sky-400" />
                滑鼠拖曳兩側 <span className="text-amber-400">黃色核心點</span> 改變擺幅與跨距
              </div>

              <svg
                width="100%"
                viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
                className="w-full aspect-[72/38] block"
                onMouseMove={handleSvgMouseMove}
                onTouchMove={handleSvgMouseMove}
                onMouseUp={handleDragEnd}
                onTouchEnd={handleDragEnd}
              >
                {/* SVG Coordinate Gridlines */}
                <defs>
                  <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#101827" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#gridPattern)" />

                {/* Draw Curves Plotted */}
                {paths.map((p) => {
                  // Generate point path string
                  const pathStr = p.points
                    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`)
                    .join(' ');

                  return (
                    <path
                      key={p.id}
                      d={pathStr}
                      fill="none"
                      stroke={p.color}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-all duration-100"
                      opacity="0.85"
                    />
                  );
                })}

                {/* Draw Interactive Handles */}
                {/* Start handle */}
                <g
                  onMouseDown={() => setActiveDrag('start')}
                  onTouchStart={() => setActiveDrag('start')}
                  className="cursor-move group"
                >
                  <circle cx={startPt.x} cy={startPt.y} r="18" fill="rgba(245, 158, 11, 0.12)" />
                  <circle cx={startPt.x} cy={startPt.y} r="8" fill="#f59e0b" stroke="#fff" strokeWidth="1.5" className="group-hover:scale-110 transition-transform" />
                  <text x={startPt.x} y={startPt.y - 12} fill="#f59e0b" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">起點 (S)</text>
                </g>

                {/* End handle */}
                <g
                  onMouseDown={() => setActiveDrag('end')}
                  onTouchStart={() => setActiveDrag('end')}
                  className="cursor-move group"
                >
                  <circle cx={endPt.x} cy={endPt.y} r="18" fill="rgba(245, 158, 11, 0.12)" />
                  <circle cx={endPt.x} cy={endPt.y} r="8" fill="#f59e0b" stroke="#fff" strokeWidth="1.5" className="group-hover:scale-110 transition-transform" />
                  <text x={endPt.x} y={endPt.y + 20} fill="#f59e0b" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">終點 (E)</text>
                </g>

                {/* Render the rolling beads */}
                {paths.map((p) => {
                  const beadPos = getBeadPosition(p);
                  return (
                    <g key={`bead-${p.id}`} className="transition-all">
                      {/* Outer shadow glow */}
                      <circle cx={beadPos.x} cy={beadPos.y} r={physics.beadSize + 4} fill={p.color} opacity="0.2" />
                      {/* Core bead */}
                      <circle
                        cx={beadPos.x}
                        cy={beadPos.y}
                        r={physics.beadSize}
                        fill={p.color}
                        stroke="#030712"
                        strokeWidth="1.5"
                      />
                      {/* Stylized small reflection shine */}
                      <circle cx={beadPos.x - 3} cy={beadPos.y - 3} r="2.5" fill="#ffffff" opacity="0.7" />
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Quick playback strip */}
            <div className="mt-4 flex flex-col md:flex-row items-center gap-4 justify-between bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  id="btn-brach-play"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`flex-1 md:flex-none py-2 px-5 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition active:scale-95 duration-200 cursor-pointer ${
                    isPlaying
                      ? 'bg-amber-500 hover:bg-amber-600 text-amber-950'
                      : 'bg-cyan-500 hover:bg-cyan-600 text-slate-950 shadow-md shadow-cyan-900/10'
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4 fill-amber-950" /> 暫停模擬
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-slate-950" /> 釋放小球
                    </>
                  )}
                </button>

                <button
                  id="btn-brach-reset"
                  onClick={resetSimulation}
                  className="px-4 py-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs font-medium flex items-center gap-1.5 transition duration-200 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" /> 重置物理
                </button>
              </div>

              {/* Multipliers */}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">模擬步段倍率:</span>
                  <div className="bg-slate-950 border border-slate-800 px-1 py-0.5 rounded-lg flex gap-1">
                    {([0.25, 0.5, 1.0, 1.5] as const).map((factor) => (
                      <button
                        key={factor}
                        id={`speed-factor-${factor}`}
                        onClick={() => setPhysics((prev) => ({ ...prev, speedFactor: factor }))}
                        className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10px] transition ${
                          physics.speedFactor === factor
                            ? 'bg-cyan-500 text-slate-950'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {factor}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Paths details panel */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="text-xs text-amber-400 font-semibold flex items-center gap-1.5">
                <Info className="w-4 h-4 text-amber-400" />
                赫哲最速降線理理論 🧠
              </span>
              <p className="text-xs text-slate-400 leading-relaxed">
                這是約翰·伯努利於 1696 年提出挑戰全歐數學家的科學題目：一個質點在重力作用下，無摩擦地自高點滑到非垂直的低點，哪條軌跡耗時最短？
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                牛頓、萊布尼茲、洛必達等人皆求出正確解答為「最速降線」其幾何名為<strong>滾擺線（Cycloid）</strong>。因其起始坡度最陡以致小球<strong>「提前驟得最大速度」</strong>。
              </p>
            </div>
            
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/60 text-xs">
              <span className="text-sky-400 font-bold block mb-2 font-mono">🔍 科學常識：為什麼直線較慢？</span>
              <p className="text-slate-400 mb-2">
                雖然「兩點之間直線最近」，但斜直線上的加速度恆常不變：
                <span className="text-orange-400 font-mono block my-1 font-bold">a = g · sin(φ)</span>
                在旅程剛開始，小球因為高度沒跌多少，速度極低。最速降線則利用「先急劇下降，迅速獲取極高的初始速度」，在中後段路程雖然偏長，但憑藉極高速度迅速通過。
              </p>
            </div>
          </div>
        </div>

        {/* Side Tuning and Results dashboard Panel (cols 4 on large) */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          {/* Sliders adjustments */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-white font-medium text-sm flex items-center justify-between border-b border-slate-850 pb-2">
              <span>物理環境常規微調</span>
              <span className="text-xs text-slate-500 font-mono">Environment</span>
            </h3>

            {/* Gravity Slider */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">重力加速度 g (Gravity):</span>
                <span className="text-sky-400 font-bold font-mono">{physics.g} m/s²</span>
              </div>
              <input
                type="range"
                id="slider-g"
                min="1.0"
                max="24.0"
                step="0.2"
                value={physics.g}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setPhysics((prev) => ({ ...prev, g: val }));
                  resetSimulation();
                }}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>月球 (1.6)</span>
                <span>地球 (9.8)</span>
                <span>木星 (24.8)</span>
              </div>
            </div>

            {/* Air resistance Slider */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 text-xs">流體空氣阻力 β (Viscous Damping):</span>
                <span className="text-emerald-400 font-bold font-mono">{physics.drag.toFixed(2)} N.s/m</span>
              </div>
              <input
                type="range"
                id="slider-drag"
                min="0.0"
                max="0.8"
                step="0.02"
                value={physics.drag}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setPhysics((prev) => ({ ...prev, drag: val }));
                  resetSimulation();
                }}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
              <span className="text-[10px] text-slate-500 block leading-relaxed">
                阻力增加時，陡峭的軌跡會因為高速承受更大空氣阻抗，最優曲線會略微發生偏移。
              </span>
            </div>

            {/* Ball size Slider */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">小球視覺大小 (Bead Radius):</span>
                <span className="text-rose-400 font-bold font-mono">{physics.beadSize} px</span>
              </div>
              <input
                type="range"
                id="slider-beadSize"
                min="5"
                max="16"
                step="1"
                value={physics.beadSize}
                onChange={(e) => setPhysics((prev) => ({ ...prev, beadSize: parseInt(e.target.value) }))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-rose-400"
              />
            </div>
          </div>

          {/* Leaderboard panel / Live speed display */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-white font-medium text-sm flex items-center justify-between border-b border-slate-850 pb-2">
              <span>競速極限分析排行榜 (Leaderboard)</span>
              <span className="text-xs text-amber-500 font-bold">🏁 Live Rank</span>
            </h3>

            <div className="flex flex-col space-y-2.5">
              {sortedLeaderboard.map((p, index) => {
                const currentV = getBeadSpeed(p);
                const isWinner = index === 0;

                return (
                  <div
                    key={p.id}
                    className={`p-3 rounded-xl border flex flex-col justify-between transition relative overflow-hidden ${
                      isWinner
                        ? 'bg-sky-500/10 border-sky-400/50 shadow-md shadow-sky-950/20'
                        : 'bg-slate-950 border-slate-850'
                    }`}
                  >
                    {/* Top corner rank badge */}
                    <div className="flex items-center justify-between z-10">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                          isWinner ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {index + 1}
                        </span>
                        <span className="text-xs font-semibold text-slate-200">{p.name.split(' ')[0]}</span>
                      </div>

                      {/* Display final time */}
                      <span className="text-xs font-mono font-bold text-white bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                        抵達: {p.arrivalTime.toFixed(3)}s
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 font-mono z-10">
                      <span>當前速度: <strong className="text-white font-bold">{currentV.toFixed(2)} m/s</strong></span>
                      {simTime >= p.arrivalTime ? (
                        <span className="text-emerald-400 font-bold text-[10px] uppercase bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-900/30">已到達終點</span>
                      ) : (
                        <span>
                          進度: <strong className="text-slate-300">{(Math.min(100, (simTime / p.arrivalTime) * 100)).toFixed(0)}%</strong>
                        </span>
                      )}
                    </div>

                    {/* Progress track background glow */}
                    <div
                      className="absolute bottom-0 left-0 h-0.5 transition-all duration-300"
                      style={{
                        backgroundColor: p.color,
                        width: `${Math.min(100, (simTime / p.arrivalTime) * 100)}%`
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* CHARTS DATA ANALYSIS SECTION (Requested!) */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-2xl space-y-6">
        <div>
          <h2 className="text-white font-medium text-base mb-1">路徑實時科學數據分析 (Physics Graphing & Data Analysis)</h2>
          <p className="text-xs text-slate-400">以下圖表由系統將像素距離精密轉換成物理度量後求算實時結果產生。</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Chart 1: Arrival Time Differences (Horizontal Bar Chart) */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
              <span className="w-1.5 h-4 bg-sky-400 rounded-full" />
              航行總時間對比 (秒s，愈短愈優)
            </h3>

            <div className="space-y-3 pt-2">
              {paths.map((p) => {
                // Find maximum arrival time to scale bars
                const maxTime = Math.max(...paths.map((x) => x.arrivalTime), 1.0);
                const percent = (p.arrivalTime / maxTime) * 100;
                
                // Compare to Brachistochrone to calculate delay percent
                const brachTime = paths.find(x => x.id === 'brachistochrone')?.arrivalTime || 1;
                const delayedPercent = p.id !== 'brachistochrone' 
                  ? ((p.arrivalTime - brachTime) / brachTime * 100).toFixed(1)
                  : null;

                return (
                  <div key={`tc-${p.id}`} className="space-y-1">
                    <div className="flex justify-between text-xs items-center">
                      <span className="font-medium text-slate-300 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                        {p.name.split(' (')[0]}
                      </span>
                      <div className="flex items-center gap-2 font-mono">
                        {delayedPercent && (
                          <span className="text-[10px] text-rose-450 bg-rose-950/30 border border-rose-900/30 rounded px-1">
                            +{delayedPercent}% 耗時
                          </span>
                        )}
                        <span className="text-white font-bold">{p.arrivalTime.toFixed(3)}s</span>
                      </div>
                    </div>
                    {/* Bar track */}
                    <div className="h-4 bg-slate-950 rounded-lg overflow-hidden border border-slate-850 relative flex items-center">
                      <div
                        className="h-full rounded-r-md transition-all duration-500 ease-out"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: p.color,
                          opacity: 0.85
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart 2: Speed-Distance Profile Graph (Velocity over Distance, custom SVG!) */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
              <span className="w-1.5 h-4 bg-emerald-400 rounded-full" />
              速度-位置對應圖 ($v$-$x$ Profile — 揭示小球如何提速)
            </h3>

            {/* Custom SVG Line Graph */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 relative">
              {/* Graph metadata overlay */}
              <div className="absolute top-2 right-4 text-[10px] font-mono text-slate-500 flex gap-4">
                <span>X軸: 水平前進 (m)</span>
                <span>Y軸: 速率 (m/s)</span>
              </div>

              <div className="h-[175px] w-full">
                <svg className="w-full h-full overflow-visible">
                  {/* Grid Lines */}
                  {[0.25, 0.5, 0.75, 1.0].map((ratio) => (
                    <g key={`gl-${ratio}`}>
                      {/* Vertical Grid line */}
                      <line
                        x1={`${ratio * 100}%`}
                        y1="0%"
                        x2={`${ratio * 100}%`}
                        y2="85%"
                        stroke="#111827"
                        strokeWidth="1"
                        strokeDasharray="2,2"
                      />
                      {/* Horizontal Grid line */}
                      <line
                        x1="0%"
                        y1={`${ratio * 85}%`}
                        x2="100%"
                        y2={`${ratio * 85}%`}
                        stroke="#111827"
                        strokeWidth="1"
                        strokeDasharray="2,2"
                      />
                    </g>
                  ))}

                  {/* Draw Curves Plotted on Graph */}
                  {paths.map((p) => {
                    const N = p.points.length;
                    const maxV = Math.max(...paths.flatMap((x) => x.speeds), 12.0);
                    
                    const chartPoints = p.points.map((pt, idx) => {
                      // Normalize x coordinate relative to startPt/endPt range
                      const normX = (pt.x - startPt.x) / (endPt.x - startPt.x); // 0 to 1
                      const normV = p.speeds[idx] / maxV; // 0 to 1

                      const xPercent = normX * 100;
                      const yPercent = (1 - normV) * 85; // invert for SVG coord systems, leave 15% bottom gap

                      return `${xPercent}%,${yPercent}%`;
                    }).join(' ');

                    return (
                      <polyline
                        key={`line-${p.id}`}
                        points={chartPoints.replace(/%/g, '')}
                        fill="none"
                        stroke={p.color}
                        strokeWidth="2"
                        className="transition-all duration-300"
                        style={{ transform: 'scale(1, 1)' }} // placeholder override
                      />
                    );
                  })}

                  {/* Active sliding bead marker circles on velocity plot! */}
                  {paths.map((p) => {
                    const maxV = Math.max(...paths.flatMap((x) => x.speeds), 12.0);
                    const beadPos = getBeadPosition(p);
                    const currentV = getBeadSpeed(p);

                    const normX = (beadPos.x - startPt.x) / (endPt.x - startPt.x);
                    const normV = currentV / maxV;

                    const xCoord = `${normX * 100}%`;
                    const yCoord = `${(1 - normV) * 85}%`;

                    return (
                      <circle
                        key={`plot-bead-${p.id}`}
                        cx={xCoord}
                        cy={yCoord}
                        r="3.5"
                        fill={p.color}
                        stroke="#fff"
                        strokeWidth="1"
                        className="transition-all duration-75"
                      />
                    );
                  })}
                </svg>
              </div>

              {/* X Axis indicator */}
              <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-1 border-t border-slate-850 pt-1.5">
                <span>0.0 m (起點)</span>
                <span>{( (endPt.x - startPt.x) / screenScale ).toFixed(2)} m (終點)</span>
              </div>
            </div>
            
            <p className="text-[11px] text-slate-400 bg-slate-950/45 p-3 rounded-xl border border-slate-850 leading-relaxed">
              <span className="text-emerald-400 font-bold block mb-1 font-mono">💡 圖表觀察：最速降線的高能區</span>
              觀察到最頂部最速降線（天藍色）與雙折線（綠色）在最左側即<strong>形成陡峭的高聳拋起曲線</strong>，表示在滑行第一階段就快速取得巨幅速度，這在物理上稱為勢能（Mgh）對動能（0.5 Mv²）的「極效爆發釋放」，使得後續的滑行省下大把時間。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
