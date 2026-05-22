/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Info, Settings, Download } from 'lucide-react';

interface LissajousPreset {
  name: string;
  a: number; // x frequency
  b: number; // y frequency
  delta: number; // phase (radians)
  description: string;
}

const LISSAJOUS_PRESETS: LissajousPreset[] = [
  {
    name: '完美沙漏 (1:2)',
    a: 1,
    b: 2,
    delta: Math.PI / 2,
    description: '經典的 1:2 頻率比，在 90 度相位差下形成均勻對稱的亮麗沙漏曲線（或拋物線形）。',
  },
  {
    name: '三葉幸運草 (3:4)',
    a: 3,
    b: 4,
    delta: Math.PI / 4,
    description: '3:4 比例，伴隨 45 度相位差，交織出精緻的三度空間網盤結構。',
  },
  {
    name: '無限永恆 (1:3)',
    a: 1,
    b: 3,
    delta: Math.PI / 3,
    description: '1:3 比例，描繪出類似莫比烏斯環或無限（Infinity）交織多重軌跡。',
  },
  {
    name: '精密編織結 (5:6)',
    a: 5,
    b: 6,
    delta: Math.PI / 2,
    description: '高頻緊密比例，在 90 度相位差下編織成帶有 30 個交點的細微幾何濾網。',
  },
  {
    name: '扭曲絲帶 (5:4)',
    a: 5,
    b: 4,
    delta: Math.PI / 6,
    description: '5:4 的非對稱流暢交織，在小相位差下扭轉成輕盈旋轉的絲帶。',
  },
  {
    name: '同頻對角線 (1:1)',
    a: 1,
    b: 1,
    delta: 0,
    description: '當頻率完全相同且相位差為 0 時，軌跡退化為一條傾斜的 45 度對角線。',
  },
  {
    name: '正諧完美圓 (1:1圓)',
    a: 1,
    b: 1,
    delta: Math.PI / 2,
    description: '當頻率相同且相位差等於 90 度 (π/2) 時，合成軌跡為最完美的圓形軌道。',
  }
];

export default function LissajousExplorer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  const [a, setA] = useState(3);
  const [b, setB] = useState(4);
  const [delta, setDelta] = useState(Math.PI / 4); // Phase in radians
  const [amplitudeX, setAmplitudeX] = useState(160);
  const [amplitudeY, setAmplitudeY] = useState(160);
  const [speed, setSpeed] = useState(3);
  const [colorScheme, setColorScheme] = useState('rainbow');
  const [showOscillations, setShowOscillations] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState('三葉幸運草 (3:4)');

  const [t, setT] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [trail, setTrail] = useState<{ x: number; y: number; t: number }[]>([]);

  // Refs for animation loop
  const pRef = useRef({ a, b, delta, amplitudeX, amplitudeY, speed, colorScheme, showOscillations });
  const tRef = useRef(t);
  const trailRef = useRef(trail);

  useEffect(() => {
    pRef.current = { a, b, delta, amplitudeX, amplitudeY, speed, colorScheme, showOscillations };
  }, [a, b, delta, amplitudeX, amplitudeY, speed, colorScheme, showOscillations]);

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  useEffect(() => {
    trailRef.current = trail;
  }, [trail]);

  const applyPreset = (preset: LissajousPreset) => {
    setSelectedPreset(preset.name);
    setA(preset.a);
    setB(preset.b);
    setDelta(preset.delta);
    setT(0);
    setTrail([]);
  };

  const getCoordinates = (tVal: number, params: typeof pRef.current) => {
    const x = params.amplitudeX * Math.sin(params.a * tVal + params.delta);
    const y = params.amplitudeY * Math.sin(params.b * tVal);
    // Projecting oscillators
    const oscX = params.amplitudeX * Math.sin(params.a * tVal + params.delta);
    const oscY = params.amplitudeY * Math.sin(params.b * tVal);
    return { x, y, oscX, oscY };
  };

  // Run initial preset once
  useEffect(() => {
    applyPreset(LISSAJOUS_PRESETS[1]); // Default 3:4 preset
  }, []);

  // Frame Update Loop
  useEffect(() => {
    let lastTime = performance.now();

    const update = (nowTime: number) => {
      if (!isPlaying) {
        lastTime = nowTime;
        animationRef.current = requestAnimationFrame(update);
        return;
      }

      const dt = Math.min(nowTime - lastTime, 32);
      lastTime = nowTime;

      const params = pRef.current;
      // Step increment
      const stepVal = params.speed * 0.0028 * dt;
      const nextT = tRef.current + stepVal;

      // Limit of Lissajous cycle: Standard curves period repeats on LCM of a and b.
      // E.g., 2 * PI is safe, but we can draw up to Math.PI * 4 or more to make sure.
      // If we go over a large limit, we wrap and trim.
      const limit = Math.PI * 8; // large enough for nice drawing

      if (nextT >= limit) {
        setT(0);
        setTrail([]);
      } else {
        setT(nextT);
        
        // Multi-step interpolation for smooth curves at high speeds
        const newPoints: { x: number; y: number; t: number }[] = [];
        const interpolationSteps = Math.ceil(params.speed);
        for (let i = 1; i <= interpolationSteps; i++) {
          const tInterpolated = tRef.current + (nextT - tRef.current) * (i / interpolationSteps);
          const coords = getCoordinates(tInterpolated, params);
          newPoints.push({ x: coords.x, y: coords.y, t: tInterpolated });
        }

        setTrail((prev) => {
          const updated = [...prev, ...newPoints];
          // Keep a generous trail for high frequency but prevent slow performance (6000 points max)
          if (updated.length > 6000) {
            return updated.slice(updated.length - 6000);
          }
          return updated;
        });
      }

      animationRef.current = requestAnimationFrame(update);
    };

    animationRef.current = requestAnimationFrame(update);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying]);

  // Handle Redraw Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const X_mid = W / 2;
    const Y_mid = H / 2;

    ctx.clearRect(0, 0, W, H);

    // Draw coordinate Grid Box
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

    // Centered axes
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(15, Y_mid); ctx.lineTo(W - 15, Y_mid);
    ctx.moveTo(X_mid, 15); ctx.lineTo(X_mid, H - 15);
    ctx.stroke();

    // Box guidelines for amplitude limits
    const currentParams = pRef.current;
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.6)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(
      X_mid - currentParams.amplitudeX,
      Y_mid - currentParams.amplitudeY,
      currentParams.amplitudeX * 2,
      currentParams.amplitudeY * 2
    );
    ctx.setLineDash([]);

    const toCanvas = (lx: number, ly: number) => ({
      x: X_mid + lx,
      y: Y_mid - ly, // invert Y
    });

    // Color Scheming
    const getRainbowColor = (tVal: number, ratio: number) => {
      switch (colorScheme) {
        case 'rainbow':
          return `hsla(${(tVal * 100) % 360}, 90%, 65%, 0.95)`;
        case 'neon':
          return `rgba(${Math.floor(255 - ratio * 155)}, ${Math.floor(40 + ratio * 190)}, 255, 0.95)`;
        case 'sunset':
          return `rgba(255, ${Math.floor(210 - ratio * 180)}, ${Math.floor(40 + ratio * 80)}, 0.95)`;
        case 'emerald':
        default:
          return `rgba(34, 197, 94, ${0.4 + ratio * 0.6})`;
      }
    };

    // Plot persistent trail in efficient chunks
    const currTrail = trailRef.current;
    if (currTrail.length > 1) {
      ctx.save();
      ctx.lineWidth = 3;

      // Draw optimized segment trails to avoid draw log delays
      const segmentsCount = Math.min(180, currTrail.length - 1);
      const step = Math.max(1, Math.floor(currTrail.length / segmentsCount));

      for (let i = 0; i < currTrail.length - 1; i += step) {
        ctx.beginPath();
        const startP = toCanvas(currTrail[i].x, currTrail[i].y);
        ctx.moveTo(startP.x, startP.y);

        const endBound = Math.min(i + step + 1, currTrail.length);
        for (let j = i + 1; j < endBound; j++) {
          const p = toCanvas(currTrail[j].x, currTrail[j].y);
          ctx.lineTo(p.x, p.y);
        }

        ctx.strokeStyle = getRainbowColor(currTrail[i].t, i / currTrail.length);
        ctx.stroke();
      }
      ctx.restore();

      // Leading tail highlight glow
      ctx.save();
      ctx.lineWidth = 4;
      ctx.shadowBlur = 12;
      ctx.strokeStyle = '#22d3ee'; // cyan glow leading
      ctx.shadowColor = '#06b6d4';
      const leadLength = Math.min(120, currTrail.length);
      const leadStart = currTrail.length - leadLength;
      if (leadStart >= 0) {
        ctx.beginPath();
        const pFirst = toCanvas(currTrail[leadStart].x, currTrail[leadStart].y);
        ctx.moveTo(pFirst.x, pFirst.y);
        for (let i = leadStart + 1; i < currTrail.length; i++) {
          const pt = toCanvas(currTrail[i].x, currTrail[i].y);
          ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // Dynamic wave oscillation generators on rulers
    const coords = getCoordinates(t, currentParams);
    const canvasTrace = toCanvas(coords.x, coords.y);

    if (showOscillations) {
      // 1. Plot horizontal and vertical side projection lines
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)'; // soft red
      ctx.lineWidth = 1;
      
      // Horizontal beam
      ctx.beginPath();
      ctx.moveTo(15, canvasTrace.y);
      ctx.lineTo(W - 15, canvasTrace.y);
      ctx.stroke();

      // Vertical beam
      ctx.beginPath();
      ctx.moveTo(canvasTrace.x, 15);
      ctx.lineTo(canvasTrace.x, H - 15);
      ctx.stroke();

      // Draw sliding sine wave references in page borders
      // X components (drawn as sine wave on the top ruler)
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let sx = 0; sx < W; sx += 3) {
        // Map sx coordinate into t space relative to current t
        const projT = t - (sx - X_mid) * 0.015;
        const sinVal = currentParams.amplitudeX * Math.sin(currentParams.a * projT + currentParams.delta);
        const yCoord = 40 - sinVal * 0.15; // scaled down to top strip
        if (sx === 0) ctx.moveTo(sx, yCoord);
        else ctx.lineTo(sx, yCoord);
      }
      ctx.stroke();
      ctx.restore();

      // Y components (drawn as sine wave on the right margin)
      ctx.save();
      ctx.strokeStyle = 'rgba(167, 139, 250, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let sy = 0; sy < H; sy += 3) {
        const projT = t - (sy - Y_mid) * 0.015;
        const sinVal = currentParams.amplitudeY * Math.sin(currentParams.b * projT);
        const xCoord = W - 40 + sinVal * 0.15; // scale right
        if (sy === 0) ctx.moveTo(xCoord, sy);
        else ctx.lineTo(xCoord, sy);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Draw scanning pen dot
    ctx.fillStyle = '#22d3ee';
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#22d3ee';
    ctx.beginPath();
    ctx.arc(canvasTrace.x, canvasTrace.y, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();

    // Coordinates overlay labels
    if (currentParams.showOscillations) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`x = A·sin(a·t+δ) = ${coords.x.toFixed(0)}`, W - 15, Y_mid - currentParams.amplitudeY - 12);
      ctx.fillText(`y = B·sin(b·t) = ${coords.y.toFixed(0)}`, W - 15, Y_mid + currentParams.amplitudeY + 20);
    }

  }, [a, b, delta, amplitudeX, amplitudeY, colorScheme, showOscillations, t, trail]);

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `lissajous_ratio_${a}_to_${b}_delta_${delta.toFixed(2)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="lissajous-explorer">
      {/* Simulation Screen (cols 7) */}
      <div className="lg:col-span-7 flex flex-col space-y-4">
        <div className="relative bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="w-full max-w-full aspect-[4/3] bg-slate-950 block"
          />

          <div className="absolute top-4 left-4 bg-slate-900/90 text-white border border-slate-800/80 rounded-lg px-3 py-1.5 text-xs select-none backdrop-blur font-mono flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>利薩茹示波器合成 (Lissajous Oscillator)</span>
          </div>

          <div className="absolute top-4 right-4 bg-slate-900/90 text-slate-300 border border-slate-800/80 rounded-lg px-2.5 py-1 text-xs select-none backdrop-blur font-mono">
            頻比 a:b = {a}:{b}
          </div>
        </div>

        {/* Oscilloscope formulas */}
        <div className="bg-slate-900/50 border border-slate-805 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1 font-mono text-xs text-slate-300 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            <p className="text-cyan-400 font-bold mb-1">利薩茹與諧振方程式:</p>
            <p>x(t) = A · sin(a·t + δ)</p>
            <p>y(t) = B · sin(b·t)</p>
            <div className="text-[10px] text-slate-500 mt-2 border-t border-slate-800/60 pt-1.5">
              分量: a = {a} Hz, b = {b} Hz, δ = {(delta / Math.PI).toFixed(2)}π rad ({Math.floor(delta * 180 / Math.PI)}°)
            </div>
          </div>

          <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-850 text-xs text-slate-400 space-y-1">
            <span className="text-amber-400 font-semibold flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" /> 物理背景
            </span>
            <p className="leading-relaxed">
              利薩茹曲線是用於展示兩個相互垂直的正弦波運動合成路徑。常用於物理示波器（Oscilloscope）進行信號頻率差與相位差監測。
            </p>
          </div>
        </div>
      </div>

      {/* Control sliders (cols 5) */}
      <div className="lg:col-span-5 flex flex-col space-y-6">
        {/* Presets */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-xl">
          <h3 className="text-white font-medium text-sm mb-3 flex items-center justify-between">
            <span>選擇經典利薩茹預設軌跡</span>
            <span className="text-xs text-violet-400 font-mono">Lissajous Ratio</span>
          </h3>
          <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1">
            {LISSAJOUS_PRESETS.map((p) => (
              <button
                key={p.name}
                id={`preset-${p.name.replace(/\s+/g, '-')}`}
                className={`text-left px-3 py-2 rounded-xl text-xs transition duration-200 border ${
                  selectedPreset === p.name
                    ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-200 shadow-md shadow-cyan-900/10 font-medium'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
                onClick={() => applyPreset(p)}
              >
                {p.name}
              </button>
            ))}
          </div>

          {selectedPreset && (
            <div className="mt-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 text-xs text-slate-400 leading-relaxed">
              <strong>軌跡幾何描述:</strong> {LISSAJOUS_PRESETS.find((x) => x.name === selectedPreset)?.description}
            </div>
          )}
        </div>

        {/* Adjustments options slider space */}
        <div className="bg-slate-905 border border-slate-800/80 rounded-2xl p-5 shadow-xl flex-1 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <h3 className="text-white font-medium text-sm flex items-center justify-between">
              <span>調整示波相角與頻率頻寬</span>
              <Settings className="w-4 h-4 text-slate-500" />
            </h3>

            {/* Scale Slider a */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-mono">X軸分頻頻率 a (X-Frequency):</span>
                <span className="text-sky-400 font-bold font-mono">{a} Hz</span>
              </div>
              <input
                type="range"
                id="slider-a"
                min="1"
                max="20"
                step="1"
                value={a}
                onChange={(e) => {
                  setA(parseInt(e.target.value));
                  setT(0);
                  setTrail([]);
                  setSelectedPreset('');
                }}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-sky-450"
              />
            </div>

            {/* Scale Slider b */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-mono">Y軸分頻頻率 b (Y-Frequency):</span>
                <span className="text-violet-400 font-bold font-mono">{b} Hz</span>
              </div>
              <input
                type="range"
                id="slider-b"
                min="1"
                max="20"
                step="1"
                value={b}
                onChange={(e) => {
                  setB(parseInt(e.target.value));
                  setT(0);
                  setTrail([]);
                  setSelectedPreset('');
                }}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-violet-400"
              />
            </div>

            {/* Delta Phase Slider */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-mono">相位角疊加 δ (Phase difference):</span>
                <span className="text-amber-400 font-bold font-mono">
                  {(delta / Math.PI).toFixed(2)}π rad ({Math.round(delta * 180 / Math.PI)}°)
                </span>
              </div>
              <input
                type="range"
                id="slider-delta"
                min="0"
                max={Math.PI * 2}
                step={Math.PI / 12}
                value={delta}
                onChange={(e) => {
                  setDelta(parseFloat(e.target.value));
                  setT(0);
                  setTrail([]);
                  setSelectedPreset('');
                }}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* X Amplitude  */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">X振幅 A:</span>
                <span className="text-slate-300 font-semibold">{amplitudeX} px</span>
              </div>
              <input
                type="range"
                id="slider-amp-x"
                min="40"
                max="220"
                step="5"
                value={amplitudeX}
                onChange={(e) => {
                  setAmplitudeX(parseInt(e.target.value));
                  setT(0);
                  setTrail([]);
                }}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            {/* Y Amplitude  */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Y振幅 B:</span>
                <span className="text-slate-300 font-semibold">{amplitudeY} px</span>
              </div>
              <input
                type="range"
                id="slider-amp-y"
                min="40"
                max="220"
                step="5"
                value={amplitudeY}
                onChange={(e) => {
                  setAmplitudeY(parseInt(e.target.value));
                  setT(0);
                  setTrail([]);
                }}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            {/* Control speed */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">連續掃描生成速度 (Scan speed):</span>
                <span className="text-amber-400 font-bold">{speed}x</span>
              </div>
              <input
                type="range"
                id="slider-col-speed"
                min="1"
                max="12"
                step="0.5"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Quick configurations */}
            <div className="grid grid-cols-2 gap-4 border-t border-slate-805 pt-2">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium font-sans">色彩主題</label>
                <select
                  id="select-col-scheme"
                  value={colorScheme}
                  onChange={(e) => setColorScheme(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 text-xs outline-none focus:border-cyan-500"
                >
                  <option value="rainbow">🌈 漸變彩虹</option>
                  <option value="neon">⚡ 電馭霓虹</option>
                  <option value="sunset">🌇 暮色太陽</option>
                  <option value="emerald">💚 翡翠極光</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 mt-5">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 select-none text-xs">
                  <input
                    type="checkbox"
                    id="check-waves"
                    checked={showOscillations}
                    onChange={(e) => setShowOscillations(e.target.checked)}
                    className="rounded border-slate-800 text-cyan-500 bg-slate-950 focus:ring-0 w-3.5 h-3.5"
                  />
                  投顯示實時正弦投影波
                </label>
              </div>
            </div>
          </div>

          {/* Sub buttons toolbar */}
          <div className="pt-4 border-t border-slate-800 flex items-center gap-3">
            <button
              id="btn-liss-play"
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex-1 py-2.5 px-4 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition duration-200 cursor-pointer ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-600 text-amber-950'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-amber-950" /> 暫停掃描
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-slate-950" /> 開始掃描
                </>
              )}
            </button>

            <button
              id="btn-liss-reset"
              onClick={() => {
                setT(0);
                setTrail([]);
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-900 text-xs font-semibold flex items-center gap-1.5 transition duration-200 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" /> 重置軌跡
            </button>

            <button
              id="btn-liss-download"
              onClick={downloadImage}
              className="px-4 py-2.5 rounded-xl border border-teal-800 bg-teal-950/30 text-teal-300 hover:bg-teal-950/80 text-xs font-medium flex items-center gap-1.5 transition duration-200 cursor-pointer"
            >
              <Download className="w-4 h-4" /> 下載圖片
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
