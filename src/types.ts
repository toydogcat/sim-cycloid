/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CycloidType = 'cycloid' | 'epicycloid' | 'hypocycloid' | 'epitrochoid' | 'hypotrochoid';

export interface CycloidParams {
  type: CycloidType;
  R: number; // Fixed circle radius
  r: number; // Rolling circle radius
  d: number; // Pen distance
  speed: number; // Animation step size / multiplier
  showCircles: boolean;
  showRulers: boolean;
  colorScheme: string; // 'rainbow' | 'neon' | 'cyan' | 'sunset'
  maxTurns: number; // Max revolutions of rolling circle
}

export type BrachPathType = 'brachistochrone' | 'linear' | 'parabola' | 'arc' | 'broken';

export interface PathData {
  id: BrachPathType;
  name: string;
  color: string;
  points: { x: number; y: number }[];
  times: number[]; // T_i for each point P_i
  speeds: number[]; // v_i for each point P_i
  arrivalTime: number; // T_{N-1}
  isCompleted: boolean;
}

export interface PhysicsParams {
  g: number; // Gravity (m/s^2)
  drag: number; // Drag / Air resistance coefficient (beta)
  beadSize: number; // Radius of beads
  speedFactor: number; // Simulation speed factor
}

export type ClassicCurveType = 'rose' | 'archimedean' | 'logarithmic' | 'lemniscate' | 'butterfly';

export interface ClassicCurveParams {
  type: ClassicCurveType;
  a: number;
  b: number;
  k: number;
  colorScheme: string;
}
