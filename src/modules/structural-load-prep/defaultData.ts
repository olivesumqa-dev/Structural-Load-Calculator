/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProjectState, MaterialsState, GeometryState, MemberSizes, MemberOverrides, WindState, SeismicState, LoadCombination } from './types';

export const DEFAULT_MATERIALS: MaterialsState = {
  concUnitWeight: 24.0, // kN/m³
  plainConcUnitWeight: 23.5, // kN/m³
  wallUnitWeight: 18.0, // kN/m³
  plasterUnitWeight: 0.24, // kPa (for 2x10mm plaster)
  floorFinish: 1.10, // kPa
  ceiling: 0.15, // kPa
  roofing: 0.20, // kPa
  roofTiles: 0.75, // kPa
  waterproofing: 0.25, // kPa
  partitionLoad: 1.00, // kPa
  mepAllowance: 0.25, // kPa
  liveLoadOccupancy: 2.40, // kPa (office or classroom)
  roofLiveLoad: 1.00, // kPa
};

export const DEFAULT_MEMBER_SIZES: MemberSizes = {
  slabThickness: 125, // mm
  beamWidth: 250, // mm
  beamDepth: 400, // mm
  girderWidth: 300, // mm
  girderDepth: 600, // mm
  columnWidth: 400, // mm
  columnDepth: 400, // mm
  wallThickness: 150, // mm
  parapetThickness: 150, // mm
};

export const DEFAULT_WIND: WindState = {
  speed: 250, // kph (Philippines NSCP typical)
  speedUnit: 'kph',
  exposure: 'C',
  importance: 1.0,
  directionality: 0.85,
  topographic: 1.0,
  gust: 0.85,
  internalPressure: 0.18, // enclosed
  externalPressureWindward: 0.8,
  externalPressureLeeward: 0.5,
  enclosure: 'enclosed',
  manualPressureOverride: false,
  customPressureKpa: 1.2,
};

export const DEFAULT_SEISMIC: SeismicState = {
  zoneFactor: 0.4, // Zone 4
  siteClass: 'D', // Stiff soil
  importance: 1.0, // Standard occupancy
  responseModification: 8.5, // Special Reinforced Concrete Moment Frame
  sysType: 'Special RC Moment Frame',
  percentageLiveLoadInWeight: 25, // 25% for warehouse/storage, 0% for typical office/res
  includeRoof: false,
  includeWalls: true,
  includeParapet: true,
  manualLevelWeightOverrides: {},
};

export const NSCP_COMBINATIONS: LoadCombination[] = [
  { id: 'nscp-1', name: '1.4 D (Gravity)', factors: { DL: 1.4, SDL: 1.4, PL: 1.4 }, active: true },
  { id: 'nscp-2', name: '1.2 D + 1.6 L (Floor Gravity)', factors: { DL: 1.2, SDL: 1.2, LL: 1.6, PL: 1.2 }, active: true },
  { id: 'nscp-3', name: '1.2 D + 1.6 Lr + 1.0 L (Roof Gravity)', factors: { DL: 1.2, SDL: 1.2, LL: 1.0, RLL: 1.6, PL: 1.2 }, active: true },
  { id: 'nscp-4', name: '1.2 D + 1.0 W + 1.0 L (+Wind)', factors: { DL: 1.2, SDL: 1.2, WL: 1.0, LL: 1.0, PL: 1.2 }, active: true },
  { id: 'nscp-5', name: '1.2 D - 1.0 W + 1.0 L (-Wind)', factors: { DL: 1.2, SDL: 1.2, WL: -1.0, LL: 1.0, PL: 1.2 }, active: true },
  { id: 'nscp-6', name: '0.9 D + 1.0 W (Wind Uplift)', factors: { DL: 0.9, SDL: 0.9, WL: 1.0, PL: 0.9 }, active: true },
  { id: 'nscp-7', name: '0.9 D - 1.0 W (Wind Uplift)', factors: { DL: 0.9, SDL: 0.9, WL: -1.0, PL: 0.9 }, active: true },
  { id: 'nscp-8', name: '1.2 D + 1.0 E + 1.0 L (+Seismic)', factors: { DL: 1.2, SDL: 1.2, EQL: 1.0, LL: 1.0, PL: 1.2 }, active: true },
  { id: 'nscp-9', name: '1.2 D - 1.0 E + 1.0 L (-Seismic)', factors: { DL: 1.2, SDL: 1.2, EQL: -1.0, LL: 1.0, PL: 1.2 }, active: true },
  { id: 'nscp-10', name: '0.9 D + 1.0 E (Seismic Uplift)', factors: { DL: 0.9, SDL: 0.9, EQL: 1.0, PL: 0.9 }, active: true },
  { id: 'nscp-11', name: '0.9 D - 1.0 E (Seismic Uplift)', factors: { DL: 0.9, SDL: 0.9, EQL: -1.0, PL: 0.9 }, active: true },
];

export const AMERICAN_COMBINATIONS: LoadCombination[] = [
  { id: 'ascelrfd-1', name: '1.4 D', factors: { DL: 1.4, SDL: 1.4, PL: 1.4 }, active: true },
  { id: 'ascelrfd-2', name: '1.2D + 1.6L + 0.5Lr', factors: { DL: 1.2, SDL: 1.2, LL: 1.6, RLL: 0.5, PL: 1.2 }, active: true },
  { id: 'ascelrfd-3', name: '1.2D + 1.6Lr + 1.0L', factors: { DL: 1.2, SDL: 1.2, LL: 1.0, RLL: 1.6, PL: 1.2 }, active: true },
  { id: 'ascelrfd-4', name: '1.2D + 1.0W + 1.0L + 0.5Lr', factors: { DL: 1.2, SDL: 1.2, WL: 1.0, LL: 1.0, RLL: 0.5, PL: 1.2 }, active: true },
  { id: 'ascelrfd-5', name: '1.2D - 1.0W + 1.0L + 0.5Lr', factors: { DL: 1.2, SDL: 1.2, WL: -1.0, LL: 1.0, RLL: 0.5, PL: 1.2 }, active: true },
  { id: 'ascelrfd-6', name: '1.2D + 1.0E + 1.0L', factors: { DL: 1.2, SDL: 1.2, EQL: 1.0, LL: 1.0, PL: 1.2 }, active: true },
  { id: 'ascelrfd-7', name: '1.2D - 1.0E + 1.0L', factors: { DL: 1.2, SDL: 1.2, EQL: -1.0, LL: 1.0, PL: 1.2 }, active: true },
  { id: 'ascelrfd-8', name: '0.9D + 1.0W', factors: { DL: 0.9, SDL: 0.9, WL: 1.0, PL: 0.9 }, active: true },
  { id: 'ascelrfd-9', name: '0.9D - 1.0W', factors: { DL: 0.9, SDL: 0.9, WL: -1.0, PL: 0.9 }, active: true },
  { id: 'ascelrfd-10', name: '0.9D + 1.0E', factors: { DL: 0.9, SDL: 0.9, EQL: 1.0, PL: 0.9 }, active: true },
  { id: 'ascelrfd-11', name: '0.9D - 1.0E', factors: { DL: 0.9, SDL: 0.9, EQL: -1.0, PL: 0.9 }, active: true },
];

export const EUROCODE_COMBINATIONS: LoadCombination[] = [
  { id: 'ec-1', name: '1.35D (STR/GEO)', factors: { DL: 1.35, SDL: 1.35, PL: 1.35 }, active: true },
  { id: 'ec-2', name: '1.35D + 1.5L', factors: { DL: 1.35, SDL: 1.35, LL: 1.5, PL: 1.35 }, active: true },
  { id: 'ec-3', name: '1.35D + 1.5Lr', factors: { DL: 1.35, SDL: 1.35, RLL: 1.5, PL: 1.35 }, active: true },
  { id: 'ec-4', name: '1.35D + 1.5L + 0.9Lr', factors: { DL: 1.35, SDL: 1.35, LL: 1.5, RLL: 0.9, PL: 1.35 }, active: true },
  { id: 'ec-5', name: '1.35D + 1.5W', factors: { DL: 1.35, SDL: 1.35, WL: 1.5, PL: 1.35 }, active: true },
  { id: 'ec-6', name: '1.35D - 1.5W', factors: { DL: 1.35, SDL: 1.35, WL: -1.5, PL: 1.35 }, active: true },
  { id: 'ec-7', name: '1.0D + 1.0L + 1.5W', factors: { DL: 1.0, SDL: 1.0, LL: 1.0, WL: 1.5, PL: 1.0 }, active: true },
  { id: 'ec-8', name: '1.0D + 1.0L - 1.5W', factors: { DL: 1.0, SDL: 1.0, LL: 1.0, WL: -1.5, PL: 1.0 }, active: true },
  { id: 'ec-9', name: '1.0D + 1.0L + 1.0E', factors: { DL: 1.0, SDL: 1.0, LL: 1.0, EQL: 1.0, PL: 1.0 }, active: true },
  { id: 'ec-10', name: '1.0D + 1.0L - 1.0E', factors: { DL: 1.0, SDL: 1.0, LL: 1.0, EQL: -1.0, PL: 1.0 }, active: true },
];

export const CUSTOM_COMBINATIONS_TEMPLATE: LoadCombination[] = [
  { id: 'cust-1', name: '1.2 D + 1.6 L', factors: { DL: 1.2, SDL: 1.2, LL: 1.6, PL: 1.2 }, active: true },
  { id: 'cust-2', name: '1.0 D + 1.0 L', factors: { DL: 1.0, SDL: 1.0, LL: 1.0, PL: 1.0 }, active: true },
];

// Helper to construct sample geometries
export const SAMPLE_A_GEOMETRY: GeometryState = {
  numGrids: 4,
  gridLabels: ['A', 'B', 'C', 'D'],
  spanLengths: [6.0, 4.5, 6.0], // m
  numLevels: 3,
  levelNames: ['Foundation', 'Level-1', 'Level-2', 'Roof'], // indices 0 to 3
  storeyHeights: [4.0, 3.2, 3.2], // storey heights above foundation
  includeRoof: true,
  includeParapet: true,
  parapetHeight: 1.0,
  buildingPlanWidth: 15.0,
  buildingPlanLength: 16.5,
  tribWidthAbove: 4.0, // H2 = 4.0 m
  tribWidthBelow: 3.5, // H1 = 3.5 m
  frameSharePercent: 100, // This frame line takes 100% (or isolated structural strip)
  buildingDirection: 'X',
};

export const SAMPLE_A_MEMBER_OVERRIDES: MemberOverrides = {
  beamWidths: {},
  beamDepths: {},
  columnWidths: {},
  columnDepths: {},
};

export const SAMPLE_A_POINT_LOADS = [
  {
    id: 'pl-a-1',
    case: 'DL' as const,
    levelIndex: 2, // Level-2
    beamIndex: 1, // span BM-2
    magnitude: 35.0, // kN
    distance: 2.25, // m (midspan of 4.5m)
    direction: 'downward' as const,
    description: 'Mech Equipment Point Load',
    active: true,
  },
  {
    id: 'pl-a-2',
    case: 'LL' as const,
    levelIndex: 1, // Level-1
    beamIndex: 0, // span BM-1
    magnitude: 15.0,
    distance: 2.0,
    direction: 'downward' as const,
    description: 'Concentrated Live Load',
    active: true,
  },
];

export const SAMPLE_B_GEOMETRY: GeometryState = {
  numGrids: 7,
  gridLabels: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
  spanLengths: [5.5, 6.0, 4.5, 6.5, 5.0, 5.5], // m (spans L1..L6)
  numLevels: 12,
  levelNames: [
    'Foundation',
    'Level-1',
    'Level-2',
    'Level-3',
    'Level-4',
    'Level-5',
    'Level-6',
    'Level-7',
    'Level-8',
    'Level-9',
    'Level-10',
    'Level-11',
    'Roof',
  ],
  storeyHeights: [4.2, 3.1, 3.1, 3.1, 3.1, 3.1, 3.1, 3.1, 3.1, 3.1, 3.1, 3.1], // m
  includeRoof: true,
  includeParapet: true,
  parapetHeight: 1.2,
  buildingPlanWidth: 20.0,
  buildingPlanLength: 33.1,
  tribWidthAbove: 5.0, // H2 = 5m
  tribWidthBelow: 4.2, // H1 = 4.2m
  frameSharePercent: 25, // Takes 25% of wind/seismic
  buildingDirection: 'X',
};

// Larger columns at story levels
const buildSampleBOverrides = (): MemberOverrides => {
  const beamWidths: Record<string, number> = {};
  const beamDepths: Record<string, number> = {};
  const columnWidths: Record<string, number> = {};
  const columnDepths: Record<string, number> = {};

  // Columns: Level 1 to 4 are 600x600, 5 to 8 are 500x500, 9 to 12 are 400x400
  for (let l = 1; l <= 12; l++) {
    const size = l <= 4 ? 600 : l <= 8 ? 500 : 400;
    for (let c = 0; c < 7; c++) {
      columnWidths[`${l}-${c}`] = size;
      columnDepths[`${l}-${c}`] = size;
    }
  }

  return { beamWidths, beamDepths, columnWidths, columnDepths };
};

export const SAMPLE_B_POINT_LOADS = [
  {
    id: 'pl-b-1',
    case: 'DL' as const,
    levelIndex: 12, // Roof
    beamIndex: 3, // span BM-4 (6.5m)
    magnitude: 50.0,
    distance: 3.25,
    direction: 'downward' as const,
    description: 'Roof AC Unit',
    active: true,
  },
  {
    id: 'pl-b-2',
    case: 'LL' as const,
    levelIndex: 6, // Level-6
    beamIndex: 1, // BM-2 (6.0m)
    magnitude: 25.0,
    distance: 3.0,
    direction: 'downward' as const,
    description: 'Heavy Rack Load',
    active: true,
  },
];

export const SAMPLE_PROJECT_A: ProjectState = {
  id: 'sample-project-a',
  name: 'Sample Project A-3-Storey Frame',
  designer: 'Strucforge',
  location: 'Metro Manila, Philippines',
  owner: 'StrucForge Development Corp',
  date: '2026-06-20',
  codeStandard: 'nscp',
  geometry: SAMPLE_A_GEOMETRY,
  memberSizes: DEFAULT_MEMBER_SIZES,
  memberOverrides: SAMPLE_A_MEMBER_OVERRIDES,
  materials: DEFAULT_MATERIALS,
  pointLoads: SAMPLE_A_POINT_LOADS,
  wind: DEFAULT_WIND,
  seismic: DEFAULT_SEISMIC,
  loadCombinations: NSCP_COMBINATIONS,
};

export const SAMPLE_PROJECT_B: ProjectState = {
  id: 'sample-project-b',
  name: 'Sample Project B - 12-Storey High-Rise',
  designer: 'Strucforge',
  location: 'San Francisco, California, USA',
  owner: 'Pacific Heights Properties LLC',
  date: '2026-06-20',
  codeStandard: 'american',
  geometry: SAMPLE_B_GEOMETRY,
  memberSizes: DEFAULT_MEMBER_SIZES,
  memberOverrides: buildSampleBOverrides(),
  materials: {
    ...DEFAULT_MATERIALS,
    concUnitWeight: 24.5,
  },
  pointLoads: SAMPLE_B_POINT_LOADS,
  wind: {
    ...DEFAULT_WIND,
    speed: 140, // mph
    speedUnit: 'mph',
    exposure: 'C',
    gust: 0.85,
  },
  seismic: {
    ...DEFAULT_SEISMIC,
    zoneFactor: 0.5,
    siteClass: 'C',
    responseModification: 8.0,
  },
  loadCombinations: AMERICAN_COMBINATIONS,
};
