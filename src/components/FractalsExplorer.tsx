/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Settings, Info, Download, RefreshCw } from 'lucide-react';

interface FractalTypeConfig {
  id: string;
  name: string;
  maxIterations: number;
  description: string;
}

const FRACTAL_TYPES: FractalTypeConfig[] = [
  {
    id: 'koch',
    name: '科赫雪花 (Koch Snowflake)',
    maxIterations: 6,
    description: '最經典的「周長無限，面積有限」碎形。每進行一次疊代，周長都變為原來的 4/3 倍（趨向無限大），但圍成面積被嚴格限制在初始正三角形外接圓的 1.6 倍以內！',
  },
  {
    id: 'sierpinski',
    name: '謝爾賓斯基三角形 (Sierpinski Gasket)',
    maxIterations: 7,
    description: '自我相似的對稱三角形。由大正三角形不斷挖去中心倒三角組成，其總剩餘面積隨疊代趨向 0，但內部無數複雜空隙的總邊長（周長）卻趨向無限。',
  },
  {
    id: 'dragon',
    name: '分形龍曲線 (Dragon Curve)',
    maxIterations: 12,
    description: '將一條紙帶不斷往同方向對折、展開而成的奇妙幾何線條。它完美填滿複雜的二維空間而周長無窮，但其邊界面積完全局限於一個有限的心臟形狀內。',
  }
];

export default function FractalsExplorer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fractal, setFractal] = useState<string>('koch');
  const [iterations, setIterations] = useState<number>(3);
  const [colorScheme, setColorScheme] = useState<string>('neon');
  const [animate, setAnimate] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(1); // animation progress
  const [scale, setScale] = useState<number>(1.0);

  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    // Reset progress when changing type or iterations
    setProgress(0.01);
  }, [fractal, iterations]);

  // Animation Loop for beautiful drawing effect
  useEffect(() => {
    if (!animate) {
      setProgress(1.0);
      return;
    }

    let lastTime = performance.now();
    const update = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;

      setProgress((prev) => {
        if (prev >= 1.0) {
          return 1.0;
        }
        const next = Math.min(1.0, prev + dt * 0.0008);
        if (next < 1.0) {
          animationRef.current = requestAnimationFrame(update);
        }
        return next;
      });
    };

    animationRef.current = requestAnimationFrame(update);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [animate]);

  // Helper points generators
  // 1. Koch segment generator
  const getKochPoints = (p1: { x: number; y: number }, p2: { x: number; y: number }, depth: number): { x: number; y: number }[] => {
    if (depth === 0) {
      return [p1, p2];
    }

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    const s = {
      x: p1.x + dx / 3,
      y: p1.y + dy / 3
    };

    const t = {
      x: p1.x + (dx * 2) / 3,
      y: p1.y + (dy * 2) / 3
    };

    // Equilateral triangle peak point
    // we rotate (dx/3, dy/3) by 60 degrees (pi/3)
    const cos60 = 0.5;
    const sin60 = -0.8660254; // standard Canvas Y-down invert for upright snowflake
    const rx = (dx / 3) * cos60 - (dy / 3) * sin60;
    const ry = (dx / 3) * sin60 + (dy / 3) * cos60;

    const v = {
      x: s.x + rx,
      y: s.y + ry
    };

    const pts1 = getKochPoints(p1, s, depth - 1);
    const pts2 = getKochPoints(s, v, depth - 1);
    const pts3 = getKochPoints(v, t, depth - 1);
    const pts4 = getKochPoints(t, p2, depth - 1);

    // Combine avoiding duplication
    return [...pts1.slice(0, -1), ...pts2.slice(0, -1), ...pts3.slice(0, -1), ...pts4];
  };

  // 2. Dragon Curve points generator
  const generateDragonDirs = (depth: number): number[] => {
    if (depth === 0) return [];
    const prev = generateDragonDirs(depth - 1);
    const rev = [...prev].reverse().map(d => 1 - d);
    return [...prev, 0, ...rev];
  };

  // Render Logic on Canvas resize/redraw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Draw background grid lines
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    ctx.save();
    
    // Choose neon gradient color based on colorScheme
    const getStrokeColor = (ratio: number) => {
      switch (colorScheme) {
        case 'rainbow':
          return `hsla(${(ratio * 360) % 360}, 90%, 60%, 0.95)`;
        case 'neon':
          return `rgba(${Math.floor(255 - ratio * 155)}, ${Math.floor(20 + ratio * 210)}, 255, 0.95)`;
        case 'sunset':
          return `rgba(255, ${Math.floor(200 - ratio * 160)}, ${Math.floor(30 + ratio * 90)}, 0.95)`;
        case 'cyan':
        default:
          return `rgba(34, 211, 238, ${0.4 + ratio * 0.6})`;
      }
    };

    if (fractal === 'koch') {
      // 3 sides of equilateral triangle
      const size = 260 * scale;
      const cy = H / 2 + 30;
      const cx = W / 2;

      const p1 = { x: cx - size / 2, y: cy - (size * Math.sqrt(3)) / 6 };
      const p2 = { x: cx + size / 2, y: cy - (size * Math.sqrt(3)) / 6 };
      const p3 = { x: cx, y: cy + (size * Math.sqrt(3)) / 3 };

      // Generate points for the 3 sides
      const side1 = getKochPoints(p1, p2, iterations);
      const side2 = getKochPoints(p2, p3, iterations);
      const side3 = getKochPoints(p3, p1, iterations);

      const allPoints = [...side1.slice(0, -1), ...side2.slice(0, -1), ...side3];
      const visibleLength = Math.max(2, Math.floor(allPoints.length * progress));

      // Draw the snowflake outline
      ctx.lineWidth = 1.8;
      ctx.shadowBlur = colorScheme === 'cyan' ? 4 : 8;
      ctx.shadowColor = getStrokeColor(0.5);

      for (let i = 0; i < visibleLength - 1; i++) {
        ctx.beginPath();
        ctx.moveTo(allPoints[i].x, allPoints[i].y);
        ctx.lineTo(allPoints[i+1].x, allPoints[i+1].y);
        ctx.strokeStyle = getStrokeColor(i / allPoints.length);
        ctx.stroke();
      }

    } else if (fractal === 'sierpinski') {
      const size = 320 * scale;
      const cy = H / 2 + 30;
      const cx = W / 2;

      const p1 = { x: cx, y: cy - (size * Math.sqrt(3)) / 3 };
      const p2 = { x: cx - size / 2, y: cy + (size * Math.sqrt(3)) / 6 };
      const p3 = { x: cx + size / 2, y: cy + (size * Math.sqrt(3)) / 6 };

      const drawTriangle = (a: {x:number, y:number}, b: {x:number, y:number}, c: {x:number, y:number}, depth: number, maxD: number) => {
        if (depth === 0) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.lineTo(c.x, c.y);
          ctx.closePath();
          ctx.fillStyle = getStrokeColor(depth / (maxD || 1));
          ctx.fill();
          ctx.strokeStyle = 'rgba(15, 23, 42, 0.4)';
          ctx.lineWidth = 0.5;
          ctx.stroke();
          return;
        }

        // midpoint calculations
        const ab = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const bc = { x: (b.x + c.x) / 2, y: (b.y + c.y) / 2 };
        const ca = { x: (c.x + a.x) / 2, y: (c.y + a.y) / 2 };

        // Draw sub triangles
        drawTriangle(a, ab, ca, depth - 1, maxD);
        drawTriangle(ab, b, bc, depth - 1, maxD);
        drawTriangle(ca, bc, c, depth - 1, maxD);
      };

      // Set progressive rendering limit based on animations
      // In Sierpinski we animate levels or sub-elements
      const drawLimit = Math.floor(iterations * progress) || 1;
      drawTriangle(p1, p2, p3, Math.min(iterations, drawLimit), iterations);

    } else if (fractal === 'dragon') {
      // Dragon Curve generator
      const dirs = generateDragonDirs(iterations);
      const size = Math.max(1.5, 230 / Math.pow(Math.sqrt(2), iterations)) * scale;
      
      // Calculate start point to keep it centered
      let cx = W / 2 - 40;
      let cy = H / 2 + 10;
      if (iterations >= 8) cx = W / 2 + 40;

      let angle = 0;
      const pts: { x: number; y: number }[] = [{ x: cx, y: cy }];

      for (let d of dirs) {
        angle += d === 0 ? Math.PI / 2 : -Math.PI / 2;
        const last = pts[pts.length - 1];
        pts.push({
          x: last.x + size * Math.cos(angle),
          y: last.y + size * Math.sin(angle),
        });
      }

      const visibleSize = Math.max(2, Math.floor(pts.length * progress));
      ctx.lineWidth = iterations > 9 ? 1.2 : 2.0;
      
      for (let i = 0; i < visibleSize - 1; i++) {
        ctx.beginPath();
        ctx.moveTo(pts[i].x, pts[i].y);
        ctx.lineTo(pts[i+1].x, pts[i+1].y);
        ctx.strokeStyle = getStrokeColor(i / pts.length);
        ctx.stroke();
      }
    }

    ctx.restore();
  }, [fractal, iterations, colorScheme, progress, scale]);

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `fractal_${fractal}_level_${iterations}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Math stats panel updater mapping properties
  const getTheoreticalStats = () => {
    const sMetric = 100; // Base baseline side length in m representing 10cm
    switch (fractal) {
      case 'koch': {
        const totalSides = 3 * Math.pow(4, iterations);
        // Perimeter formula: P_n = P_0 * (4/3)^n
        const ratio = Math.pow(4 / 3, iterations);
        const pStr = iterations === 6 ? '∞ (漸近趨向)' : `${(3 * sMetric * ratio).toFixed(1)} cm`;
        // Area formula: A_n = A_0 * [1 + 3/5 * (1 - (4/9)^n)] -> max limit is 1.6 * A_0
        const aRatio = 1 + (3 / 5) * (1 - Math.pow(4 / 9, iterations));
        const initArea = (Math.sqrt(3) / 4) * Math.pow(sMetric, 2);
        const aStr = `${(initArea * aRatio).toFixed(1)} cm²`;

        return {
          sides: totalSides,
          perimeter: pStr,
          area: aStr,
          dimension: '1.2618 (科赫Hausdorff維數)',
          isInfinitePerimeter: true,
          isFiniteArea: true,
        };
      }
      case 'sierpinski': {
        // Perimeter: Sum of segments -> 3^n segments
        const sidesCount = Math.pow(3, iterations);
        const ratio = Math.pow(1.5, iterations);
        const pStr = iterations >= 6 ? '∞ (指數級爆發)' : `${(3 * sMetric * ratio).toFixed(1)} cm`;
        // Area: (3/4)^n -> goes to zero!
        const remainingAreaPercent = Math.pow(0.75, iterations) * 100;
        const aStr = `${remainingAreaPercent.toFixed(1)}% (趨向於 0)`;

        return {
          sides: sidesCount,
          perimeter: pStr,
          area: aStr,
          dimension: '1.5850 (謝爾賓斯基維數)',
          isInfinitePerimeter: true,
          isFiniteArea: false, // goes to zero
        };
      }
      case 'dragon':
      default: {
        const sidesCount = Math.pow(2, iterations);
        const pStr = `${(sidesCount * (120 / Math.pow(1.414, iterations))).toFixed(1)} cm (無限延伸)`;
        return {
          sides: sidesCount,
          perimeter: pStr,
          area: '有限區間 (完全局限於 1.20L² 範圍內)',
          dimension: '2.0000 (空間充填極限)',
          isInfinitePerimeter: true,
          isFiniteArea: true,
        };
      }
    }
  };

  const stats = getTheoreticalStats();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="fractals-explorer">
      {/* Fractal canvas renderer (cols 7) */}
      <div className="lg:col-span-7 flex flex-col space-y-4">
        <div className="relative bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="w-full max-w-full aspect-[4/3] bg-slate-950 block"
          />

          <div className="absolute top-4 left-4 bg-slate-900/90 text-white border border-slate-800/80 rounded-lg px-3 py-1.5 text-xs select-none backdrop-blur font-mono flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
            <span>自相似幾何畫板 (Fractal Canvas)</span>
          </div>

          <div className="absolute top-4 right-4 bg-slate-900/90 text-slate-300 border border-slate-800/80 rounded-lg px-2.5 py-1 text-xs select-none backdrop-blur font-mono">
            疊代階次 (n): {iterations} 階
          </div>

          {/* Loading render overlay */}
          {progress < 1.0 && animate && (
            <div className="absolute bottom-4 right-4 bg-slate-950/80 text-cyan-400 border border-slate-800 text-[10px] sm:text-xs rounded-lg px-2.5 py-1 font-mono flex items-center gap-1.5 backdrop-blur">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>繪製進度: {(progress * 100).toFixed(0)}%</span>
            </div>
          )}
        </div>

        {/* Theoretical proof parameters */}
        <div className="bg-slate-900/50 border border-slate-805 rounded-2xl p-5 shadow-inner">
          <h4 className="text-white font-medium text-xs sm:text-sm mb-3.5 text-cyan-400">
            📊 數學幾何極限數學論證 (Mathematical Proof Stats)
          </h4>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
              <span className="text-[10px] text-slate-500 block font-mono">線段 / 元件總數</span>
              <span className="text-sm font-bold text-white font-mono">{stats.sides.toLocaleString()} 個</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
              <span className="text-[10px] text-slate-500 block font-mono">理論總周長 (Perimeter)</span>
              <span className="text-sm font-bold text-rose-400 font-mono flex items-center gap-1">
                {stats.perimeter}
                {stats.isInfinitePerimeter && <span className="text-[10px] font-bold text-rose-600 bg-rose-950/50 px-1 rounded">INF</span>}
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
              <span className="text-[10px] text-slate-500 block font-mono">包夾總面積 (Area)</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">
                {stats.area}
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
              <span className="text-[10px] text-slate-500 block font-mono">豪斯道夫維度 (Dimension)</span>
              <span className="text-sm font-bold text-indigo-300 font-mono">{stats.dimension}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control sliders (cols 5) */}
      <div className="lg:col-span-5 flex flex-col space-y-6">
        {/* Fractal Types */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-xl">
          <h3 className="text-white font-medium text-sm mb-3 flex items-center justify-between">
            <span>選擇數學界知名碎形</span>
            <span className="text-xs text-indigo-400 font-mono">Geometric Fractals</span>
          </h3>
          <div className="flex flex-col space-y-2">
            {FRACTAL_TYPES.map((f) => (
              <button
                key={f.id}
                id={`fractal-btn-${f.id}`}
                className={`text-left px-3.5 py-3 rounded-xl text-xs transition duration-200 border flex flex-col ${
                  fractalsIsSelected(f.id)
                    ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-200 shadow-md shadow-indigo-900/10'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
                onClick={() => {
                  setFractal(f.id);
                  // Ensure iterations fits the maximum limit
                  setIterations(Math.min(f.id === 'koch' ? 4 : f.id === 'sierpinski' ? 5 : 8, f.maxIterations));
                }}
              >
                <span className="font-semibold">{f.name}</span>
                <span className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {f.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Adjustments */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-xl flex-1 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <h3 className="text-white font-medium text-sm flex items-center justify-between">
              <span>調整碎形疊代級數</span>
              <Settings className="w-4 h-4 text-slate-500" />
            </h3>

            {/* Slider Iterations */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">疊代細化階數 (Iterations / Depth):</span>
                <span className="text-indigo-400 font-bold font-mono">Level {iterations}</span>
              </div>
              <input
                type="range"
                id="slider-fractal-iterations"
                min="1"
                max={FRACTAL_TYPES.find(f => f.id === fractal)?.maxIterations || 5}
                step="1"
                value={iterations}
                onChange={(e) => setIterations(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <span className="text-[10px] text-slate-500 block leading-relaxed pt-1 select-none">
                【注意】高階疊代（例如科赫 5-6 階或分形龍 11-12 階）線條元件會以<strong>指數級爆發增多</strong>，畫面會愈發精細！
              </span>
            </div>

            {/* Zoom Slider */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">幾何鏡頭縮放 (Scale):</span>
                <span className="text-indigo-300 font-bold font-mono">{scale.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                id="slider-fractal-scale"
                min="0.5"
                max="2.0"
                step="0.05"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-slate-500"
              />
            </div>

            {/* Color select */}
            <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">霓虹色系</label>
                <select
                  id="select-fractal-color"
                  value={colorScheme}
                  onChange={(e) => setColorScheme(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 text-xs outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="neon">⚡ 電馭霓虹</option>
                  <option value="rainbow">🌈 漸變彩虹</option>
                  <option value="sunset">🌇 暮色太陽</option>
                  <option value="cyan">💙 翡翠極光</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 mt-5">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 select-none text-xs">
                  <input
                    type="checkbox"
                    id="check-fractal-animate"
                    checked={animate}
                    onChange={(e) => setAnimate(e.target.checked)}
                    className="rounded border-slate-800 text-indigo-500 bg-slate-950 focus:ring-0 w-3.5 h-3.5"
                  />
                  啟用動態軌跡描繪
                </label>
              </div>
            </div>
          </div>

          {/* Action buttons toolbar */}
          <div className="pt-4 border-t border-slate-800 flex items-center gap-3">
            <button
              id="btn-fractal-play"
              onClick={() => {
                setProgress(0.01);
              }}
              className="flex-1 py-2.5 px-4 rounded-xl font-medium text-xs bg-indigo-650 hover:bg-indigo-650/80 text-white flex items-center justify-center gap-1.5 transition duration-200 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> 重新渲染
            </button>

            <button
              id="btn-fractal-download"
              onClick={downloadImage}
              className="px-4 py-2.5 rounded-xl border border-teal-850 bg-teal-950/30 text-teal-300 hover:bg-teal-950/80 text-xs font-semibold flex items-center gap-1.5 transition duration-200 cursor-pointer"
            >
              <Download className="w-4 h-4" /> 下載圖片
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  function fractalsIsSelected(id: string) {
    return fractal === id;
  }
}
