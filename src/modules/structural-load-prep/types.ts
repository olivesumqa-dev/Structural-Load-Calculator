/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CodeStandard = 'nscp' | 'american' | 'eurocode' | 'custom';

export type SlabPanelType = 'one-way-x' | 'one-way-y' | 'two-way' | 'manual';

export interface GeometryState {
  numGrids: number; // 2 to 7
  gridLabels: string[]; // ["A", "B", ...]
  spanLengths: number[]; // size numGrids - 1, in meters L1..L6
  numLevels: number; // 1 to 12
  levelNames: string[]; // ["Level-0", "Level-1", "Roof", ...]
  storeyHeights: number[]; // size numLevels, in meters H1..H12
  includeRoof: boolean;
  includeParapet: boolean;
  parapetHeight: number; // m
  buildingPlanWidth: number; // m
  buildingPlanLength: number; // m
  tribWidthAbove: number; // m (H2)
  tribWidthBelow: number; // m (H1)
  frameSharePercent: number; // e.g. 100% or 20%
  buildingDirection: 'X' | 'Y' | 'both';
}

export interface MemberSizes {
  slabThickness: number; // mm
  beamWidth: number; // mm
  beamDepth: number; // mm
  girderWidth: number; // mm
  girderDepth: number; // mm
  columnWidth: number; // mm
  columnDepth: number; // mm
  wallThickness: number; // mm
  parapetThickness: number; // mm
}

export interface MemberOverrides {
  beamWidths: Record<string, number>; // key: "LevelIndex-SpanIndex" - mm
  beamDepths: Record<string, number>; // key: "LevelIndex-SpanIndex" - mm
  columnWidths: Record<string, number>; // key: "LevelIndex-GridIndex" - mm
  columnDepths: Record<string, number>; // key: "LevelIndex-GridIndex" - mm
  slabThicknesses?: Record<string, number>; // key: "LevelIndex-SpanIndex" - mm
  slabSWs?: Record<string, number>; // key: "LevelIndex-SpanIndex" - kN/m
  beamSWs?: Record<string, number>; // key: "LevelIndex-SpanIndex" - kN/m
  SDLs?: Record<string, number>; // key: "LevelIndex-SpanIndex" - kN/m
  LLs?: Record<string, number>; // key: "LevelIndex-SpanIndex" - kN/m
  wallLoads?: Record<string, number>; // key: "LevelIndex-SpanIndex" - kN/m
}

export interface MaterialsState {
  concUnitWeight: number; // kN/m³
  plainConcUnitWeight: number; // kN/m³
  wallUnitWeight: number; // kN/m³
  plasterUnitWeight: number; // kPa
  floorFinish: number; // kPa
  ceiling: number; // kPa
  roofing: number; // kPa
  roofTiles: number; // kPa
  waterproofing: number; // kPa
  partitionLoad: number; // kPa
  mepAllowance: number; // kPa
  liveLoadOccupancy: number; // kPa
  roofLiveLoad: number; // kPa
}

export interface PointLoad {
  id: string;
  case: 'DL' | 'SDL' | 'LL' | 'WL' | 'EQL';
  levelIndex: number; // index inside levels (1..numLevels)
  beamIndex: number; // 0..numSpans-1
  magnitude: number; // kN
  distance: number; // m from left column
  direction: 'downward' | 'upward' | 'horizontal' | 'moment';
  description: string;
  active: boolean;
}

export interface WindState {
  speed: number; // basic wind speed (kph, m/s, or mph)
  speedUnit: 'kph' | 'm/s' | 'mph';
  exposure: 'B' | 'C' | 'D';
  importance: number;
  directionality: number; // Kd
  topographic: number; // Kzt
  gust: number; // Gf
  internalPressure: number; // GCpi
  externalPressureWindward: number; // Cp
  externalPressureLeeward: number; // Cp
  enclosure: 'enclosed' | 'partially-enclosed' | 'open';
  manualPressureOverride: boolean;
  customPressureKpa: number;
}

export interface SeismicState {
  zoneFactor: number; // e.g., Z = 0.40 OR Cv/Ca parameters
  siteClass: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  importance: number; // I
  responseModification: number; // R
  sysType: string;
  percentageLiveLoadInWeight: number; // e.g. 25% for warehouses, 0% for residential
  includeRoof: boolean;
  includeWalls: boolean;
  includeParapet: boolean;
  manualLevelWeightOverrides: Record<number, number>; // level index -> weight in kN
}

export interface LoadCombination {
  id: string;
  name: string;
  factors: {
    DL?: number;
    SDL?: number;
    LL?: number;
    RLL?: number;
    WL?: number;
    EQL?: number;
    PL?: number; // point load custom multiplier if factored separately, otherwise follows its assigned case
  };
  active: boolean;
}

export interface FormulaTrace {
  expression: string;
  substitution: string;
  result: string;
  description: string;
}

export interface AssumptionItem {
  parameter: string;
  value: string;
  unit: string;
  source: 'default' | 'user input' | 'computed' | 'overridden';
  notes: string;
}

export interface ProjectState {
  id: string;
  name: string;
  designer: string;
  location?: string;
  owner?: string;
  date: string;
  codeStandard: CodeStandard;
  geometry: GeometryState;
  memberSizes: MemberSizes;
  memberOverrides: MemberOverrides;
  materials: MaterialsState;
  pointLoads: PointLoad[];
  wind: WindState;
  seismic: SeismicState;
  loadCombinations: LoadCombination[];
}
