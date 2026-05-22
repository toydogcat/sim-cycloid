/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Info, Settings, Eye, HelpCircle, Download } from 'lucide-react';
import { CycloidType, CycloidParams } from '../types';

interface Preset {
  name: string;
  type: CycloidType;
  R: number;
  r: number;
  d: number;
  maxTurns: number;
  description: string;
}

const PRESETS: Preset[] = [
  {
    name: '心臟線 (Cardioid)',
    type: 'epicycloid',
    R: 80,
    r: 80,
    d: 80,
    maxTurns: 1,
    description: '外擺線的一種。當定圓與動圓半徑相等時，動圓圓周上一點劃出的軌跡，形如心臟。',
  },
  {
    name: '腎形線 (Nephroid)',
    type: 'epicycloid',
    R: 120,
    r: 60,
    d: 60,
    maxTurns: 1,
    description: '外擺線的一種。定圓半徑是動圓兩倍，軌跡狀如腎臟。',
  },
  {
    name: '三角葉線 (Deltoid)',
    type: 'hypocycloid',
    R: 150,
    r: 50,
    d: 50,
    maxTurns: 1,
    description: '內擺線的一種。定圓半徑是動圓三倍，形如光滑的三角形。',
  },
  {
    name: '星形線 (Astroid)',
    type: 'hypocycloid',
    R: 160,
    r: 40,
    d: 40,
    maxTurns: 1,
    description: '內擺線的一種。定圓半徑是動圓四倍，具有四個尖點的星形軌跡。',
  },
  {
    name: '卡丹直線 (Copernican Line)',
    type: 'hypocycloid',
    R: 160,
    r: 80,
    d: 80,
    maxTurns: 1,
    description: '著名的卡丹齒輪（Tusi couple）定理。內滾圓直徑等於外圓半徑時，圓周點軌跡是一條直徑線段。',
  },
  {
    name: '標準平地旋輪線 (Cycloid)',
    type: 'cycloid',
    R: 0,
    r: 35,
    d: 35,
    maxTurns: 4,
    description: '最經典的滾擺線，圓形在平地上無滑動滾動時，圓周上一點在空間中劃出的拱形軌跡。',
  },
  {
    name: '蝴蝶形套外擺線 (Butterfly)',
    type: 'epitrochoid',
    R: 90,
    r: 60,
    d: 110,
    maxTurns: 2,
    description: '外延擺線。當筆尖距離動圓中心大於其半徑時，描繪出的軌跡會相互交叉，形成蝶翼般的環圈。',
  },
  {
    name: '星環套內擺線 (Galaxy Rings)',
    type: 'hypotrochoid',
    R: 140,
    r: 40,
    d: 85,
    maxTurns: 2,
    description: '內延擺線。當筆尖長度變長時（d > r），在四角星內穿梭編織出對稱的花瓣對角環線。',
  }
];

export default function CycloidsExplorer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  const downloadCanvasImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `cycloid_design_${params.type}_R${params.R}_r${params.r}_d${params.d}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const [params, setParams] = useState<CycloidParams>({
    type: 'epicycloid',
    R: 100,
    r: 50,
    d: 50,
    speed: 4,
    showCircles: true,
    showRulers: true,
    colorScheme: 'rainbow',
    maxTurns: 3,
  });

  const [theta, setTheta] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [trail, setTrail] = useState<{ x: number; y: number; theta: number }[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('心臟線 (Cardioid)');

  // Synchronization ref to avoid stale state in the animation loop
  const paramsRef = useRef<CycloidParams>(params);
  const thetaRef = useRef<number>(theta);
  const trailRef = useRef<{ x: number; y: number; theta: number }[]>(trail);

  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  useEffect(() => {
    thetaRef.current = theta;
  }, [theta]);

  useEffect(() => {
    trailRef.current = trail;
  }, [trail]);

  // Handle preset application
  const applyPreset = (preset: Preset) => {
    setSelectedPreset(preset.name);
    setParams((prev) => ({
      ...prev,
      type: preset.type,
      R: preset.R,
      r: preset.r,
      d: preset.d,
      maxTurns: preset.maxTurns,
    }));
    // Reset simulation
    setTheta(0);
    setTrail([]);
  };

  // Run initial preset once
  useEffect(() => {
    applyPreset(PRESETS[0]);
  }, []);

  // Compute parametric point based on theta
  const getCoordinates = (tVal: number, currentParams: CycloidParams) => {
    const { type, R, r, d } = currentParams;
    let x = 0;
    let y = 0;
    let xc = 0;
    let yc = 0;

    switch (type) {
      case 'cycloid':
        // Rolling on linear baseline
        xc = r * tVal;
        yc = r;
        x = r * tVal - d * Math.sin(tVal);
        y = r - d * Math.cos(tVal);
        break;

      case 'epicycloid':
      case 'epitrochoid': {
        // Rolling outside fixed circle
        const ratio = R / r;
        xc = (R + r) * Math.cos(tVal);
        yc = (R + r) * Math.sin(tVal);
        // Note standard epitrochoid parametric
        // x = (R+r)cos(t) - d*cos(t + R/r t) = (R+r)cos(t) - d*cos((R+r)/r t)
        x = (R + r) * Math.cos(tVal) - d * Math.cos((1 + ratio) * tVal);
        y = (R + r) * Math.sin(tVal) - d * Math.sin((1 + ratio) * tVal);
        break;
      }

      case 'hypocycloid':
      case 'hypotrochoid': {
        // Rolling inside fixed circle
        const ratio = R / r;
        xc = (R - r) * Math.cos(tVal);
        yc = (R - r) * Math.sin(tVal);
        x = (R - r) * Math.cos(tVal) + d * Math.cos((ratio - 1) * tVal);
        y = (R - r) * Math.sin(tVal) - d * Math.sin((ratio - 1) * tVal);
        break;
      }
    }

    return { x, y, xc, yc };
  };

  // Core animation update loop
  useEffect(() => {
    if (!isPlaying) return;

    let lastTime = performance.now();

    const update = (nowTime: number) => {
      const dt = Math.min(nowTime - lastTime, 32); // Clamp step to avoid jumps
      lastTime = nowTime;

      const currentParams = paramsRef.current;
      // Convert speed to angular step based on dt (base speed ~ 0.005 rad/ms)
      const angularStep = (currentParams.speed * 0.0035 * dt) / (currentParams.r / 30);
      const newTheta = thetaRef.current + angularStep;

      // Check max boundary (maxTurns of the rolling wheel)
      // Max angle: for epicycloids/hypocycloids, rolling circle revolves maxTurns times
      // Angle theta refers to fixed circle center angle, so we multiply by (r / R) etc.?
      // Standardly let's specify total radian length. For standard cycloid, theta is the roll angle.
      let limit = currentParams.maxTurns * 2 * Math.PI;
      if (currentParams.type !== 'cycloid') {
        // theta is fixed circle angle. It completes one orbit when theta = 2*PI.
        // During 1 orbit, rolling circle revolves R/r times.
        // We want the rolling circle to rotate around itself at least several cycles.
        // Let's set limit of fixed circle angle theta to (r/R) * 2*PI * maxTurns or just maxTurns * 2 * PI
        limit = currentParams.maxTurns * 2 * Math.PI;
      }

      if (newTheta >= limit) {
        // Loop back or hold
        setTheta(0);
        setTrail([]);
      } else {
        setTheta(newTheta);
        // Calculate points step-by-step between current and new theta to ensure continuous trail at high speed
        const newPoints: { x: number; y: number; theta: number }[] = [];
        const steps = Math.ceil(currentParams.speed);
        for (let i = 1; i <= steps; i++) {
          const tInterpolated = thetaRef.current + (newTheta - thetaRef.current) * (i / steps);
          const coords = getCoordinates(tInterpolated, currentParams);
          newPoints.push({ x: coords.x, y: coords.y, theta: tInterpolated });
        }

        setTrail((prev) => {
          const updated = [...prev, ...newPoints];
          // Limit trail length dynamically to support up to 100 turns (up to 150k points max)
          const maxAllowedPoints = Math.max(10000, currentParams.maxTurns * 1500);
          if (updated.length > maxAllowedPoints) {
            return updated.slice(updated.length - maxAllowedPoints);
          }
          return updated;
        });
      }

      animationRef.current = requestAnimationFrame(update);
    };

    animationRef.current = requestAnimationFrame(update);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  // Redraw hook
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const W = canvas.width;
    const H = canvas.height;
    const X_mid = W / 2;
    const Y_mid = H / 2;
    const Y_base = H / 2 + 60; // Baseline for flat cycloid
    const X_start = 50;

    // Draw grid background
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    const gridSize = 40;
    for (let x = 0; x < W; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Convert local system coordinates to canvas coordinates
    const toCanvas = (px: number, py: number) => {
      if (params.type === 'cycloid') {
        return {
          x: X_start + px,
          y: Y_base - py,
        };
      } else {
        return {
          x: X_mid + px,
          y: Y_mid - py,
        };
      }
    };

    // Draw flat cycloid flat baseline or fixed circles
    if (params.type === 'cycloid') {
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(X_start - 20, Y_base);
      ctx.lineTo(W - 20, Y_base);
      ctx.stroke();

      // Flat cycloid baseline grid rulers
      if (params.showRulers) {
        ctx.fillStyle = '#64748b';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        for (let i = 0; i <= 5; i++) {
          const xPos = X_start + i * params.r * Math.PI;
          if (xPos > W) break;
          ctx.beginPath();
          ctx.arc(xPos, Y_base, 3, 0, 2 * Math.PI);
          ctx.fill();
          ctx.fillText(`${i}πr`, xPos, Y_base + 16);
        }
      }
    } else {
      // Draw fixed circle
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(X_mid, Y_mid, params.R, 0, 2*Math.PI);
      ctx.stroke();
      ctx.setLineDash([]); // clear dash

      if (params.showRulers) {
        // Draw axes lines
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(10, Y_mid); ctx.lineTo(W - 10, Y_mid);
        ctx.moveTo(X_mid, 10); ctx.lineTo(X_mid, H - 10);
        ctx.stroke();

        // Label Origin and Radius
        ctx.fillStyle = '#475569';
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`O (0,0)`, X_mid + 6, Y_mid - 6);
        ctx.arc(X_mid, Y_mid, 2, 0, 2*Math.PI);
        ctx.fill();

        ctx.fillText(`R = ${params.R}`, X_mid + params.R + 6, Y_mid + 12);
      }
    }

    // Draw Traced Trail
    const currentTrail = trailRef.current;
    if (currentTrail.length > 1) {
      // Color Schemes details
      const getColorForScheme = (index: number, total: number, tVal: number) => {
        const ratio = index / total;
        switch (params.colorScheme) {
          case 'rainbow':
            return `hsla(${(tVal * 180 / Math.PI) % 360}, 90%, 60%, 0.85)`;
          case 'neon':
            // Magenta to Cyan gradient
            return `rgba(${Math.floor(255 - ratio * 155)}, ${Math.floor(20 + ratio * 200)}, 255, 0.85)`;
          case 'sunset':
            // Gold to Ruby
            return `rgba(255, ${Math.floor(200 - ratio * 160)}, ${Math.floor(20 + ratio * 80)}, 0.85)`;
          case 'emerald':
          default:
            return `rgba(16, 185, 129, ${0.4 + ratio * 0.6})`;
        }
      };

      // OPTIMIZATION: Draw solid persistent trail in max 120 chunks to avoid lagging with huge trails
      ctx.save();
      ctx.lineWidth = 3;
      
      const numChunks = Math.min(150, currentTrail.length - 1);
      const chunkSize = Math.max(1, Math.floor(currentTrail.length / numChunks));
      
      for (let i = 0; i < currentTrail.length - 1; i += chunkSize) {
        ctx.beginPath();
        const startP = toCanvas(currentTrail[i].x, currentTrail[i].y);
        ctx.moveTo(startP.x, startP.y);
        
        const endIdx = Math.min(i + chunkSize + 1, currentTrail.length);
        for (let j = i + 1; j < endIdx; j++) {
          const pCurrent = toCanvas(currentTrail[j].x, currentTrail[j].y);
          ctx.lineTo(pCurrent.x, pCurrent.y);
        }
        
        ctx.strokeStyle = getColorForScheme(i, currentTrail.length, currentTrail[i].theta);
        ctx.stroke();
      }
      ctx.restore();

      // OPTIMIZATION: Draw brilliant Neon Comet Glow ONLY on the leading/recent 200 points
      ctx.save();
      ctx.lineWidth = 3.5;
      ctx.shadowBlur = 10;
      ctx.strokeStyle = '#ff007f';
      ctx.shadowColor = '#f43f5e';
      
      const recentPointsCount = Math.min(200, currentTrail.length);
      const startRecentIdx = currentTrail.length - recentPointsCount;
      if (startRecentIdx >= 0) {
        ctx.beginPath();
        const pFirst = toCanvas(currentTrail[startRecentIdx].x, currentTrail[startRecentIdx].y);
        ctx.moveTo(pFirst.x, pFirst.y);
        for (let i = startRecentIdx + 1; i < currentTrail.length; i++) {
          const pt = toCanvas(currentTrail[i].x, currentTrail[i].y);
          ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // Get current rolling coordinates
    const { x: tx, y: ty, xc, yc } = getCoordinates(theta, params);
    const canvasC = toCanvas(xc, yc);
    const canvasTrace = toCanvas(tx, ty);

    // Draw rolling circle and connecting arm
    if (params.showCircles) {
      // 1. Draw Rolling Circle
      ctx.strokeStyle = '#38bdf8'; // sky blue
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(canvasC.x, canvasC.y, params.r, 0, 2 * Math.PI);
      ctx.stroke();

      // 2. Draw Rolling Circle Center dot
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(canvasC.x, canvasC.y, 3, 0, 2 * Math.PI);
      ctx.fill();

      // 3. Draw Connecting Arm (Center to Trace point Pen d)
      ctx.strokeStyle = '#f43f5e'; // rose red
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(canvasC.x, canvasC.y);
      ctx.lineTo(canvasTrace.x, canvasTrace.y);
      ctx.stroke();

      // 4. Trace Point (the Pen)
      ctx.fillStyle = '#ff007f';
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#f43f5e';
      ctx.beginPath();
      ctx.arc(canvasTrace.x, canvasTrace.y, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();

      // 5. Draw wheel tire markers (to see details of wheel rotation)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1;
      const numSpokes = 8;
      // Rotation of the rolling circle is different depending on cycloid type
      let rotation = 0;
      if (params.type === 'cycloid') {
        rotation = -theta; // clockwise rotation
      } else if (params.type.startsWith('epi')) {
        rotation = theta * (1 + params.R / params.r);
      } else if (params.type.startsWith('hypo')) {
        rotation = -theta * (params.R / params.r - 1);
      }

      for (let s = 0; s < numSpokes; s++) {
        const angle = rotation + (s * 2 * Math.PI) / numSpokes;
        ctx.beginPath();
        ctx.moveTo(canvasC.x, canvasC.y);
        ctx.lineTo(
          canvasC.x + params.r * Math.cos(angle),
          canvasC.y + params.r * Math.sin(angle)
        );
        ctx.stroke();
      }
    } else {
      // Just draw the trace pen head
      ctx.fillStyle = '#ff007f';
      ctx.beginPath();
      ctx.arc(canvasTrace.x, canvasTrace.y, 5, 0, 2 * Math.PI);
      ctx.fill();
    }

  }, [params, theta, trail]);

  // Equations helper text
  const renderEquations = () => {
    switch (params.type) {
      case 'cycloid':
        return (
          <div className="space-y-1 font-mono text-xs text-slate-300 bg-slate-950/80 p-3 rounded-lg border border-slate-800">
            <p className="text-cyan-400 font-bold mb-1">平地旋輪線 Parametric Equations:</p>
            <p>x(θ) = r·θ - d·sin(θ)</p>
            <p>y(θ) = r - d·cos(θ)</p>
            <div className="text-[10px] text-slate-500 mt-2 border-t border-slate-800/60 pt-1.5">
              當前值: r = {params.r}, d = {params.d}, θ = {theta.toFixed(2)} rad ({((theta * 180) / Math.PI).toFixed(0)}°)
            </div>
          </div>
        );
      case 'epicycloid':
      case 'epitrochoid':
        return (
          <div className="space-y-1 font-mono text-xs text-slate-300 bg-slate-950/80 p-3 rounded-lg border border-slate-800">
            <p className="text-cyan-400 font-bold mb-1">{params.type === 'epicycloid' ? '外擺線' : '外延擺線'} Equations:</p>
            <p>x(θ) = (R+r)·cos(θ) - d·cos((R+r)/r · θ)</p>
            <p>y(θ) = (R+r)·sin(θ) - d·sin((R+r)/r · θ)</p>
            <div className="text-[10px] text-slate-500 mt-2 border-t border-slate-800/60 pt-1.5">
              當前值: R = {params.R}, r = {params.r}, d = {params.d}<br />
              比值 R/r = {(params.R / params.r).toFixed(2)}
            </div>
          </div>
        );
      case 'hypocycloid':
      case 'hypotrochoid':
        return (
          <div className="space-y-1 font-mono text-xs text-slate-300 bg-slate-950/80 p-3 rounded-lg border border-slate-800">
            <p className="text-cyan-400 font-bold mb-1">{params.type === 'hypocycloid' ? '內擺線' : '內延擺線'} Equations:</p>
            <p>x(θ) = (R-r)·cos(θ) + d·cos((R-r)/r · θ)</p>
            <p>y(θ) = (R-r)·sin(θ) - d·sin((R-r)/r · θ)</p>
            <div className="text-[10px] text-slate-500 mt-2 border-t border-slate-800/60 pt-1.5">
              當前值: R = {params.R}, r = {params.r}, d = {params.d}<br />
              比值 R/r = {(params.R / params.r).toFixed(2)}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="cycloid-explorer">
      {/* Simulation Screen (cols 12 -> 7 on large) */}
      <div className="lg:col-span-7 flex flex-col space-y-4">
        {/* Render Canvas Box */}
        <div className="relative bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="w-full max-w-full aspect-[4/3] bg-slate-950 block"
          />

          {/* Quick info overlays */}
          <div className="absolute top-4 left-4 bg-slate-900/90 text-white border border-slate-800/80 rounded-lg px-3 py-1.5 text-xs select-none backdrop-blur font-mono flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>
              {params.type === 'cycloid' && '平地旋輪線 (Cycloid / Roulette)'}
              {params.type === 'epicycloid' && '外擺線 (Epicycloid)'}
              {params.type === 'hypocycloid' && '內擺線 (Hypocycloid)'}
              {params.type === 'epitrochoid' && '外延擺線 (Epitrochoid)'}
              {params.type === 'hypotrochoid' && '內延擺線 (Hypotrochoid)'}
            </span>
          </div>

          <div className="absolute top-4 right-4 bg-slate-900/90 text-slate-300 border border-slate-800/80 rounded-lg px-2.5 py-1 text-xs select-none backdrop-blur font-mono">
            角度 θ: {(theta).toFixed(2)} rad
          </div>

          {/* Real-time state indicator if finished loop */}
          {theta === 0 && trail.length === 0 && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-xs transition-opacity duration-300 pointer-events-none">
              <span className="text-sm font-mono text-cyan-300 bg-slate-955/90 border border-cyan-800/40 rounded-xl px-4 py-2 shadow-lg tracking-wide animate-pulse">
                軌跡重新開始繪製...
              </span>
            </div>
          )}
        </div>

        {/* Dynamic equations card */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="flex-1">
            {renderEquations()}
          </div>
          <div className="bg-slate-900 border border-slate-800/60 p-3 rounded-lg text-xs text-slate-400 max-w-md space-y-1">
            <span className="text-amber-400 font-semibold flex items-center gap-1">
              <Info className="w-3.5 h-3.5" /> 擺線物理常識
            </span>
            <p>
              旋輪線最早由伽利略、笛卡兒、帕斯卡等數學家研究。平地旋輪線的一拱弧長等於滾動圓直徑的 4 倍（即 8r）；曲線下的面積則是滾動圓面積的 3 倍。
            </p>
          </div>
        </div>
      </div>

      {/* Control Box (cols 12 -> 5 on large) */}
      <div className="lg:col-span-5 flex flex-col space-y-6">
        {/* Preset selector */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-xl">
          <h3 className="text-white font-medium text-sm mb-3 flex items-center justify-between">
            <span>選擇神奇曲線預設 (Presets)</span>
            <span className="text-xs text-cyan-400 font-mono">精選幾何圖形</span>
          </h3>
          <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                id={`preset-${preset.name.replace(/\s+/g, '-')}`}
                className={`text-left px-3 py-2 rounded-xl text-xs transition duration-200 border ${
                  selectedPreset === preset.name
                    ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-200 shadow-md shadow-cyan-900/10 font-medium'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
                onClick={() => applyPreset(preset)}
              >
                {preset.name}
              </button>
            ))}
          </div>

          {/* Preset details decription */}
          {selectedPreset && (
            <div className="mt-3.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 text-xs text-slate-400 leading-relaxed">
              <strong className="text-slate-300 block mb-1">
                {selectedPreset} 精華解析:
              </strong>
              {PRESETS.find((p) => p.name === selectedPreset)?.description}
            </div>
          )}
        </div>

        {/* Sliders and custom parameters */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-xl flex-1 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <h3 className="text-white font-medium text-sm flex items-center justify-between">
              <span>調整幾何與追蹤參數</span>
              <Settings className="w-4 h-4 text-slate-500" />
            </h3>

            {/* Type selector */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 block font-medium">擺線基本大類</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['cycloid', 'epicycloid', 'hypocycloid'] as const).map((t) => (
                  <button
                    key={t}
                    id={`type-${t}`}
                    className={`px-2 py-1.5 rounded-lg text-xs font-mono border text-center transition ${
                      params.type === t || (t === 'epicycloid' && params.type === 'epitrochoid') || (t === 'hypocycloid' && params.type === 'hypotrochoid')
                        ? 'bg-slate-800 border-sky-500/60 text-sky-300'
                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-300'
                    }`}
                    onClick={() => {
                      // Switch type, keep ratio adjustments
                      let nextType: CycloidType = t;
                      if (t === 'epicycloid' && params.d !== params.r) nextType = 'epitrochoid';
                      if (t === 'hypocycloid' && params.d !== params.r) nextType = 'hypotrochoid';

                      setParams((prev) => ({ ...prev, type: nextType }));
                      setTheta(0);
                      setTrail([]);
                      setSelectedPreset('');
                    }}
                  >
                    {t === 'cycloid' && '平地旋輪線'}
                    {t === 'epicycloid' && '外擺線系'}
                    {t === 'hypocycloid' && '內擺線系'}
                  </button>
                ))}
              </div>
            </div>

            {/* Radius R Slider (Fixed circle, only applicable to epic/hypo) */}
            {params.type !== 'cycloid' && (
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-mono">定圓半徑 R (Fixed Circle):</span>
                  <span className="text-sky-400 font-bold font-mono">{params.R} px</span>
                </div>
                <input
                  type="range"
                  id="slider-R"
                  min="30"
                  max="180"
                  step="5"
                  value={params.R}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setParams((prev) => ({ ...prev, R: val }));
                    setTheta(0);
                    setTrail([]);
                    setSelectedPreset('');
                  }}
                  className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-sky-400"
                />
              </div>
            )}

            {/* Radius r Slider (Rolling circle) */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-mono">滾動圓半徑 r (Rolling Circle):</span>
                <span className="text-sky-400 font-bold font-mono">{params.r} px</span>
              </div>
              <input
                type="range"
                id="slider-r"
                min="10"
                max={params.type === 'cycloid' ? '80' : `${Math.min(120, params.R)}`}
                step="2"
                value={params.r}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setParams((prev) => {
                    // if pen distance $d$ was coupling to $r$, keep it coupled unless they choose to decoupled
                    const coupled = prev.d === prev.r;
                    const nextD = coupled ? val : Math.min(prev.d, val * 3);
                    
                    // Update type based on pen distance
                    let nType = prev.type;
                    if (prev.type === 'epicycloid' && nextD !== val) nType = 'epitrochoid';
                    if (prev.type === 'epitrochoid' && nextD === val) nType = 'epicycloid';
                    if (prev.type === 'hypocycloid' && nextD !== val) nType = 'hypotrochoid';
                    if (prev.type === 'hypotrochoid' && nextD === val) nType = 'hypocycloid';

                    return { ...prev, r: val, d: nextD, type: nType };
                  });
                  setTheta(0);
                  setTrail([]);
                  setSelectedPreset('');
                }}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
            </div>

            {/* Pen distance d Slider */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-mono">筆尖距離 d (Pen Distance):</span>
                <span className="font-bold font-mono text-rose-400">
                  {params.d} px {params.d === params.r ? '(極限界圈)' : params.d > params.r ? '(套外延)' : '(套內縮)'}
                </span>
              </div>
              <input
                type="range"
                id="slider-d"
                min="0"
                max={Math.min(220, params.r * 2.5)}
                step="2"
                value={params.d}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setParams((prev) => {
                    let nType = prev.type;
                    if (prev.type === 'epicycloid' && val !== prev.r) nType = 'epitrochoid';
                    if (prev.type === 'epitrochoid' && val === prev.r) nType = 'epicycloid';
                    if (prev.type === 'hypocycloid' && val !== prev.r) nType = 'hypotrochoid';
                    if (prev.type === 'hypotrochoid' && val === prev.r) nType = 'hypocycloid';

                    return { ...prev, d: val, type: nType };
                  });
                  setTheta(0);
                  setTrail([]);
                  setSelectedPreset('');
                }}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-rose-400"
              />
            </div>

            {/* Speed slider */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-mono">繪圖生成速度 (Drawing Speed):</span>
                <span className="text-amber-400 font-bold font-mono">{params.speed}x</span>
              </div>
              <input
                type="range"
                id="slider-speed"
                min="0.5"
                max="15"
                step="0.5"
                value={params.speed}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setParams((prev) => ({ ...prev, speed: val }));
                }}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* Colors and displays settings row */}
            <div className="grid grid-cols-2 gap-4 border-t border-slate-800/80 pt-3">
              {/* Color schemes */}
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">霓虹色調</label>
                <select
                  id="select-color"
                  value={params.colorScheme}
                  onChange={(e) => {
                    setParams((prev) => ({ ...prev, colorScheme: e.target.value }));
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 text-xs outline-none focus:border-cyan-500/60 font-medium"
                >
                  <option value="rainbow">🌈 漸變彩虹</option>
                  <option value="neon">⚡ 電馭霓虹</option>
                  <option value="sunset">🌇 暮色太陽</option>
                  <option value="emerald">💚 翡翠極光</option>
                </select>
              </div>

              {/* Total Cycles limits */}
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">最大圈數限制</label>
                <select
                  id="select-turns"
                  value={params.maxTurns}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setParams((prev) => ({ ...prev, maxTurns: val }));
                    setTheta(0);
                    setTrail([]);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 text-xs outline-none focus:border-cyan-500/60 font-medium"
                >
                  <option value={1}>1 圈</option>
                  <option value={2}>2 圈</option>
                  <option value={3}>3 圈</option>
                  <option value={4}>4 圈</option>
                  <option value={6}>6 圈</option>
                  <option value={10}>10 圈</option>
                  <option value={20}>20 圈</option>
                  <option value={30}>30 圈</option>
                  <option value={50}>50 圈</option>
                  <option value={100}>100 圈 (超長極細軌跡)</option>
                </select>
              </div>
            </div>

            {/* Visibility checks */}
            <div className="flex items-center gap-5 pt-1 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 select-none">
                <input
                  type="checkbox"
                  id="check-circles"
                  checked={params.showCircles}
                  onChange={(e) => setParams((prev) => ({ ...prev, showCircles: e.target.checked }))}
                  className="rounded border-slate-800 text-cyan-500 bg-slate-950 focus:ring-0 w-3.5 h-3.5"
                />
                顯示輔助圓與軸桿
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 select-none">
                <input
                  type="checkbox"
                  id="check-rulers"
                  checked={params.showRulers}
                  onChange={(e) => setParams((prev) => ({ ...prev, showRulers: e.target.checked }))}
                  className="rounded border-slate-800 text-cyan-500 bg-slate-950 focus:ring-0 w-3.5 h-3.5"
                />
                顯示座標格網與標尺
              </label>
            </div>
          </div>

          {/* Player controls */}
          <div className="pt-4 border-t border-slate-800/80 flex items-center gap-3">
            <button
              id="btn-play-pause"
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex-1 py-2.5 px-4 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition duration-200 cursor-pointer ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-600 text-amber-950'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-amber-950" /> 暫停繪製
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-slate-950" /> 開始滾動
                </>
              )}
            </button>

            <button
              id="btn-reset-trail"
              onClick={() => {
                setTheta(0);
                setTrail([]);
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-900 text-xs font-medium flex items-center gap-1.5 transition duration-200 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" /> 重置軌跡
            </button>

            <button
              id="btn-download-image"
              onClick={downloadCanvasImage}
              className="px-4 py-2.5 rounded-xl border border-teal-800 bg-teal-950/30 text-teal-300 hover:bg-teal-950/80 text-xs font-medium flex items-center gap-1.5 transition duration-200 cursor-pointer"
              title="下載當前的擺線藝術設計 (PNG)"
            >
              <Download className="w-4 h-4" /> 下載圖片
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
