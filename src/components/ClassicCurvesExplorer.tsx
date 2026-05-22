/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Info, Settings, Download } from 'lucide-react';
import { ClassicCurveType } from '../types';

interface ClassicPreset {
  name: string;
  type: ClassicCurveType;
  a: number;
  b: number;
  k: number;
  description: string;
}

const CLASSIC_PRESETS: ClassicPreset[] = [
  {
    name: '玫瑰線 (Rose Curve, k=3)',
    type: 'rose',
    a: 150,
    b: 0,
    k: 3,
    description: '極坐標方程 r = a cos(kθ)。當 k 為奇數時，玫瑰線有 k 個花瓣。',
  },
  {
    name: '玫瑰線 (Rose Curve, k=4)',
    type: 'rose',
    a: 150,
    b: 0,
    k: 2, // k in code will be used as 2k petals if even? No, standard is k if odd, 2k if even.
    description: '當 k 為偶數時，玫瑰線有 2k 個花瓣（此處 k=2 產生 4 瓣）。',
  },
  {
    name: '伯努利雙紐線 (Lemniscate)',
    type: 'lemniscate',
    a: 180,
    b: 0,
    k: 0,
    description: '極坐標方程 r² = a² cos(2θ)。形如無限符號「∞」，是重要的經典代數曲線。',
  },
  {
    name: '阿基米德螺線 (Archimedean)',
    type: 'archimedean',
    a: 0,
    b: 5,
    k: 0,
    description: '極坐標方程 r = a + bθ。等速旋轉的射線上，等速運動的點所劃出的軌跡。',
  },
  {
    name: '對數螺線 (Logarithmic)',
    type: 'logarithmic',
    a: 5,
    b: 0.15,
    k: 0,
    description: '極坐標方程 r = a e^(bθ)。又稱等角螺線，常見於自然界如鸚鵡螺殼、銀河系。',
  },
  {
    name: '蝴蝶曲線 (Butterfly Curve)',
    type: 'butterfly',
    a: 40,
    b: 0,
    k: 0,
    description: '由 Temple H. Fay 發現。極坐標方程複雜，軌跡神似展翅蝴蝶，展現了超越函數的美。',
  }
];

export default function ClassicCurvesExplorer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [type, setType] = useState<ClassicCurveType>('rose');
  const [a, setA] = useState(150);
  const [b, setB] = useState(5);
  const [k, setK] = useState(3);
  const [speed, setSpeed] = useState(2);
  const [colorScheme, setColorScheme] = useState('neon');
  const [isPlaying, setIsPlaying] = useState(true);
  const [t, setT] = useState(0);
  
  const animationRef = useRef<number | null>(null);
  const tRef = useRef(0);

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  useEffect(() => {
    const update = () => {
      if (isPlaying) {
        setT((prev) => prev + 0.02 * speed);
      }
      animationRef.current = requestAnimationFrame(update);
    };
    animationRef.current = requestAnimationFrame(update);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, speed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    ctx.clearRect(0, 0, width, height);

    // Draw Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= width; x += 40) {
      ctx.moveTo(x, 0); ctx.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += 40) {
      ctx.moveTo(0, y); ctx.lineTo(width, y);
    }
    ctx.stroke();

    // Draw Axis
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, centerY); ctx.lineTo(width, centerY);
    ctx.moveTo(centerX, 0); ctx.lineTo(centerX, height);
    ctx.stroke();

    // Draw Curve
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();

    const maxTheta = type === 'archimedean' || type === 'logarithmic' ? 10 * Math.PI : 
                     type === 'butterfly' ? 12 * Math.PI : 2 * Math.PI;
    const currentTheta = Math.min(tRef.current, maxTheta);

    for (let theta = 0; theta <= currentTheta; theta += 0.02) {
      let r = 0;
      if (type === 'rose') {
        r = a * Math.cos(k * theta);
      } else if (type === 'lemniscate') {
        const val = a * a * Math.cos(2 * theta);
        if (val >= 0) {
          r = Math.sqrt(val);
        } else {
          continue; 
        }
      } else if (type === 'archimedean') {
        r = a + b * theta;
      } else if (type === 'logarithmic') {
        r = a * Math.exp(b * theta);
      } else if (type === 'butterfly') {
        // r = e^sin(theta) - 2cos(4theta) + sin^5((2theta-pi)/24)
        r = a * (Math.exp(Math.sin(theta)) - 2 * Math.cos(4 * theta) + Math.pow(Math.sin((2 * theta - Math.PI) / 24), 5));
      }

      const x = centerX + r * Math.cos(theta);
      const y = centerY - r * Math.sin(theta);

      if (theta === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    if (colorScheme === 'neon') {
      ctx.strokeStyle = '#22d3ee';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#0891b2';
    } else {
      ctx.strokeStyle = '#818cf8';
      ctx.shadowBlur = 0;
    }
    ctx.stroke();

    // Draw moving point
    if (currentTheta < maxTheta) {
        let r = 0;
        if (type === 'rose') r = a * Math.cos(k * currentTheta);
        else if (type === 'lemniscate') {
            const val = a * a * Math.cos(2 * currentTheta);
            r = val >= 0 ? Math.sqrt(val) : 0;
        }
        else if (type === 'archimedean') r = a + b * currentTheta;
        else if (type === 'logarithmic') r = a * Math.exp(b * currentTheta);
        else if (type === 'butterfly') {
            r = a * (Math.exp(Math.sin(currentTheta)) - 2 * Math.cos(4 * currentTheta) + Math.pow(Math.sin((2 * currentTheta - Math.PI) / 24), 5));
        }

        const x = centerX + r * Math.cos(currentTheta);
        const y = centerY - r * Math.sin(currentTheta);

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
    }

  }, [t, type, a, b, k, colorScheme]);

  const handlePreset = (preset: ClassicPreset) => {
    setType(preset.type);
    setA(preset.a);
    setB(preset.b);
    setK(preset.k);
    setT(0);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-4">
        <div className="relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <canvas 
            ref={canvasRef} 
            width={800} 
            height={500} 
            className="w-full h-auto bg-slate-950"
          />
          <div className="absolute top-4 left-4 flex gap-2">
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 rounded-lg text-white transition"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button 
              onClick={() => setT(0)}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 rounded-lg text-white transition"
            >
              <RotateCcw size={20} />
            </button>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex items-start gap-3">
          <Info className="text-cyan-400 shrink-0 mt-0.5" size={18} />
          <p className="text-xs text-slate-400 leading-relaxed">
            {CLASSIC_PRESETS.find(p => p.type === type && (type !== 'rose' || p.k === k))?.description || '探索各種經典幾何曲線的數學美感。'}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="text-cyan-400" size={20} />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">曲線參數控制</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase mb-2 block">曲線類型</label>
              <select 
                value={type} 
                onChange={(e) => setType(e.target.value as ClassicCurveType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <option value="rose">玫瑰線 (Rose)</option>
                <option value="lemniscate">雙紐線 (Lemniscate)</option>
                <option value="archimedean">阿基米德螺線</option>
                <option value="logarithmic">對數螺線</option>
                <option value="butterfly">蝴蝶曲線 (Butterfly)</option>
              </select>
            </div>

            {type === 'rose' && (
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase mb-2 block">花瓣參數 (k): {k}</label>
                <input 
                  type="range" min="1" max="10" step="1" value={k}
                  onChange={(e) => setK(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>
            )}

            {(type === 'rose' || type === 'lemniscate' || type === 'archimedean' || type === 'logarithmic') && (
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase mb-2 block">尺寸參數 (a): {a}</label>
                <input 
                  type="range" min="10" max="250" step="1" value={a}
                  onChange={(e) => setA(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>
            )}

            {(type === 'archimedean' || type === 'logarithmic') && (
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase mb-2 block">增長係數 (b): {b}</label>
                <input 
                  type="range" min="0.01" max="20" step="0.01" value={b}
                  onChange={(e) => setB(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>
            )}

            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase mb-2 block">繪製速度: {speed}</label>
              <input 
                type="range" min="0.5" max="10" step="0.5" value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-[10px] text-slate-500 font-bold uppercase mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" />
            快速預設
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {CLASSIC_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handlePreset(preset)}
                className="text-left px-3 py-2 rounded-lg text-xs bg-slate-950 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 transition text-slate-400 hover:text-cyan-400"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
