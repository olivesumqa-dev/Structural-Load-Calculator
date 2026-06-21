/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProjectState, GeometryState, PointLoad, LoadCombination, FormulaTrace, AssumptionItem } from './types';

// Helper to round numbers for traces
export function roundTo(val: number, decimals: number): number {
  if (isNaN(val) || !isFinite(val)) return 0;
  const multiplier = Math.pow(10, decimals);
  return Math.round(val * multiplier) / multiplier;
}

/**
 * Calculates the geometry details such as elevations and cumulative heights.
 * Level 0 is the foundation level (elevation = 0)
 */
export function getLevelElevations(geometry: GeometryState): number[] {
  const elevations: number[] = [0];
  let currentElev = 0;
  for (let i = 0; i < geometry.numLevels; i++) {
    const h = geometry.storeyHeights[i] || 3.0;
    currentElev += h;
    elevations.push(currentElev);
  }
  return elevations; // length numLevels + 1
}

/**
 * Calculates Kz exposure coefficient based on elevation z (m) and ASCE 7 profiles
 */
export function getExposureCoefficientKz(z: number, exposure: 'B' | 'C' | 'D'): number {
  if (z <= 0) z = 1.0;
  // ASCE 7: Kz = 2.01 * (z / zg)^(2/alpha)
  // Exposure B: alpha = 7.0, zg = 365.76 m
  // Exposure C: alpha = 9.5, zg = 274.32 m
  // Exposure D: alpha = 11.5, zg = 213.36 m
  let alpha = 9.5;
  let zg = 274.32;
  
  if (exposure === 'B') {
    alpha = 7.0;
    zg = 365.76;
  } else if (exposure === 'D') {
    alpha = 11.5;
    zg = 213.36;
  }

  const Kz = 2.01 * Math.pow(z / zg, 2 / alpha);
  
  // Lower bounds per ASCE 7
  if (exposure === 'B') return Math.max(0.57, Kz);
  if (exposure === 'C') return Math.max(0.70, Kz);
  return Math.max(0.80, Kz);
}

/**
 * Structural Tributary Calculation for Two-Way slab panels
 * Given a span L and tributary height H (where H is H1 or H2):
 * If L >= 2*H: It's a trapezoidal area. Area = H*L - H^2, equivalent uniform width is H * (1 - H/L).
 * If L < 2*H: It's a triangular area. Area = L^2 / 4, equivalent uniform width is L / 4.
 */
export interface TributaryGeometry {
  areaAbove: number;
  widthAbove: number;
  areaBelow: number;
  widthBelow: number;
  totalArea: number;
  totalEquivalentWidth: number;
  shapeDescriptionAbove: string;
  shapeDescriptionBelow: string;
}

export function calculateSpanTributary(L: number, H_above: number, H_below: number, slabType: string): TributaryGeometry {
  if (slabType === 'one-way-x') {
    // For One-way slab transferring load perpendicular to the beam axis:
    // The beam receives half of the adjacent panel spacing above and below as a uniform line load.
    const areaAbove = L * (H_above / 2);
    const areaBelow = L * (H_below / 2);
    return {
      areaAbove,
      widthAbove: H_above / 2,
      areaBelow,
      widthBelow: H_below / 2,
      totalArea: areaAbove + areaBelow,
      totalEquivalentWidth: (H_above + H_below) / 2,
      shapeDescriptionAbove: `One-way rect (Half-span=${roundTo(H_above/2, 2)}m)`,
      shapeDescriptionBelow: `One-way rect (Half-span=${roundTo(H_below/2, 2)}m)`,
    };
  } else if (slabType === 'one-way-y') {
    // One-way slab oriented parallel to the beam, so loads transfer to perpendicular girders. Beam gets 0 slab load.
    return {
      areaAbove: 0,
      widthAbove: 0,
      areaBelow: 0,
      widthBelow: 0,
      totalArea: 0,
      totalEquivalentWidth: 0,
      shapeDescriptionAbove: 'One-way parallel (Loads transfer to Girders)',
      shapeDescriptionBelow: 'One-way parallel (Loads transfer to Girders)',
    };
  } else if (slabType === 'manual') {
    // Manual fallback
    const areaAbove = L * (H_above / 2) * 0.5;
    const areaBelow = L * (H_below / 2) * 0.5;
    return {
      areaAbove,
      widthAbove: (H_above / 2) * 0.5,
      areaBelow,
      widthBelow: (H_below / 2) * 0.5,
      totalArea: areaAbove + areaBelow,
      totalEquivalentWidth: ((H_above + H_below) / 2) * 0.5,
      shapeDescriptionAbove: 'Manual Override (50% area)',
      shapeDescriptionBelow: 'Manual Override (50% area)',
    };
  } else {
    // Two-way tributary (Trapezoid or Triangle) per yield line theory
    // The tributary height is h_t = H / 2
    
    // Above panel:
    let areaAbove = 0;
    let widthAbove = 0;
    let descAbove = '';
    if (H_above <= 0) {
      descAbove = 'No Slab Above';
    } else {
      const h_t = H_above / 2; // peak tributary height
      if (L >= 2 * h_t) {
        // Trapezoidal area
        areaAbove = h_t * (L - h_t);
        widthAbove = h_t * (1 - h_t / (2 * L)); // exact average tributary width
        descAbove = `Trapezoid (h_t=${roundTo(h_t, 2)}m, peak=${roundTo(h_t, 2)}m)`;
      } else {
        // Triangular area
        areaAbove = Math.pow(L, 2) / 4;
        widthAbove = L / 4; // average tributary width (Area / L)
        descAbove = `Triangle (Base=${roundTo(L, 2)}m, height=${roundTo(L/2, 2)}m)`;
      }
    }

    // Below panel:
    let areaBelow = 0;
    let widthBelow = 0;
    let descBelow = '';
    if (H_below <= 0) {
      descBelow = 'No Slab Below';
    } else {
      const h_t = H_below / 2; // peak tributary height
      if (L >= 2 * h_t) {
        // Trapezoidal area
        areaBelow = h_t * (L - h_t);
        widthBelow = h_t * (1 - h_t / (2 * L)); // exact average tributary width
        descBelow = `Trapezoid (h_t=${roundTo(h_t, 2)}m, peak=${roundTo(h_t, 2)}m)`;
      } else {
        // Triangular area
        areaBelow = Math.pow(L, 2) / 4;
        widthBelow = L / 4; // average tributary width
        descBelow = `Triangle (Base=${roundTo(L, 2)}m, height=${roundTo(L/2, 2)}m)`;
      }
    }

    return {
      areaAbove,
      widthAbove,
      areaBelow,
      widthBelow,
      totalArea: areaAbove + areaBelow,
      totalEquivalentWidth: widthAbove + widthBelow,
      shapeDescriptionAbove: descAbove,
      shapeDescriptionBelow: descBelow,
    };
  }
}

/**
 * Calculates structural loads on each beam span at each level.
 * Returns array of objects detailing the calculated values and formulas.
 */
export interface BeamLoadResult {
  levelIndex: number;
  levelName: string;
  spanIndex: number;
  beamLabel: string;
  L: number;
  tributary: TributaryGeometry;
  
  // Section dimensions (after overrides)
  b: number; // width in mm
  h: number; // depth in mm
  slabThickness: number; // slab thickness in mm

  // Distributed Load cases (kN/m)
  slab_SW: number;
  beam_SW: number;
  SDL: number;
  LL: number;
  wall_load: number;
  parapet_load: number;
  
  // Equivalent point load contribution (kN/m)
  point_DL_eq: number;
  point_LL_eq: number;
  
  // Split totals for column transfer verification
  dist_DL_only: number;
  dist_LL_only: number;
  
  // Totals (includes distributed + equivalents)
  service_DL: number; // Total DL
  service_LL: number; // Total LL
}

export function computeBeamLoads(project: ProjectState, slabType: string): BeamLoadResult[] {
  const { geometry, memberSizes, memberOverrides, materials } = project;
  const results: BeamLoadResult[] = [];
  const elevations = getLevelElevations(geometry);

  // Loop through each level from 1 to numLevels
  for (let l = 1; l <= geometry.numLevels; l++) {
    const isRoof = l === geometry.numLevels && geometry.includeRoof;
    const storeyH = geometry.storeyHeights[l - 1] || 3.0;

    for (let s = 0; s < geometry.numGrids - 1; s++) {
      const L = geometry.spanLengths[s] || 5.0;
      
      // Determine beam sizes (considering overrides)
      const b = project.memberOverrides.beamWidths[`${l}-${s}`] ?? memberSizes.beamWidth;
      const h = project.memberOverrides.beamDepths[`${l}-${s}`] ?? memberSizes.beamDepth;

      // Slab dimensions
      const h_above = geometry.tribWidthAbove;
      const h_below = geometry.tribWidthBelow;

      const trib = calculateSpanTributary(L, h_above, h_below, slabType);

      // Calculations
      // 1. Slab self weight line load
      // slab_SW_kPa = slabThickness_m * concreteUnitWeight
      const slabThk = project.memberOverrides.slabThicknesses?.[`${l}-${s}`] ?? memberSizes.slabThickness;
      const slabThickness_m = slabThk / 1000;
      const slab_SW_kPa = slabThickness_m * materials.concUnitWeight;
      const slab_SW_kN_m = trib.totalEquivalentWidth * slab_SW_kPa;

      // 2. Beam self weight
      // beam_SW_kN_m = b_m * h_m * concreteUnitWeight
      const b_m = b / 1000;
      const h_m = h / 1000;
      const beam_SW_kN_m = b_m * h_m * materials.concUnitWeight;

      // 3. SDL line load
      // For floor: floorFinish + partition + ceiling + mep
      // For roof: waterproofing + roofing + roofTiles + ceiling + mep
      const slab_SDL_kPa = isRoof
        ? materials.waterproofing + materials.roofing + materials.roofTiles + materials.ceiling + materials.mepAllowance
        : materials.floorFinish + materials.partitionLoad + materials.ceiling + materials.mepAllowance;
      const SDL_kN_m = trib.totalEquivalentWidth * slab_SDL_kPa;

      // 4. LL line load
      const live_kPa = isRoof ? materials.roofLiveLoad : materials.liveLoadOccupancy;
      const LL_kN_m = trib.totalEquivalentWidth * live_kPa;

      // 5. Wall load (applied if not top level roof, or depending on partition style)
      let wall_load_kN_m = 0;
      if (!isRoof) {
        // wall self weight = thickness * height * concrete or wall spec
        const wallThickness_m = memberSizes.wallThickness / 1000;
        const wall_H = storeyH - h_m; // actual wall height (clear height of storey)
        wall_load_kN_m = wallThickness_m * wall_H * materials.wallUnitWeight;
        // add plaster (both sides)
        wall_load_kN_m += 2 * wall_H * materials.plasterUnitWeight;
      }

      // 6. Parapet load (top level roof only)
      let parapet_load_kN_m = 0;
      if (isRoof && geometry.includeParapet) {
        const parapetThickness_m = memberSizes.parapetThickness / 1000;
        parapet_load_kN_m = parapetThickness_m * geometry.parapetHeight * materials.concUnitWeight;
      }

      const slab_SW_val = project.memberOverrides.slabSWs?.[`${l}-${s}`] ?? slab_SW_kN_m;
      const beam_SW_val = project.memberOverrides.beamSWs?.[`${l}-${s}`] ?? beam_SW_kN_m;
      const SDL_val = project.memberOverrides.SDLs?.[`${l}-${s}`] ?? SDL_kN_m;
      const LL_val = project.memberOverrides.LLs?.[`${l}-${s}`] ?? LL_kN_m;
      const wall_load_val = project.memberOverrides.wallLoads?.[`${l}-${s}`] ?? wall_load_kN_m;

      const dist_DL_only = slab_SW_val + beam_SW_val + SDL_val + wall_load_val + parapet_load_kN_m;
      const dist_LL_only = LL_val;

      // 7. Concentrated point load mechanical equivalence:
      // P at distance 'a' on beam L. Peak moment is P*a*b/L. 
      // Uniform load eq producing same peak moment is w_eq = 8*P*a*(L-a) / L^3.
      let point_DL_eq = 0;
      let point_LL_eq = 0;
      const beamPLs = project.pointLoads.filter(pl => pl.active && pl.levelIndex === l && pl.beamIndex === s);
      
      for (const pl of beamPLs) {
        if (L > 0) {
          const a = pl.distance;
          const b_dist = L - a;
          const equivFactor = (8 * a * b_dist) / Math.pow(L, 3);
          const eqForce = pl.magnitude * equivFactor;
          
          if (pl.case === 'DL' || pl.case === 'SDL') {
            point_DL_eq += eqForce;
          } else if (pl.case === 'LL') {
            point_LL_eq += eqForce;
          }
        }
      }

      const total_DL_kN_m = dist_DL_only + point_DL_eq;
      const total_LL_kN_m = dist_LL_only + point_LL_eq;

      const beamLabel = `B${l}${String.fromCharCode(97 + s)}`; // B1a, B1b, etc.

      results.push({
        levelIndex: l,
        levelName: geometry.levelNames[l] || `Level-${l}`,
        spanIndex: s,
        beamLabel,
        L,
        tributary: trib,
        b,
        h,
        slabThickness: slabThk,
        slab_SW: slab_SW_val,
        beam_SW: beam_SW_val,
        SDL: SDL_val,
        LL: dist_LL_only,
        wall_load: wall_load_val,
        parapet_load: parapet_load_kN_m,
        point_DL_eq,
        point_LL_eq,
        dist_DL_only,
        dist_LL_only,
        service_DL: total_DL_kN_m,
        service_LL: total_LL_kN_m,
      });
    }
  }

  return results;
}

/**
 * Interface detailing column loads, accumulated level-by-level
 */
export interface ColumnLoadResult {
  levelIndex: number; // level of column storey (Column supporting Level i)
  levelName: string;
  gridIndex: number; // grid C1, C2, etc
  columnLabel: string; // e.g., C1a supporting level 1
  
  // Cross section
  b: number;
  h: number;

  // Direct loads from beams at this level
  leftBeamReaction_DL: number;
  leftBeamReaction_LL: number;
  rightBeamReaction_DL: number;
  rightBeamReaction_LL: number;
  
  // Point load reactions transferred directly to column
  pointDL: number;
  pointLL: number;

  // Column self-weight of this storey
  column_SW: number;

  // Axial load at this level (beam reactions + col self-weight)
  levelServiceDL: number;
  levelServiceLL: number;

  // Cumulative loads from top level down to this level
  accumulatedDL: number;
  accumulatedLL: number;
  
  // Wind/Seismic accumulated design axial loads
  windForceAxial: number; // axial force from overturning, estimated or custom lateral shear
  seismicForceAxial: number;
  
  notes: string;
}

export function computeColumnLoads(
  project: ProjectState,
  beamLoads: BeamLoadResult[]
): ColumnLoadResult[] {
  const { geometry, memberSizes, memberOverrides, materials, pointLoads } = project;
  const numLevels = geometry.numLevels;
  const numGrids = geometry.numGrids;
  const elevations = getLevelElevations(geometry);

  const resultsMap: Record<string, ColumnLoadResult> = {};

  // Level-by-level computation starting from the roof (Level numLevels) down to Level 1
  for (let l = numLevels; l >= 1; l--) {
    const storeyH = geometry.storeyHeights[l - 1] || 3.0;

    for (let c = 0; c < numGrids; c++) {
      // Determine column sizes (considering overrides)
      const b = memberOverrides.columnWidths[`${l}-${c}`] ?? memberSizes.columnWidth;
      const h = memberOverrides.columnDepths[`${l}-${c}`] ?? memberSizes.columnDepth;

      // 1. Column self weight
      const b_m = b / 1000;
      const h_m = h / 1000;
      const column_SW = b_m * h_m * storeyH * materials.concUnitWeight;

      // 2. Beam Reactions
      // Beam to the left is span c - 1
      let leftBeamReaction_DL = 0;
      let leftBeamReaction_LL = 0;
      if (c > 0) {
        const leftBeam = beamLoads.find(bl => bl.levelIndex === l && bl.spanIndex === c - 1);
        if (leftBeam) {
          // React from distributed loads ONLY: excluding point load equivalent to avoid double counting!
          leftBeamReaction_DL = (leftBeam.dist_DL_only * leftBeam.L) / 2;
          leftBeamReaction_LL = (leftBeam.dist_LL_only * leftBeam.L) / 2;
        }
      }

      // Beam to the right is span c
      let rightBeamReaction_DL = 0;
      let rightBeamReaction_LL = 0;
      if (c < numGrids - 1) {
        const rightBeam = beamLoads.find(bl => bl.levelIndex === l && bl.spanIndex === c);
        if (rightBeam) {
          // React from distributed loads ONLY: excluding point load equivalent to avoid double counting!
          rightBeamReaction_DL = (rightBeam.dist_DL_only * rightBeam.L) / 2;
          rightBeamReaction_LL = (rightBeam.dist_LL_only * rightBeam.L) / 2;
        }
      }

      // 3. Point load reactions transferred to this column
      let pointDL = 0;
      let pointLL = 0;

      // Filter point loads on this level
      const currentLevelPointLoads = pointLoads.filter(pl => pl.active && pl.levelIndex === l);
      for (const pl of currentLevelPointLoads) {
        // Is it on left span?
        if (c > 0 && pl.beamIndex === c - 1) {
          const leftBeam = beamLoads.find(bl => bl.levelIndex === l && bl.spanIndex === c - 1);
          if (leftBeam) {
            // Reaction at right support of left beam
            const reac = (pl.magnitude * pl.distance) / leftBeam.L;
            if (pl.case === 'DL' || pl.case === 'SDL') pointDL += reac;
            else if (pl.case === 'LL') pointLL += reac;
          }
        }
        // Is it on right span?
        if (c < numGrids - 1 && pl.beamIndex === c) {
          const rightBeam = beamLoads.find(bl => bl.levelIndex === l && bl.spanIndex === c);
          if (rightBeam) {
            // Reaction at left support of right beam
            const reac = (pl.magnitude * (rightBeam.L - pl.distance)) / rightBeam.L;
            if (pl.case === 'DL' || pl.case === 'SDL') pointDL += reac;
            else if (pl.case === 'LL') pointLL += reac;
          }
        }
      }

      const levelServiceDL = leftBeamReaction_DL + rightBeamReaction_DL + pointDL + column_SW;
      const levelServiceLL = leftBeamReaction_LL + rightBeamReaction_LL + pointLL;

      // Accumulation from levels above
      let accumulatedDL = levelServiceDL;
      let accumulatedLL = levelServiceLL;

      if (l < numLevels) {
        const aboveColumnKey = `${l + 1}-${c}`;
        const aboveCol = resultsMap[aboveColumnKey];
        if (aboveCol) {
          accumulatedDL += aboveCol.accumulatedDL;
          accumulatedLL += aboveCol.accumulatedLL;
        }
      }

      const columnLabel = `C${l}${String.fromCharCode(97 + c)}`;

      resultsMap[`${l}-${c}`] = {
        levelIndex: l,
        levelName: geometry.levelNames[l] || `Level-${l}`,
        gridIndex: c,
        columnLabel,
        b,
        h,
        leftBeamReaction_DL,
        leftBeamReaction_LL,
        rightBeamReaction_DL,
        rightBeamReaction_LL,
        pointDL,
        pointLL,
        column_SW,
        levelServiceDL,
        levelServiceLL,
        accumulatedDL,
        accumulatedLL,
        windForceAxial: 0, // updated in lateral solver
        seismicForceAxial: 0,
        notes: `Axial prep for Support C-${c+1}`,
      };
    }
  }

  // Convert map to array ordered by Level index descending and Grid index ascending
  const finalList: ColumnLoadResult[] = [];
  for (let l = numLevels; l >= 1; l--) {
    for (let c = 0; c < numGrids; c++) {
      if (resultsMap[`${l}-${c}`]) {
        finalList.push(resultsMap[`${l}-${c}`]);
      }
    }
  }
  return finalList;
}

/**
 * Equivalent static seismic calculations
 */
export interface SeismicLevelSummary {
  levelIndex: number;
  levelName: string;
  z_height: number; // elevation from ground
  W_level: number; // kN (Seismic Weight)
  C_vx: number; // vertical distribution factor
  F_level: number; // kN (Storey seismic force)
  V_shear: number; // kN (Storey shear force)
  M_overturning: number; // kN-m
  notes: string;
}

export interface SeismicCalcResult {
  totalSeismicWeight: number; // W (kN)
  periodT: number; // sec (approx period)
  baseShearV: number; // V (kN)
  k_exponent: number;
  levelForces: SeismicLevelSummary[];
  traces: FormulaTrace[];
}

export function computeSeismicLoads(project: ProjectState, beamLoads: BeamLoadResult[]): SeismicCalcResult {
  const { geometry, memberSizes, memberOverrides, materials, seismic } = project;
  const elevations = getLevelElevations(geometry);
  const numLevels = geometry.numLevels;

  // 1. Calculate the weight of each level
  const wForces: number[] = [];
  const levelForces: SeismicLevelSummary[] = [];

  let totalWeight = 0;

  for (let l = 1; l <= numLevels; l++) {
    const isRoof = l === numLevels && geometry.includeRoof;
    const storeyH = geometry.storeyHeights[l - 1] || 3.0;

    // Direct manual override
    if (seismic.manualLevelWeightOverrides[l] !== undefined) {
      wForces.push(seismic.manualLevelWeightOverrides[l]);
      totalWeight += seismic.manualLevelWeightOverrides[l];
      continue;
    }

    // Otherwise, compute from geometry!
    // Slab area * (Slab thickness * conc weight + SDL + occup LL percent)
    const storeyArea = geometry.buildingPlanWidth * geometry.buildingPlanLength;
    
    let levelSlabThk = memberSizes.slabThickness;
    const overridenThks: number[] = [];
    if (memberOverrides && memberOverrides.slabThicknesses) {
      for (let s = 0; s < geometry.numGrids - 1; s++) {
        const thk = memberOverrides.slabThicknesses[`${l}-${s}`];
        if (thk !== undefined) {
          overridenThks.push(thk);
        }
      }
    }
    if (overridenThks.length > 0) {
      levelSlabThk = overridenThks.reduce((a, b) => a + b, 0) / overridenThks.length;
    }
    const slabThickness_m = levelSlabThk / 1000;
    
    // Slab self weight + SDL
    const slab_weight_kPa = slabThickness_m * materials.concUnitWeight;
    const sdl_kPa = isRoof
      ? materials.waterproofing + materials.roofing + materials.roofTiles + materials.ceiling + materials.mepAllowance
      : materials.floorFinish + materials.partitionLoad + materials.ceiling + materials.mepAllowance;
    
    // Seismic portion of Live Load
    const ll_kPa = isRoof ? materials.roofLiveLoad : materials.liveLoadOccupancy;
    const ll_seismic_portion_kPa = ll_kPa * (seismic.percentageLiveLoadInWeight / 100);

    const slab_load_kPa = slab_weight_kPa + sdl_kPa + ll_seismic_portion_kPa;
    const slab_total_kN = storeyArea * slab_load_kPa;

    // Beams of this frame line, multiplied by number of frame lines (estimated)
    // To represent total building weight.
    // Total beams approximate volume: beam self-weight * frame line spans * (building perpendicular width / trib width approx)
    // Let's approximate total building weight by multiplying our single-frame beam & wall weights by estimated number of frames
    // Number of frames = total plan width / (Trib width above + below) -> approx
    const approxNumFrames = Math.max(1.0, geometry.buildingPlanWidth / (geometry.tribWidthAbove + geometry.tribWidthBelow));

    let frame_beams_weight_kN = 0;
    for (let s = 0; s < geometry.numGrids - 1; s++) {
      const L = geometry.spanLengths[s] || 5.0;
      const b = memberOverrides.beamWidths[`${l}-${s}`] ?? memberSizes.beamWidth;
      const h = memberOverrides.beamDepths[`${l}-${s}`] ?? memberSizes.beamDepth;
      frame_beams_weight_kN += (b / 1000) * (h / 1000) * L * materials.concUnitWeight;
    }
    const total_beams_weight_kN = frame_beams_weight_kN * approxNumFrames;

    // Columns weight
    let frame_col_weight_kN = 0;
    for (let c = 0; c < geometry.numGrids; c++) {
      const cb = memberOverrides.columnWidths[`${l}-${c}`] ?? memberSizes.columnWidth;
      const ch = memberOverrides.columnDepths[`${l}-${c}`] ?? memberSizes.columnDepth;
      frame_col_weight_kN += (cb / 1000) * (ch / 1000) * storeyH * materials.concUnitWeight;
    }
    const total_columns_weight_kN = frame_col_weight_kN * approxNumFrames;

    // Exterior walls weight
    let total_walls_weight_kN = 0;
    if (seismic.includeWalls && !isRoof) {
      const wallPerimeter = 2 * (geometry.buildingPlanWidth + geometry.buildingPlanLength);
      const wallThickness_m = memberSizes.wallThickness / 1000;
      const wall_H_clear = storeyH - (memberSizes.beamDepth / 1000);
      total_walls_weight_kN = wallPerimeter * wallThickness_m * wall_H_clear * materials.wallUnitWeight;
    }

    // Parapet height on roof
    let total_parapet_weight_kN = 0;
    if (isRoof && geometry.includeParapet && seismic.includeParapet) {
      const wallPerimeter = 2 * (geometry.buildingPlanWidth + geometry.buildingPlanLength);
      const perpThickness_m = memberSizes.parapetThickness / 1000;
      total_parapet_weight_kN = wallPerimeter * perpThickness_m * geometry.parapetHeight * materials.concUnitWeight;
    }

    const levelWeight = slab_total_kN + total_beams_weight_kN + total_columns_weight_kN + total_walls_weight_kN + total_parapet_weight_kN;

    wForces.push(levelWeight);
    totalWeight += levelWeight;
  }

  // 2. Approximate Period T
  // T = Ct * Hn^x (for concrete moment frames, Ct = 0.0731, x = 0.75 in ASCE)
  const totalHeight = elevations[numLevels];
  const Ct = 0.0731;
  const x = 0.75;
  const periodT = Ct * Math.pow(totalHeight, x);

  // 3. Vertical distribution exponent k
  // k = 1 for T <= 0.5, k = 2 for T >= 2.5, interpolated in between
  let k_exponent = 1.0;
  if (periodT > 0.5 && periodT < 2.5) {
    k_exponent = 1.0 + 0.5 * (periodT - 0.5);
  } else if (periodT >= 2.5) {
    k_exponent = 2.0;
  }

  // 4. Base Shear Coefficient Cs
  // Cs = Z * I / R or (S_ds * I / R)
  // Let's use ASCE formulation: S_ds = 2.5 * S_s / 3 * site soil coefficient...
  // Or simple Filipino NSCP: Cs = Cv * I / (R * T)
  // Let's model a realistic base shear:
  // Cv = 0.40 * 1.5 = 0.60 for typical Zone 4 stiff soil site
  // Cs = Cv * I / (R * T)
  // Let's approximate Cs = (ZoneFactor * 2.5 * Importance) / R.
  // With zoneFactor defaulting to 0.40, Cs = 0.40 * 2.5 * 1.0 / 8.5 = 0.1176.
  // Let's make seismic base shear V = Cs * W
  const zoneCa = seismic.zoneFactor === 0.4 ? 0.4 : seismic.zoneFactor * 1.0;
  let Cs = (2.5 * zoneCa * seismic.importance) / seismic.responseModification;
  
  // Bounds checks
  const Cs_min = 0.11 * zoneCa * seismic.importance;
  const Cs_max = (1.2 * zoneCa * seismic.importance) / (seismic.responseModification * Math.pow(periodT, 2/3));
  if (Cs > Cs_max) Cs = Cs_max;
  if (Cs < Cs_min) Cs = Cs_min;

  const baseShearV = Cs * totalWeight;

  // 5. Vertical distribution of base shear to each level F_i
  // F_i = (W_i * h_i^k) / sum(W_j * h_j^k) * V_bar
  let sumW_Hk = 0;
  for (let l = 1; l <= numLevels; l++) {
    const W_i = wForces[l - 1];
    const h_i = elevations[l];
    sumW_Hk += W_i * Math.pow(h_i, k_exponent);
  }

  let accumulatedShear = baseShearV;
  for (let l = numLevels; l >= 1; l--) {
    const W_i = wForces[l - 1];
    const h_i = elevations[l];
    const hk = Math.pow(h_i, k_exponent);
    const C_vx = sumW_Hk > 0 ? (W_i * hk) / sumW_Hk : 0;
    
    const F_level = C_vx * baseShearV;
    const V_shear = accumulatedShear;
    accumulatedShear -= F_level; // column shear decreases going down

    // Overturning moment at current level = Sum of F_j * (h_j - h_i) for all levels j >= i
    let M_overturning = 0;
    for (let j = l; j <= numLevels; j++) {
      const F_j = (sumW_Hk > 0 ? (wForces[j - 1] * Math.pow(elevations[j], k_exponent)) / sumW_Hk : 0) * baseShearV;
      M_overturning += F_j * (elevations[j] - elevations[l]);
    }

    levelForces.push({
      levelIndex: l,
      levelName: geometry.levelNames[l] || `Level-${l}`,
      z_height: h_i,
      W_level: W_i,
      C_vx,
      F_level,
      V_shear,
      M_overturning,
      notes: `Seismic force distribution Level-${l}`,
    });
  }

  levelForces.reverse(); // put Level 1 first, Roof last

  // Create Formula Trace logs
  const traces: FormulaTrace[] = [
    {
      expression: 'T = Ct * Hn^x',
      substitution: `T = 0.0731 * (${roundTo(totalHeight, 2)}m)^0.75`,
      result: `${roundTo(periodT, 3)} s`,
      description: 'Approximate structural fundamental period (ASCE 7 / NSCP)',
    },
    {
      expression: 'k = Period vertical exponent',
      substitution: `k = 1.0 + 0.5 * (${roundTo(periodT, 3)} - 0.5)`,
      result: `${roundTo(k_exponent, 3)}`,
      description: 'Force distribution vertical exponent based on T',
    },
    {
      expression: 'Cs_design = (2.5 * Ca * I) / R (bounded by Cs_min & Cs_max)',
      substitution: `Cs = (2.5 * ${zoneCa} * ${seismic.importance}) / ${seismic.responseModification}`,
      result: `${roundTo(Cs, 4)}`,
      description: 'Seismic Response Coefficient (Base Shear Factor)',
    },
    {
      expression: 'V = Cs * W',
      substitution: `V = ${roundTo(Cs, 4)} * ${roundTo(totalWeight, 2)} kN`,
      result: `${roundTo(baseShearV, 2)} kN`,
      description: 'Total seismic lateral base shear of building',
    },
  ];

  return {
    totalSeismicWeight: totalWeight,
    periodT,
    baseShearV,
    k_exponent,
    levelForces,
    traces,
  };
}

/**
 * Equivalent static wind calculations
 */
export interface WindLevelSummary {
  levelIndex: number;
  levelName: string;
  z_height: number; // elevation from ground
  K_z: number; // exposure coeff
  q_z: number; // velocity pressure (kPa)
  p_windward: number; // net pressure at level (kPa)
  projectedArea: number; // m² (projected tributary area of storey)
  F_wind: number; // kN (Total storey lateral force)
  F_frame: number; // kN (Share transferred to this frame)
}

export interface WindCalcResult {
  baseShearV: number; // total force parallel to wind direction
  overturningMoment: number; // kN-m
  levelWindForces: WindLevelSummary[];
  traces: FormulaTrace[];
}

export function computeWindLoads(project: ProjectState): WindCalcResult {
  const { geometry, memberSizes, wind } = project;
  const elevations = getLevelElevations(geometry);
  const numLevels = geometry.numLevels;

  // Convert basic wind speed to m/s
  let speed_m_s = wind.speed;
  if (wind.speedUnit === 'kph') {
    speed_m_s = wind.speed / 3.6;
  } else if (wind.speedUnit === 'mph') {
    speed_m_s = wind.speed * 0.44704;
  }

  // Velocity pressure at roof level (qh)
  const z_roof = elevations[numLevels];
  const Kz_roof = getExposureCoefficientKz(z_roof, wind.exposure);
  // q = 0.613 * Kz * Kzt * Kd * V^2 * I * 10^-3 (kPa)
  const q_roof_kpa = 0.613 * Kz_roof * wind.topographic * wind.directionality * Math.pow(speed_m_s, 2) * wind.importance / 1000;

  const levelWindForces: WindLevelSummary[] = [];
  let totalWindForce = 0;
  let totalOverturningMoment = 0;

  for (let l = 1; l <= numLevels; l++) {
    const isRoof = l === numLevels && geometry.includeRoof;
    const storeyH = geometry.storeyHeights[l - 1] || 3.0;
    const z_level = elevations[l];

    const K_z = getExposureCoefficientKz(z_level, wind.exposure);
    
    let q_z = 0.613 * K_z * wind.topographic * wind.directionality * Math.pow(speed_m_s, 2) * wind.importance / 1000; // kPa

    // Net pressure p
    let p_windward = 0;
    if (wind.manualPressureOverride) {
      p_windward = wind.customPressureKpa;
    } else {
      // p = q_z * G * Cp_windward - q_h * G * Cp_leeward
      const p_wind = q_z * wind.gust * wind.externalPressureWindward;
      const p_lee = q_roof_kpa * wind.gust * wind.externalPressureLeeward;
      p_windward = p_wind + p_lee; // Total wind design pressure acting (windward + leeward)
    }

    // Projected Tributary Area of the storey
    // Area of wall facing directory of wind.
    // Storey tributary height is half storey height below + half storey height above
    let tribH = storeyH;
    if (l === numLevels) {
      tribH = storeyH / 2;
      if (geometry.includeParapet) {
        tribH += geometry.parapetHeight;
      }
    } else {
      const nextStoreyH = geometry.storeyHeights[l] || 3.0;
      tribH = (storeyH + nextStoreyH) / 2;
    }

    // Width exposed is length normal to wind
    // Default to maximum dimension of building plan
    const exposedWidth = geometry.buildingPlanWidth;
    const projectedArea = tribH * exposedWidth;

    const F_wind = p_windward * projectedArea;
    const F_frame = F_wind * (geometry.frameSharePercent / 100);

    totalWindForce += F_wind;
    totalOverturningMoment += F_frame * z_level;

    levelWindForces.push({
      levelIndex: l,
      levelName: geometry.levelNames[l] || `Level-${l}`,
      z_height: z_level,
      K_z,
      q_z,
      p_windward,
      projectedArea,
      F_wind,
      F_frame,
    });
  }

  // Construct highly detailed, standard-based engineering formula traces
  let exp_z_g = 274.32;
  let exp_alpha = 9.5;
  if (wind.exposure === 'B') {
    exp_z_g = 365.76;
    exp_alpha = 7.0;
  } else if (wind.exposure === 'D') {
    exp_z_g = 213.36;
    exp_alpha = 11.5;
  }

  const traces: FormulaTrace[] = [
    {
      expression: 'V_m_s = Basic Speed conversion to SI (m/s)',
      substitution: `${wind.speed} ${wind.speedUnit} = ${wind.speed} * ${wind.speedUnit === 'kph' ? '1/3.6' : wind.speedUnit === 'mph' ? '0.447' : '1'}`,
      result: `${roundTo(speed_m_s, 2)} m/s`,
      description: 'Design basic wind speed converted from regional unit to SI metric unit.',
    },
    {
      expression: `Kz = 2.01 * (z_roof / zg)^(2 / alpha) (for Exposure ${wind.exposure})`,
      substitution: `2.01 * (${roundTo(z_roof, 2)} m / ${exp_z_g} m)^(2 / ${exp_alpha}) [Lower limit: ${wind.exposure === 'B' ? '0.57' : wind.exposure === 'C' ? '0.70' : '0.80'}]`,
      result: `${roundTo(Kz_roof, 3)}`,
      description: `Velocity exposure coefficient Kz at Roof height (${roundTo(z_roof, 2)} m per ASCE 7 / NSCP).`,
    },
    {
      expression: 'qh = 0.613 * Kz * Kzt * Kd * V² * I * 10^-3',
      substitution: `0.613 * ${roundTo(Kz_roof, 3)} * ${wind.topographic} (Kzt) * ${wind.directionality} (Kd) * (${roundTo(speed_m_s, 2)})^2 * ${wind.importance} (I) * 10^-3`,
      result: `${roundTo(q_roof_kpa, 3)} kPa`,
      description: 'Velocity pressure acting at roof level elevation h (ASCE 7 Ch 30 / NSCP Sec 207).',
    },
    {
      expression: 'p_design = G * (qz * Cp_windward - qh * Cp_leeward)',
      substitution: `${wind.gust} * (qz * ${wind.externalPressureWindward} - ${roundTo(q_roof_kpa, 2)} * ${-wind.externalPressureLeeward})`,
      result: 'Varies per elevation (Windward pressure + Leeward suction)',
      description: 'Net design wind pressure on the structural main wind force resisting system (MWFRS).',
    },
    {
      expression: 'F_frame = P_design_total * A_exposed * (FrameShare / 100)',
      substitution: `Sum of (P_design_level * Level_Area_exposed) * (${geometry.frameSharePercent}%)`,
      result: `${roundTo(totalWindForce * (geometry.frameSharePercent / 100), 2)} kN`,
      description: 'Total lateral wind design load transferred as point shear forces to the structural frame line.',
    },
  ];

  return {
    baseShearV: totalWindForce * (geometry.frameSharePercent / 100),
    overturningMoment: totalOverturningMoment,
    levelWindForces,
    traces,
  };
}

/**
 * Calculates combinations of the loads for Beams and Columns
 */
export interface ComboValueResult {
  comboId: string;
  comboName: string;
  totalDL: number;
  totalLL: number;
  lateral: number;
  factoredTotal: number;
}

export function computeBeamFactoredLoads(
  beam: BeamLoadResult,
  combos: LoadCombination[],
  windForces: WindLevelSummary[],
  seismicForces: SeismicLevelSummary[]
): ComboValueResult[] {
  const result: ComboValueResult[] = [];

  // Wind and seismic force details at this level to beam
  const levelWind = windForces.find(w => w.levelIndex === beam.levelIndex);
  const wl_force = levelWind ? levelWind.F_frame : 0; // vertical lateral component or direct axial
  
  const levelSeis = seismicForces.find(s => s.levelIndex === beam.levelIndex);
  const eql_force = levelSeis ? levelSeis.F_level * (seismicForces[0] ? 0.25 : 1) : 0; // estimated shared frame lateral force

  // Evaluate each active combo
  for (const combo of combos.filter(c => c.active)) {
    const fDL = combo.factors.DL ?? 0;
    const fSDL = combo.factors.SDL ?? fDL; // fallback to general D case
    const fLL = combo.factors.LL ?? 0;
    const fRLL = combo.factors.RLL ?? fLL;
    const fWL = combo.factors.WL ?? 0;
    const fEQL = combo.factors.EQL ?? 0;

    // Component calculation (excluding point loads for line-load combination)
    // Beam line load combo
    const factoredDL = fDL * (beam.beam_SW + beam.slab_SW + beam.wall_load + beam.parapet_load) + fSDL * beam.SDL;
    const factoredLL = fLL * beam.LL;
    
    // Wind and seismic forces as lateral line distributed loads (simplified component for vertical combinations)
    // Dynamic lateral framing moments usually increase vertical shear/moment, represented by load combination inclusion:
    const factoredTotal = factoredDL + factoredLL; // standard design for gravity beams. Lateral causes framing moments.

    result.push({
      comboId: combo.id,
      comboName: combo.name,
      totalDL: factoredDL,
      totalLL: factoredLL,
      lateral: fWL * wl_force + fEQL * eql_force,
      factoredTotal,
    });
  }

  return result;
}

export function computeColumnFactoredLoads(
  col: ColumnLoadResult,
  combos: LoadCombination[]
): ComboValueResult[] {
  const result: ComboValueResult[] = [];

  for (const combo of combos.filter(c => c.active)) {
    const fDL = combo.factors.DL ?? 0;
    const fSDL = combo.factors.SDL ?? fDL;
    const fLL = combo.factors.LL ?? 0;
    const fWL = combo.factors.WL ?? 0;
    const fEQL = combo.factors.EQL ?? 0;

    // Direct axial accumulation combination
    // Factored axial weight = fDL * (ColSW + reactionDLs + pointDLs) + fSDL * (SDL reacts) + fLL * (LL reacts)
    const dlPortion = col.accumulatedDL; // includes SW, and beam reactions of structural DL + SDL
    const llPortion = col.accumulatedLL;

    // Approximate lateral overturning axial force:
    // M_overturning of wind and seismic causes compressive and tensile forces in column lines.
    // Simple estimation for columns: axial compression = Overturning moment / outer column grid distance approx
    // We can simulate this cleanly or report it separately!
    const lateralAxial = fWL * col.windForceAxial + fEQL * col.seismicForceAxial;

    const factoredTotal = fDL * dlPortion + fLL * llPortion + lateralAxial;

    result.push({
      comboId: combo.id,
      comboName: combo.name,
      totalDL: fDL * dlPortion,
      totalLL: fLL * llPortion,
      lateral: lateralAxial,
      factoredTotal,
    });
  }

  return result;
}

/**
 * Builds the comprehensive Assumptions Log items from project configs
 */
export function buildAssumptionsLog(project: ProjectState): AssumptionItem[] {
  const { codeStandard, geometry, memberSizes, materials, wind, seismic } = project;
  const list: AssumptionItem[] = [
    {
      parameter: 'Concrete Unit Weight',
      value: materials.concUnitWeight.toString(),
      unit: 'kN/m³',
      source: 'default',
      notes: 'Used for self-weights of slabs, beams, columns, and concrete parapets',
    },
    {
      parameter: 'Slab Design Thickness',
      value: memberSizes.slabThickness.toString(),
      unit: 'mm',
      source: 'user input',
      notes: 'Yields solid slab self weight load layer',
    },
    {
      parameter: 'Live Load Occupancy Value',
      value: materials.liveLoadOccupancy.toString(),
      unit: 'kPa',
      source: 'user input',
      notes: 'Based on occupancy classifications in selected code standard',
    },
    {
      parameter: 'Basic wind speed',
      value: wind.speed.toString(),
      unit: wind.speedUnit,
      source: 'user input',
      notes: 'Design wind speed from geographic standards',
    },
    {
      parameter: 'Wind Exposure classification',
      value: wind.exposure,
      unit: 'Category',
      source: 'user input',
      notes: 'Affects boundary layer terrain multiplier Kz',
    },
    {
      parameter: 'Seismic Zone factor Z',
      value: seismic.zoneFactor.toString(),
      unit: 'Coeff',
      source: 'user input',
      notes: 'Specifies peak ground acceleration zone factor',
    },
    {
      parameter: 'Response modification coefficient R',
      value: seismic.responseModification.toString(),
      unit: 'Factor',
      source: 'default',
      notes: 'Relates to system ductility (e.g. Special Moment Resisting RC Frame R=8.5)',
    },
    {
      parameter: 'Slab Tributary Area Width Above',
      value: geometry.tribWidthAbove.toString(),
      unit: 'm',
      source: 'user input',
      notes: 'Perpendicular width H2',
    },
    {
      parameter: 'Slab Tributary Area Width Below',
      value: geometry.tribWidthBelow.toString(),
      unit: 'm',
      source: 'user input',
      notes: 'Perpendicular width H1',
    },
  ];

  return list;
}
