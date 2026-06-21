/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProjectState, LoadCombination } from './types';
import { BeamLoadResult, ColumnLoadResult, getLevelElevations, roundTo } from './calculators';

export interface BeamCombinationOutput {
  beamLabel: string;
  levelIndex: number;
  spanIndex: number;
  serviceDL: number;
  serviceLL: number;
  governingComboName: string;
  maxWu: number;
  conclusion: string;
  allWu: { comboId: string; comboName: string; wu: number }[];
}

export interface ColumnCombinationOutput {
  columnLabel: string;
  gridIndex: number;
  levelIndex: number;
  serviceDL: number; // accumulated
  serviceLL: number; // accumulated
  governingCompressComboName: string;
  maxPuCompress: number;
  governingUpliftComboName: string;
  minPuCompress: number; // lowest value (positive compression, negative denotes tension/uplift)
  overturningDeltaWind: number; // +/- fluctuation
  overturningDeltaSeis: number; // +/- fluctuation
  conclusion: string;
}

export interface LateralConclusionOutput {
  windBaseShear: number;
  seismicBaseShear: number;
  governingLateralCase: 'Seismic' | 'Wind';
  governingLateralForce: number;
  percentDifference: number;
  conclusionText: string;
}

export interface FinalLoadingConclusion {
  beams: BeamCombinationOutput[];
  columns: ColumnCombinationOutput[]; // Critical Level 1/Foundation columns
  lateral: LateralConclusionOutput;
}

/**
 * Computes governing factored load combinations for beams, columns, and lateral.
 */
export function computeFinalConclusions(
  project: ProjectState,
  beamLoads: BeamLoadResult[],
  columnLoads: ColumnLoadResult[],
  windForces: any,
  seismicForces: any
): FinalLoadingConclusion {
  const { geometry } = project;
  const numLevels = geometry.numLevels;
  const numGrids = geometry.numGrids;
  const activeCombos = project.loadCombinations.filter(c => c.active);

  const elevations = getLevelElevations(geometry);
  const totalLength = geometry.spanLengths.reduce((a, b) => a + b, 0);

  // 1. LATERAL ANALYSIS
  const windV = windForces?.baseShearV ?? 0;
  const seisV = seismicForces?.baseShearV ?? 0;
  const govLateralCase = seisV >= windV ? 'Seismic' : 'Wind';
  const govLateralForce = Math.max(windV, seisV);
  const minV = Math.min(windV, seisV);
  const pctDiff = minV > 0 ? ((govLateralForce - minV) / minV) * 100 : 0;

  let latConclusion = '';
  if (govLateralCase === 'Seismic') {
    latConclusion = `Seismic loading governs lateral frame action (V_seismic = ${roundTo(seisV, 2)} kN vs. V_wind = ${roundTo(windV, 2)} kN, exceeding by ${roundTo(pctDiff, 1)}%). Use seismic factored load combinations (e.g. 1.2D + 1.0E + 1.0L) for lateral drift, diaphragms, and moment frame structural bending analysis. Check wind combinations for local facade cladding stability.`;
  } else {
    latConclusion = `Wind loading governs lateral frame action (V_wind = ${roundTo(windV, 2)} kN vs. V_seismic = ${roundTo(seisV, 2)} kN, exceeding by ${roundTo(pctDiff, 1)}%). Use wind load combinations (e.g. 1.2D + 1.0W + 1.0L) for main force resisting frame bending and lateral sway stability checks under high wind pressure.`;
  }

  const lateralOutput: LateralConclusionOutput = {
    windBaseShear: windV,
    seismicBaseShear: seisV,
    governingLateralCase: govLateralCase,
    governingLateralForce: govLateralForce,
    percentDifference: pctDiff,
    conclusionText: latConclusion
  };

  // 2. BEAM COMBINATIONS & CONSTRAINTS
  // We compute wu for each combination:
  // wu = c.factors.DL * (slab_SW + beam_SW + SDL + wall + parapet) + c.factors.LL * LL + factors.PL * PL_DL + factors.LL * PL_LL
  const beamOutputs: BeamCombinationOutput[] = beamLoads.map(b => {
    const dLoads = b.slab_SW + b.beam_SW + b.SDL + b.wall_load + b.parapet_load;
    const lLoads = b.LL; // dist_LL_only
    const pl_DL = b.point_DL_eq;
    const pl_LL = b.point_LL_eq;

    const allWu = activeCombos.map(c => {
      const f_DL = c.factors.DL ?? 1.0;
      const f_LL = c.factors.LL ?? 0.0;
      const f_PL = c.factors.PL ?? f_DL;
      const wu = (f_DL * dLoads) + (f_LL * lLoads) + (f_PL * pl_DL) + (f_LL * pl_LL);
      return {
        comboId: c.id,
        comboName: c.name,
        wu: roundTo(wu, 3)
      };
    });

    // Find governing (maximum wu)
    let maxWu = -Infinity;
    let govName = 'N/A';
    allWu.forEach(item => {
      if (item.wu > maxWu) {
        maxWu = item.wu;
        govName = item.comboName;
      }
    });

    if (maxWu === -Infinity) {
      maxWu = dLoads + lLoads + pl_DL + pl_LL;
      govName = 'Service (D+L)';
    }

    let conclusionText = '';
    const hasPointLoad = (b.point_DL_eq > 0 || b.point_LL_eq > 0);
    if (hasPointLoad) {
      conclusionText = `Gravity + concentrated load governs span. Use governing design load w_u = ${roundTo(maxWu, 2)} kN/m for gravity flexural moment analysis. Design for localized midspan shears and peak positive span bending contribution.`;
    } else if (b.levelIndex === numLevels && geometry.includeRoof) {
      conclusionText = `Roof wind/uplift combination governs stability checks, while gravity loads control typical reinforcement. Use governing gravity w_u = ${roundTo(maxWu, 2)} kN/m for slab-girder moments.`;
    } else {
      conclusionText = `Gravity distributed load governs typical span. Design with governing factoring combo yielding w_u = ${roundTo(maxWu, 2)} kN/m. Suitable for ultimate strength design of beam span.`;
    }

    return {
      beamLabel: b.beamLabel,
      levelIndex: b.levelIndex,
      spanIndex: b.spanIndex,
      serviceDL: dLoads + pl_DL,
      serviceLL: lLoads + pl_LL,
      governingComboName: govName,
      maxWu,
      conclusion: conclusionText,
      allWu
    };
  });

  // 3. COLUMN OVERTURNING ESTIMATION & COMBINATIONS
  // Total base overturning moment estimator:
  let windM_base = 0;
  if (windForces?.levelWindForces) {
    windForces.levelWindForces.forEach((wf: any) => {
      const h_i = elevations[wf.levelIndex] ?? 0;
      windM_base += wf.F_frame * h_i;
    });
  }

  let seisM_base = 0;
  if (seismicForces?.levelForces) {
    seismicForces.levelForces.forEach((lf: any) => {
      const h_i = elevations[lf.levelIndex] ?? 0;
      seisM_base += lf.F_level * h_i;
    });
  }

  // Delta P variable on outermost grids (0 and numGrids-1)
  const deltaP_wind_max = totalLength > 0 ? windM_base / totalLength : 0;
  const deltaP_seis_max = totalLength > 0 ? seisM_base / totalLength : 0;

  // Filter columns at critical basement / Level 1 (carrying accumulated load of entire structure)
  const bottomColumns = columnLoads.filter(c => c.levelIndex === 1);

  const colOutputs: ColumnCombinationOutput[] = bottomColumns.map(col => {
    const P_D = col.accumulatedDL;
    const P_L = col.accumulatedLL;

    // Is it an outermost column?
    let delP_wind = 0;
    let delP_seis = 0;
    if (col.gridIndex === 0) {
      // Leftmost - lateral forces from left cause tension (-) on Grid A
      delP_wind = -deltaP_wind_max;
      delP_seis = -deltaP_seis_max;
    } else if (col.gridIndex === numGrids - 1) {
      // Rightmost - lateral forces from left cause compression (+) on Grid D
      delP_wind = deltaP_wind_max;
      delP_seis = deltaP_seis_max;
    }

    // Compute factored axial force for each combination
    // Compression Max evaluation (adding absolute values of overturning contribution for worst compression)
    let maxPuCompress = -Infinity;
    let compressGovName = 'N/A';

    // Uplift Min compression evaluation (subtracting overturning or checking uplift cases)
    let minPuCompress = Infinity;
    let upliftGovName = 'N/A';

    activeCombos.forEach(c => {
      const f_DL = c.factors.DL ?? 1.0;
      const f_LL = c.factors.LL ?? 0.0;
      const f_WL = c.factors.WL ?? 0.0;
      const f_EQL = c.factors.EQL ?? 0.0;

      // Compression check: worst compression happens when earthquake/wind adds load
      // For worst compression:
      const Pu_comp_case = (f_DL * P_D) + (f_LL * P_L) + Math.abs(f_WL * delP_wind) + Math.abs(f_EQL * delP_seis);
      if (Pu_comp_case > maxPuCompress) {
        maxPuCompress = Pu_comp_case;
        compressGovName = c.name;
      }

      // Uplift checks: worst tension/ uplift occurs when overturning subtracts from dead load
      const Pu_uplift_case = (f_DL * P_D) + (f_LL * P_L) - Math.abs(f_WL * delP_wind) - Math.abs(f_EQL * delP_seis);
      if (Pu_uplift_case < minPuCompress) {
        minPuCompress = Pu_uplift_case;
        upliftGovName = c.name;
      }
    });

    if (maxPuCompress === -Infinity) {
      maxPuCompress = P_D + P_L;
      compressGovName = 'Service (D+L)';
    }
    if (minPuCompress === Infinity) {
      minPuCompress = P_D;
      upliftGovName = '0.9D';
    }

    let conclusionText = '';
    const isOuter = col.gridIndex === 0 || col.gridIndex === numGrids - 1;

    if (isOuter) {
      if (minPuCompress < 0) {
        conclusionText = `Critical Outer column subject to NET SEGREGATED UPLIFT FORCE of ${roundTo(Math.abs(minPuCompress), 1)} kN in governing tension combination. Design footings specifically for anchor tensile pull-out, pile tension, or increase foundation dead ballast weight. Max factored design compression load is P_u = ${roundTo(maxPuCompress, 1)} kN.`;
      } else if (minPuCompress < 0.2 * P_D) {
        conclusionText = `Outer column subject to partial gravity reduction and significant bending sway. Minimum stabilizing load is P_u_min = ${roundTo(minPuCompress, 1)} kN. Max factored compression controls column vertical reinforcement size (P_u_max = ${roundTo(maxPuCompress, 1)} kN).`;
      } else {
        conclusionText = `Outer framing column. Factored gravity loading governs compression (P_u_max = ${roundTo(maxPuCompress, 1)} kN). High lateral overturning moment fluctuation check has been evaluated, showing stable foundation compression of P_u_min = ${roundTo(minPuCompress, 1)} kN.`;
      }
    } else {
      conclusionText = `Core interior load-bearing column. Primarily gravity controlled axial load-accumulation. Design critical bottom column section for governing ultimate factored axial compression force P_u = ${roundTo(maxPuCompress, 1)} kN under combination [${compressGovName}]. Minimum bending influence.`;
    }

    return {
      columnLabel: col.columnLabel,
      gridIndex: col.gridIndex,
      levelIndex: col.levelIndex,
      serviceDL: P_D,
      serviceLL: P_L,
      governingCompressComboName: compressGovName,
      maxPuCompress,
      governingUpliftComboName: upliftGovName,
      minPuCompress,
      overturningDeltaWind: Math.abs(delP_wind),
      overturningDeltaSeis: Math.abs(delP_seis),
      conclusion: conclusionText
    };
  });

  return {
    beams: beamOutputs,
    columns: colOutputs,
    lateral: lateralOutput
  };
}
