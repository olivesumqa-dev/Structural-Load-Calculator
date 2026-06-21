/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  X, 
  HelpCircle, 
  ShieldAlert, 
  Activity, 
  Wind, 
  ChevronRight, 
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

interface TutorialSidebarProps {
  onClose: () => void;
}

export default function TutorialSidebar({ onClose }: TutorialSidebarProps) {
  return (
    <div className="h-full bg-white border-l border-slate-200 p-5 overflow-y-auto space-y-6 text-xs text-slate-600">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4.5 h-4.5 text-indigo-600 animate-bounce" />
          <h3 className="font-extrabold text-slate-800 text-sm">Engineering Study Guide & Tutorial</h3>
        </div>
        <button 
          onClick={onClose} 
          className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded hover:bg-slate-100"
          title="Minimize guide"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Guide 1: Understanding Load Flow Path */}
      <div className="space-y-2">
        <h4 className="font-bold text-slate-800 text-xs border-b pb-1 flex items-center gap-1">
          <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />
          Concrete Frame Load Path Workflow
        </h4>
        <p className="leading-relaxed">
          The structural design flow propagates downward through continuous monolithic elements:
        </p>
        <div className="p-3 bg-slate-50 rounded-lg border space-y-1.5 font-medium text-slate-700">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-slate-200 text-[10px] flex items-center justify-center font-bold">1</span>
            Slab Pressure Area (kPa)
          </div>
          <p className="text-[10px] font-normal text-slate-500 pl-5">Slab self weights, floor tiles, partitions, plaster layer and occupant LL.</p>
          
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-slate-200 text-[10px] flex items-center justify-center font-bold">2</span>
            Beam Distributed Load (kN/m)
          </div>
          <p className="text-[10px] font-normal text-slate-500 pl-5">Beam self-weight and wall masonry direct loads added to slab tributary results.</p>
          
          <div className="flex items-center gap-1.5 font-semibold text-sky-800">
            <span className="w-4 h-4 rounded-full bg-sky-100 text-[10px] flex items-center justify-center font-bold">3</span>
            Column Point Reactions (kN)
          </div>
          <p className="text-[10px] font-normal text-slate-500 pl-5">Equivalent beam support end shear reactions accumulate downwards as axial column compression loads.</p>
        </div>
      </div>

      {/* Guide 2: Tributary Area Polygons */}
      <div className="space-y-2">
        <h4 className="font-bold text-slate-800 text-xs border-b pb-1 flex items-center gap-1">
          <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />
          How Tributary Area Works (45° Lines)
        </h4>
        <p className="leading-relaxed text-slate-500">
          In two-way monolithic concrete slabs, load paths disperse at 45-degree angles from the corners. This produces two shape types on supporting beams:
        </p>
        <ul className="space-y-2 pl-2">
          <li className="flex items-start gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              <strong>Trapezoid Shape:</strong> Formed on long spans (L &ge; 2H). Equivalent width transferred is <code className="bg-slate-50 font-mono text-[10px] px-1 py-0.2">H * (1 - H/L)</code>.
            </span>
          </li>
          <li className="flex items-start gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              <strong>Triangle Shape:</strong> Formed on short spans (L &lt; 2H) when corner lines intersect before reaching the middle. Peak height = <code className="bg-slate-50 font-mono text-[10px] px-1 py-0.2">L / 2</code>, equivalent width is <code className="bg-slate-50 font-mono text-[10px] px-1 py-0.2">L / 4</code>.
            </span>
          </li>
        </ul>
      </div>

      {/* Guide 3: Concentrated (Point) Loads */}
      <div className="space-y-2">
        <h4 className="font-bold text-slate-800 text-xs border-b pb-1 flex items-center gap-1">
          <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />
          Adding Span Concentrated Loads
        </h4>
        <p className="leading-relaxed">
          Heavy auxiliary facilities (plumbing shafts, air conditioners, water pumps, elevator pulleys) transmit load as discrete point concentrated forces (PL):
        </p>
        <ul className="list-disc pl-4 space-y-1 text-slate-500">
          <li>Select the case (DL, SDL, LL) on the left sidebar.</li>
          <li>Enter the magnitude in kN and the distance relative to the left column node support.</li>
          <li>The app recalculates reactions: R_L = P(L-a)/L and R_R = Pa/L, transmitting them down columns.</li>
        </ul>
      </div>

      {/* Guide 4: Wind & Seismic Load Calculation */}
      <div className="space-y-2">
        <h4 className="font-bold text-slate-800 text-xs border-b pb-1 flex items-center gap-1">
          <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />
          Wind & Seismic Lateral Mechanics
        </h4>
        <p className="leading-relaxed text-slate-500">
          Lateral shear demands are applied as boundary static forces:
        </p>
        <ul className="space-y-2">
          <li className="flex items-start gap-1.5">
            <Wind className="w-4 h-4 text-cyan-500 shrink-0" />
            <span>
              <strong>Static Wind:</strong> Evaluates ASCE velocity profile <code className="bg-slate-50 font-mono text-[10px] px-0.5">q_z = 0.613 * Kz * Kzt * Kd * V^2</code>. Multiplied by building length and level heights to derive storey demand forces.
            </span>
          </li>
          <li className="flex items-start gap-1.5">
            <Activity className="w-4 h-4 text-rose-500 shrink-0" />
            <span>
              <strong>Static Seismic:</strong> First calculates the lumped mass of each level (concrete slab volume, beam columns weight, exterior walls). Determines foundational periods, design base shears, and scales storey forces using height exponent vertical distributions.
            </span>
          </li>
        </ul>
      </div>

      {/* SAFETY WARNING MANDATE PANEL */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 space-y-2">
        <div className="text-amber-850 font-extrabold flex items-center gap-1.5 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          CRITICAL SAFETY COMPLIANCE WARNING
        </div>
        <ul className="list-disc pl-4 space-y-1 text-amber-900 leading-normal">
          <li>This tool prepares structural loading schedules for engineering review. It is not a substitute for professional structural design.</li>
          <li>All code-standard coefficients, occupancy load combinations, wind gusts, and soil zones must be verified against current localized code manuals.</li>
          <li>Do not accept defaults blindly. Review the verified assumptions ledger before exporting reports.</li>
          <li>Irregular structural frames, soft storeys, transfer configurations, and high seismic risk zones require dynamic/modal space structural analysis.</li>
        </ul>
      </div>

    </div>
  );
}
