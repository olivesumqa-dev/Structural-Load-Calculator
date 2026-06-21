/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ProjectState, 
  CodeStandard, 
  GeometryState, 
  MemberSizes, 
  MaterialsState, 
  PointLoad, 
  WindState, 
  SeismicState, 
  LoadCombination 
} from '../types';
import { 
  NSCP_COMBINATIONS,
  AMERICAN_COMBINATIONS,
  EUROCODE_COMBINATIONS,
  CUSTOM_COMBINATIONS_TEMPLATE
} from '../defaultData';
import { 
  Settings, 
  ShieldAlert, 
  Grid3X3, 
  Flame, 
  Wind, 
  Activity, 
  Plus, 
  Trash2, 
  Sliders, 
  Check, 
  Info,
  Scale,
  Hammer
} from 'lucide-react';

interface SidebarPanelsProps {
  project: ProjectState;
  onChange: (updater: (prev: ProjectState) => ProjectState) => void;
  activeBeamId: string | null;
  activeColId: string | null;
  onClearSelection: () => void;
}

export default function SidebarPanels({
  project,
  onChange,
  activeBeamId,
  activeColId,
  onClearSelection
}: SidebarPanelsProps) {
  const [openSection, setOpenSection] = useState<string>('project');
  const [newPlCase, setNewPlCase] = useState<'DL' | 'SDL' | 'LL' | 'WL' | 'EQL'>('DL');
  const [newPlLevel, setNewPlLevel] = useState<number>(1);
  const [newPlBeam, setNewPlBeam] = useState<number>(0);
  const [newPlMag, setNewPlMag] = useState<number>(20);
  const [newPlDist, setNewPlDist] = useState<number>(2.5);
  const [newPlDesc, setNewPlDesc] = useState<string>('Equipment point load');

  const toggleSection = (section: string) => {
    setOpenSection(prev => prev === section ? '' : section);
  };

  const handleGeometryChange = (key: keyof GeometryState, value: any) => {
    onChange(prev => {
      const geo = { ...prev.geometry, [key]: value };
      
      // Sync grid labels
      if (key === 'numGrids') {
        const num = value as number;
        const labels = Array.from({ length: num }, (_, i) => String.fromCharCode(65 + i)); // A, B, C...
        let spans = [...geo.spanLengths];
        if (spans.length < num - 1) {
          while (spans.length < num - 1) spans.push(6.0);
        } else if (spans.length > num - 1) {
          spans = spans.slice(0, num - 1);
        }
        geo.gridLabels = labels;
        geo.spanLengths = spans;
      }

      // Sync level heights and names
      if (key === 'numLevels') {
        const num = value as number;
        let heights = [...geo.storeyHeights];
        if (heights.length < num) {
          while (heights.length < num) heights.push(3.0);
        } else if (heights.length > num) {
          heights = heights.slice(0, num);
        }
        
        const names = ['Foundation'];
        for (let i = 1; i < num; i++) {
          names.push(`Level-${i}`);
        }
        names.push(geo.includeRoof ? 'Roof' : `Level-${num}`);
        
        geo.levelNames = names;
        geo.storeyHeights = heights;
      }

      return { ...prev, geometry: geo };
    });
  };

  const handleSpanLengthChange = (idx: number, val: number) => {
    if (isNaN(val) || val <= 0) return;
    onChange(prev => {
      const spans = [...prev.geometry.spanLengths];
      spans[idx] = val;
      return {
        ...prev,
        geometry: { ...prev.geometry, spanLengths: spans }
      };
    });
  };

  const handleStoreyHeightChange = (idx: number, val: number) => {
    if (isNaN(val) || val <= 0) return;
    onChange(prev => {
      const heights = [...prev.geometry.storeyHeights];
      heights[idx] = val;
      return {
        ...prev,
        geometry: { ...prev.geometry, storeyHeights: heights }
      };
    });
  };

  // Quick Member Sizes Update
  const handleSizeChange = (key: keyof MemberSizes, val: number) => {
    onChange(prev => ({
      ...prev,
      memberSizes: { ...prev.memberSizes, [key]: val }
    }));
  };

  const handleMaterialChange = (key: keyof MaterialsState, val: number) => {
    onChange(prev => ({
      ...prev,
      materials: { ...prev.materials, [key]: val }
    }));
  };

  // Add Point Load
  const addPointLoad = () => {
    const pl: PointLoad = {
      id: `pl-${Date.now()}`,
      case: newPlCase,
      levelIndex: newPlLevel,
      beamIndex: newPlBeam,
      magnitude: newPlMag,
      distance: newPlDist,
      direction: 'downward',
      description: newPlDesc,
      active: true,
    };

    // Validation
    const maxDist = project.geometry.spanLengths[newPlBeam] || 6.0;
    if (pl.distance > maxDist) {
      pl.distance = maxDist / 2;
    }

    onChange(prev => ({
      ...prev,
      pointLoads: [...prev.pointLoads, pl]
    }));
    setNewPlDesc('Equipment point load');
  };

  const deletePointLoad = (id: string) => {
    onChange(prev => ({
      ...prev,
      pointLoads: prev.pointLoads.filter(pl => pl.id !== id)
    }));
  };

  const togglePointLoad = (id: string) => {
    onChange(prev => ({
      ...prev,
      pointLoads: prev.pointLoads.map(pl => pl.id === id ? { ...pl, active: !pl.active } : pl)
    }));
  };

  const updateCombinationFactor = (comboId: string, caseKey: string, factor: number) => {
    onChange(prev => ({
      ...prev,
      loadCombinations: prev.loadCombinations.map(c => {
        if (c.id === comboId) {
          return {
            ...c,
            factors: { ...c.factors, [caseKey]: factor }
          };
        }
        return c;
      })
    }));
  };

  const toggleCombination = (comboId: string) => {
    onChange(prev => ({
      ...prev,
      loadCombinations: prev.loadCombinations.map(c => 
        c.id === comboId ? { ...c, active: !c.active } : c
      )
    }));
  };

  const selectCodePreset = (code: CodeStandard) => {
    onChange(prev => {
      let combos: LoadCombination[] = [];
      if (code === 'nscp') {
        combos = NSCP_COMBINATIONS;
      } else if (code === 'american') {
        combos = AMERICAN_COMBINATIONS;
      } else if (code === 'eurocode') {
        combos = EUROCODE_COMBINATIONS;
      } else {
        combos = CUSTOM_COMBINATIONS_TEMPLATE;
      }
      return {
        ...prev,
        codeStandard: code,
        loadCombinations: combos
      };
    });
  };

  return (
    <div className="space-y-3 pb-8 text-sm">
      
      {/* SECTION 1: PROJECT SETUP & INFORMATION */}
      <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-xs">
        <button 
          onClick={() => toggleSection('project')}
          className="w-full flex items-center justify-between p-3.5 font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-sky-600" />
            1. Project Identity
          </span>
          <span className="text-xs text-slate-400">{openSection === 'project' ? '▲' : '▼'}</span>
        </button>
        {openSection === 'project' && (
          <div className="p-3.5 space-y-3 bg-white">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Project Name</label>
              <input 
                type="text" 
                value={project.name}
                onChange={e => onChange(prev => ({ ...prev, name: e.target.value }))}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-slate-700 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-sky-500 outline-hidden" 
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Designer Name</label>
                <input 
                  type="text" 
                  value={project.designer}
                  onChange={e => onChange(prev => ({ ...prev, designer: e.target.value }))}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-slate-700 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-sky-500 outline-hidden" 
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Design Date</label>
                <input 
                  type="date" 
                  value={project.date}
                  onChange={e => onChange(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-slate-700 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-sky-500 outline-hidden" 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Project Location</label>
                <input 
                  type="text" 
                  value={project.location || ''}
                  onChange={e => onChange(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-slate-700 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-sky-500 outline-hidden" 
                  placeholder="e.g. Metro Manila"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Project Owner</label>
                <input 
                  type="text" 
                  value={project.owner || ''}
                  onChange={e => onChange(prev => ({ ...prev, owner: e.target.value }))}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-slate-700 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-sky-500 outline-hidden" 
                  placeholder="e.g. Development Corp"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: CODE SELECTOR */}
      <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-xs">
        <button 
          onClick={() => toggleSection('code')}
          className="w-full flex items-center justify-between p-3.5 font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-600" />
            2. Code Standard Selector
          </span>
          <span className="text-xs text-slate-400">{openSection === 'code' ? '▲' : '▼'}</span>
        </button>
        {openSection === 'code' && (
          <div className="p-3.5 space-y-3">
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'nscp', label: 'NSCP (Philippines)' },
                { id: 'american', label: 'American (ASCE/IBC)' },
                { id: 'eurocode', label: 'Eurocode (EN 1990)' },
                { id: 'custom', label: 'Custom Combination' }
              ].map(c => (
                <button
                  key={c.id}
                  onClick={() => selectCodePreset(c.id as CodeStandard)}
                  className={`px-2 py-2 text-xs font-medium border rounded transition-colors text-center ${
                    project.codeStandard === c.id 
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700' 
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="text-xs bg-slate-50 p-2 text-slate-500 rounded flex gap-1.5 leading-relaxed">
              <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>
                {project.codeStandard === 'nscp' && 'NSCP standard applies Filipino combination limits. Gravity loads factor combination utilizes historical ACI load factors.'}
                {project.codeStandard === 'american' && 'American ASCE 7-16 & IBC 2018 strength factors (LRFD and ASD combinations) with modern live load adjustments.'}
                {project.codeStandard === 'eurocode' && 'Eurocode safety coefficients (Gamma and Psi variables) for ultimate design strength configurations.'}
                {project.codeStandard === 'custom' && 'Fully custom overrides allowed. Edit combos below in Load Combination section.'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: GEOMETRY */}
      <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-xs">
        <button 
          onClick={() => toggleSection('geometry')}
          className="w-full flex items-center justify-between p-3.5 font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Grid3X3 className="w-4 h-4 text-indigo-600" />
            3. Frame Geometry
          </span>
          <span className="text-xs text-slate-400">{openSection === 'geometry' ? '▲' : '▼'}</span>
        </button>
        {openSection === 'geometry' && (
          <div className="p-3.5 space-y-3.5">
            
            {/* Storeys & Grids count */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Storeys (1 to 12)</label>
                <input 
                  type="number" 
                  min={1} 
                  max={12} 
                  value={project.geometry.numLevels}
                  onChange={e => handleGeometryChange('numLevels', Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))}
                  className="w-full border border-slate-300 rounded px-2.5 py-1 text-slate-700" 
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Grid lines (2 to 7)</label>
                <input 
                  type="number" 
                  min={2} 
                  max={7} 
                  value={project.geometry.numGrids}
                  onChange={e => handleGeometryChange('numGrids', Math.max(2, Math.min(7, parseInt(e.target.value) || 2)))}
                  className="w-full border border-slate-300 rounded px-2.5 py-1 text-slate-700" 
                />
              </div>
            </div>

            {/* Span lengths */}
            <div>
              <div className="font-semibold text-xs text-slate-600 mb-1.5 bg-slate-100 px-2 py-1 rounded">Span Spacings (L) - meters</div>
              <div className="grid grid-cols-3 gap-2">
                {project.geometry.spanLengths.map((len, idx) => (
                  <div key={idx} className="flex flex-col">
                    <span className="text-[10px] text-slate-400 text-center mb-0.5">Span {idx+1} (Grid {project.geometry.gridLabels[idx]}-{project.geometry.gridLabels[idx+1]})</span>
                    <input 
                      type="number" 
                      step={0.1}
                      min={1} 
                      value={len}
                      onChange={e => handleSpanLengthChange(idx, parseFloat(e.target.value) || 1)}
                      className="text-center font-mono border border-slate-300 rounded py-1"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Storey heights */}
            <div>
              <div className="font-semibold text-xs text-slate-600 mb-1.5 bg-slate-100 px-2 py-1 rounded">Storey Heights (H) - meters</div>
              <div className="max-h-36 overflow-y-auto border border-slate-100 rounded p-1 space-y-1.5 shadow-inner">
                {project.geometry.storeyHeights.map((h, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs px-1">
                    <span className="text-slate-500 font-medium">Storey {idx+1} ({project.geometry.levelNames[idx]} to {project.geometry.levelNames[idx+1]}):</span>
                    <div className="flex items-center gap-1.5">
                      <input 
                        type="number" 
                        step={0.1}
                        min={1.5}
                        value={h}
                        onChange={e => handleStoreyHeightChange(idx, parseFloat(e.target.value) || 1.5)}
                        className="w-20 text-center font-mono border border-slate-300 rounded py-0.5"
                      />
                      <span className="text-slate-400 font-sans">m</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Slab support options */}
            <div className="border-t border-slate-100 pt-3 space-y-2.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Trib Width Above H2 (m)</label>
                  <input 
                    type="number" 
                    step={0.1}
                    min={0}
                    value={project.geometry.tribWidthAbove}
                    onChange={e => handleGeometryChange('tribWidthAbove', Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full border border-slate-300 rounded px-2 py-1 text-slate-700" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Trib Width Below H1 (m)</label>
                  <input 
                    type="number" 
                    step={0.1} 
                    min={0}
                    value={project.geometry.tribWidthBelow}
                    onChange={e => handleGeometryChange('tribWidthBelow', Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full border border-slate-300 rounded px-2 py-1 text-slate-700" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <input 
                    type="checkbox" 
                    id="incRoof"
                    checked={project.geometry.includeRoof}
                    onChange={e => handleGeometryChange('includeRoof', e.target.checked)}
                    className="rounded text-sky-600 focus:ring-sky-500" 
                  />
                  <label htmlFor="incRoof" className="text-slate-600 font-medium select-none">Include Roof Level</label>
                </div>
                <div className="flex items-center gap-1.5">
                  <input 
                    type="checkbox" 
                    id="incParap"
                    checked={project.geometry.includeParapet}
                    onChange={e => handleGeometryChange('includeParapet', e.target.checked)}
                    className="rounded text-sky-600 focus:ring-sky-500" 
                  />
                  <label htmlFor="incParap" className="text-slate-600 font-medium select-none">Include Perimeter Parapet</label>
                </div>
              </div>

              {project.geometry.includeParapet && (
                <div className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded">
                  <span className="text-slate-500">Parapet Height (m):</span>
                  <input 
                    type="number" 
                    step={0.1}
                    min={0}
                    value={project.geometry.parapetHeight}
                    onChange={e => handleGeometryChange('parapetHeight', Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-20 text-center font-mono border border-slate-300 rounded py-0.5" 
                  />
                </div>
              )}

              <div className="border-t border-slate-100 pt-3 grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Bldg Plan Length (X)</label>
                  <input 
                    type="number" 
                    step={0.5}
                    value={project.geometry.buildingPlanLength}
                    onChange={e => handleGeometryChange('buildingPlanLength', Math.max(1, parseFloat(e.target.value) || 1))}
                    className="w-full border border-slate-300 rounded px-2 py-1 text-slate-700" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Bldg Plan Width (Y)</label>
                  <input 
                    type="number" 
                    step={0.5}
                    value={project.geometry.buildingPlanWidth}
                    onChange={e => handleGeometryChange('buildingPlanWidth', Math.max(1, parseFloat(e.target.value) || 1))}
                    className="w-full border border-slate-300 rounded px-2 py-1 text-slate-700" 
                  />
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* SECTION 4: MEMBER DIMENSIONS */}
      <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-xs">
        <button 
          onClick={() => toggleSection('sizes')}
          className="w-full flex items-center justify-between p-3.5 font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-violet-600" />
            4. Member Dimensions
          </span>
          <span className="text-xs text-slate-400">{openSection === 'sizes' ? '▲' : '▼'}</span>
        </button>
        {openSection === 'sizes' && (
          <div className="p-3.5 space-y-3.5">
            <div>
              <div className="text-xs font-bold text-slate-700 mb-2">Global Defaults override (mm)</div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Slab Depth</label>
                  <input 
                    type="number" 
                    value={project.memberSizes.slabThickness}
                    onChange={e => handleSizeChange('slabThickness', parseInt(e.target.value) || 120)}
                    className="w-full border border-slate-300 rounded px-2 py-0.5 text-center" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Parapet Thk</label>
                  <input 
                    type="number" 
                    value={project.memberSizes.parapetThickness}
                    onChange={e => handleSizeChange('parapetThickness', parseInt(e.target.value) || 150)}
                    className="w-full border border-slate-300 rounded px-2 py-0.5 text-center" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Beam Width (b)</label>
                  <input 
                    type="number" 
                    value={project.memberSizes.beamWidth}
                    onChange={e => handleSizeChange('beamWidth', parseInt(e.target.value) || 250)}
                    className="w-full border border-slate-300 rounded px-2 py-0.5 text-center" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Beam Depth (h)</label>
                  <input 
                    type="number" 
                    value={project.memberSizes.beamDepth}
                    onChange={e => handleSizeChange('beamDepth', parseInt(e.target.value) || 450)}
                    className="w-full border border-slate-300 rounded px-2 py-0.5 text-center" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Col Width</label>
                  <input 
                    type="number" 
                    value={project.memberSizes.columnWidth}
                    onChange={e => handleSizeChange('columnWidth', parseInt(e.target.value) || 400)}
                    className="w-full border border-slate-300 rounded px-2 py-0.5 text-center" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Col Depth</label>
                  <input 
                    type="number" 
                    value={project.memberSizes.columnDepth}
                    onChange={e => handleSizeChange('columnDepth', parseInt(e.target.value) || 400)}
                    className="w-full border border-slate-300 rounded px-2 py-0.5 text-center" 
                  />
                </div>
              </div>
            </div>

            {/* Special highlight details override indicator */}
            {(activeBeamId || activeColId) ? (
              <div className="bg-amber-50 border border-amber-200 rounded p-2.5 text-xs text-amber-800 space-y-2">
                <div className="font-bold flex items-center justify-between">
                  <span>Selected Member Edit Details</span>
                  <button onClick={onClearSelection} className="text-[10px] underline hover:text-amber-950 font-normal">
                    Cancel selection
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Modify dimension parameters below on the drawing directly or override this active node:
                </p>
                {activeBeamId && (
                  <div>
                    <span className="font-mono bg-amber-100 px-1 py-0.5 font-bold">{activeBeamId}</span> is active. Change beam defaults on Left Sidebar globally.
                  </div>
                )}
                {activeColId && (
                  <div>
                    <span className="font-mono bg-amber-100 px-1 py-0.5 font-bold">{activeColId}</span> is active. Change column defaults on Left Sidebar globally.
                  </div>
                )}
              </div>
            ) : (
              <div className="text-[11px] text-slate-400 text-center border border-dashed p-2 rounded">
                Click any member (beam, column) in either diagram to activate highlighted sizing controls.
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 5: MATERIALS & UNIT WEIGHTS */}
      <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-xs">
        <button 
          onClick={() => toggleSection('materials')}
          className="w-full flex items-center justify-between p-3.5 font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Hammer className="w-4 h-4 text-amber-600" />
            5. Materials & Weights
          </span>
          <span className="text-xs text-slate-400">{openSection === 'materials' ? '▲' : '▼'}</span>
        </button>
        {openSection === 'materials' && (
          <div className="p-3.5 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">RC Density (kN/m³)</label>
                <input 
                  type="number" 
                  step={0.5}
                  value={project.materials.concUnitWeight}
                  onChange={e => handleMaterialChange('concUnitWeight', parseFloat(e.target.value) || 24.0)}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-center font-mono text-xs" 
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Plain Concrete Density</label>
                <input 
                  type="number" 
                  step={0.5}
                  value={project.materials.plainConcUnitWeight}
                  onChange={e => handleMaterialChange('plainConcUnitWeight', parseFloat(e.target.value) || 23.5)}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-center font-mono text-xs" 
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Wall Unit Vol Density</label>
                <input 
                  type="number" 
                  step={0.5}
                  value={project.materials.wallUnitWeight}
                  onChange={e => handleMaterialChange('wallUnitWeight', parseFloat(e.target.value) || 18.0)}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-center font-mono text-xs" 
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Wall Plaster (kPa)</label>
                <input 
                  type="number" 
                  step={0.05}
                  value={project.materials.plasterUnitWeight}
                  onChange={e => handleMaterialChange('plasterUnitWeight', parseFloat(e.target.value) || 0.24)}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-center font-mono text-xs" 
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Floor Finish (kPa)</label>
                <input 
                  type="number" 
                  step={0.1}
                  value={project.materials.floorFinish}
                  onChange={e => handleMaterialChange('floorFinish', parseFloat(e.target.value) || 1.1)}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-center font-mono text-xs" 
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Live Load Floor (kPa)</label>
                <input 
                  type="number" 
                  step={0.1}
                  value={project.materials.liveLoadOccupancy}
                  onChange={e => handleMaterialChange('liveLoadOccupancy', parseFloat(e.target.value) || 2.4)}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-center font-mono text-xs" 
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 6: WIND FORCES */}
      <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-xs">
        <button 
          onClick={() => toggleSection('wind')}
          className="w-full flex items-center justify-between p-3.5 font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Wind className="w-4 h-4 text-cyan-600" />
            6. Static Wind Loads
          </span>
          <span className="text-xs text-slate-400">{openSection === 'wind' ? '▲' : '▼'}</span>
        </button>
        {openSection === 'wind' && (
          <div className="p-3.5 space-y-3 bg-white">
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded">
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Wind Speed (V)</label>
                <input 
                  type="number" 
                  value={project.wind.speed}
                  onChange={e => onChange(prev => ({ ...prev, wind: { ...prev.wind, speed: parseFloat(e.target.value) || 200 } }))}
                  className="w-full border border-slate-300 rounded px-2 py-0.5 text-center text-xs" 
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Speed Unit</label>
                <select
                  value={project.wind.speedUnit}
                  onChange={e => onChange(prev => ({ ...prev, wind: { ...prev.wind, speedUnit: e.target.value as any } }))}
                  className="w-full border border-slate-300 rounded px-2 py-0.5 text-xs bg-white"
                >
                  <option value="kph">kph</option>
                  <option value="m/s">m/s</option>
                  <option value="mph">mph</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Exposure</label>
                <select
                  value={project.wind.exposure}
                  onChange={e => onChange(prev => ({ ...prev, wind: { ...prev.wind, exposure: e.target.value as any } }))}
                  className="w-full border border-slate-300 rounded px-1 py-0.5 text-xs bg-white"
                >
                  <option value="B">Exposure B</option>
                  <option value="C">Exposure C</option>
                  <option value="D">Exposure D</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Gust G_f</label>
                <input 
                  type="number" 
                  step={0.01}
                  value={project.wind.gust}
                  onChange={e => onChange(prev => ({ ...prev, wind: { ...prev.wind, gust: parseFloat(e.target.value) || 0.85 } }))}
                  className="w-full border border-slate-300 rounded px-1 py-0.5 text-center text-xs" 
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Share %</label>
                <input 
                  type="number" 
                  step={5}
                  min={1} 
                  max={100}
                  value={project.geometry.frameSharePercent}
                  onChange={e => onChange(prev => ({ ...prev, geometry: { ...prev.geometry, frameSharePercent: Math.max(1, Math.min(100, parseInt(e.target.value) || 100)) } }))}
                  className="w-full border border-slate-300 rounded px-1 py-0.5 text-center text-xs" 
                />
              </div>
            </div>

            <div className="space-y-1 bg-slate-50 p-2 text-[11px] rounded leading-relaxed text-slate-500">
              <span className="font-semibold text-slate-700 block text-xs">Calculated Boundary Conditions:</span>
              <p>Gust factors are bounded at standard values (B=sheltered, C=open plain, D=exposed coastline).</p>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 7: SEISMIC PARAMETERS */}
      <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-xs">
        <button 
          onClick={() => toggleSection('seismic')}
          className="w-full flex items-center justify-between p-3.5 font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-rose-500" />
            7. Static Seismic Loads
          </span>
          <span className="text-xs text-slate-400">{openSection === 'seismic' ? '▲' : '▼'}</span>
        </button>
        {openSection === 'seismic' && (
          <div className="p-3.5 space-y-3.5">
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded">
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Zone factor (Z)</label>
                <input 
                  type="number" 
                  step={0.1}
                  min={0.1}
                  max={0.5}
                  value={project.seismic.zoneFactor}
                  onChange={e => onChange(prev => ({ ...prev, seismic: { ...prev.seismic, zoneFactor: parseFloat(e.target.value) || 0.4 } }))}
                  className="w-full border border-slate-300 rounded px-2.5 py-0.5 text-center text-xs" 
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Site Soil Class</label>
                <select
                  value={project.seismic.siteClass}
                  onChange={e => onChange(prev => ({ ...prev, seismic: { ...prev.seismic, siteClass: e.target.value as any } }))}
                  className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white"
                >
                  <option value="A">Hard Rock (A)</option>
                  <option value="B">Rock (B)</option>
                  <option value="C">Dense Soil (C)</option>
                  <option value="D">Stiff Soil (D)</option>
                  <option value="E">Soft Soil (E)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Seismic Force-Resisting System (Code R-Factor)</label>
                <select
                  value={[8.5, 8.0, 6.5, 6.0, 5.5, 3.5].includes(project.seismic.responseModification) ? project.seismic.responseModification : 'custom'}
                  onChange={e => {
                    const val = e.target.value;
                    if (val !== 'custom') {
                      onChange(prev => ({ ...prev, seismic: { ...prev.seismic, responseModification: parseFloat(val) } }));
                    } else {
                      // Trigger custom override mode by setting factor temporarily to 4.0
                      onChange(prev => ({ ...prev, seismic: { ...prev.seismic, responseModification: 4.0 } }));
                    }
                  }}
                  className="w-full border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white text-slate-700 font-medium"
                >
                  <option value={8.5}>Special Concrete Moment Frames (SMRF, R=8.5)</option>
                  <option value={8.0}>Dual Systems with SMRF (R=8.0)</option>
                  <option value={6.5}>Dual Systems with IMRF (R=6.5)</option>
                  <option value={6.0}>Special Concrete Shear Walls (R=6.0)</option>
                  <option value={5.5}>Intermediate Concrete Moment Frames (IMRF, R=5.5)</option>
                  <option value={3.5}>Ordinary Concrete Moment Frames (OMRF, R=3.5)</option>
                  <option value="custom">Custom R-Factor / User Override </option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Ductility Factor R</label>
                  <input 
                    type="number" 
                    step={0.1}
                    min={1.0}
                    max={12.0}
                    disabled={[8.5, 8.0, 6.5, 6.0, 5.5, 3.5].includes(project.seismic.responseModification)}
                    value={project.seismic.responseModification}
                    onChange={e => onChange(prev => ({ ...prev, seismic: { ...prev.seismic, responseModification: parseFloat(e.target.value) || 8.5 } }))}
                    className="w-full border border-slate-300 disabled:bg-slate-100 disabled:text-slate-500 rounded px-2 py-0.5 text-center text-xs" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">LL portion in weight (%)</label>
                  <input 
                    type="number" 
                    step={5}
                    min={0}
                    max={100}
                    value={project.seismic.percentageLiveLoadInWeight}
                    onChange={e => onChange(prev => ({ ...prev, seismic: { ...prev.seismic, percentageLiveLoadInWeight: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) } }))}
                    className="w-full border border-slate-300 rounded px-2 py-0.5 text-center text-xs" 
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-2 text-xs">
              <div className="flex items-center gap-1.5">
                <input 
                  type="checkbox" 
                  id="includeWallsSeis" 
                  checked={project.seismic.includeWalls} 
                  onChange={e => onChange(prev => ({ ...prev, seismic: { ...prev.seismic, includeWalls: e.target.checked } }))} 
                />
                <label htmlFor="includeWallsSeis" className="text-slate-600">Include perimeter walls weight</label>
              </div>
              <div className="flex items-center gap-1.5">
                <input 
                  type="checkbox" 
                  id="includeParapSeis" 
                  checked={project.seismic.includeParapet} 
                  onChange={e => onChange(prev => ({ ...prev, seismic: { ...prev.seismic, includeParapet: e.target.checked } }))} 
                />
                <label htmlFor="includeParapSeis" className="text-slate-600">Include canopy/parapet weight</label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 8: POINT LOADS AND CONCENTRATED LOAD ON SPANS */}
      <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-xs">
        <button 
          onClick={() => toggleSection('pointloads')}
          className="w-full flex items-center justify-between p-3.5 font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-600 animate-pulse" />
            8. Point Load Setup
          </span>
          <span className="text-xs text-slate-400">{openSection === 'pointloads' ? '▲' : '▼'}</span>
        </button>
        {openSection === 'pointloads' && (
          <div className="p-3.5 space-y-4 bg-white">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
              <div className="font-bold text-xs text-slate-700">Add New Concentrated Span Load</div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Load case</label>
                  <select 
                    value={newPlCase} 
                    onChange={e => setNewPlCase(e.target.value as any)}
                    className="w-full border border-slate-300 rounded p-1 bg-white"
                  >
                    <option value="DL">Dead Load (DL)</option>
                    <option value="SDL">Super SDL</option>
                    <option value="LL">Live Load (LL)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Level</label>
                  <select 
                    value={newPlLevel} 
                    onChange={e => setNewPlLevel(parseInt(e.target.value) || 1)}
                    className="w-full border border-slate-300 rounded p-1 bg-white"
                  >
                    {Array.from({ length: project.geometry.numLevels }, (_, i) => i + 1).map(num => (
                      <option key={num} value={num}>Level {num}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Beam Span</label>
                  <select 
                    value={newPlBeam} 
                    onChange={e => setNewPlBeam(parseInt(e.target.value) || 0)}
                    className="w-full border border-slate-300 rounded p-1 bg-white"
                  >
                    {Array.from({ length: project.geometry.numGrids - 1 }, (_, i) => i).map(num => (
                      <option key={num} value={num}>Span BM{String.fromCharCode(97 + num)} ({project.geometry.gridLabels[num]}-{project.geometry.gridLabels[num+1]})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Magnitude (kN)</label>
                  <input 
                    type="number" 
                    value={newPlMag} 
                    onChange={e => setNewPlMag(parseFloat(e.target.value) || 0)}
                    className="w-full border border-slate-300 rounded p-1" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Dist. from Left Col (m)</label>
                  <input 
                    type="number" 
                    step={0.1}
                    value={newPlDist} 
                    onChange={e => setNewPlDist(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full border border-slate-300 rounded p-1" 
                  />
                  <span className="text-[9px] text-slate-400">Span Max: {project.geometry.spanLengths[newPlBeam] || 6.0}m</span>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Label/Description</label>
                  <input 
                    type="text" 
                    value={newPlDesc} 
                    onChange={e => setNewPlDesc(e.target.value)}
                    className="w-full border border-slate-300 rounded p-1" 
                  />
                </div>
              </div>

              <button 
                onClick={addPointLoad}
                className="w-full bg-emerald-600 text-white font-semibold py-1.5 rounded-md hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Concentrated Load
              </button>
            </div>

            {/* List of current point loads */}
            <div className="space-y-2">
              <div className="font-bold text-xs text-slate-700">Active Concentrated Loads ({project.pointLoads.length})</div>
              {project.pointLoads.length === 0 ? (
                <p className="text-slate-400 text-xs text-center italic py-2">No point loads added yet.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {project.pointLoads.map(pl => {
                    const maxSpan = project.geometry.spanLengths[pl.beamIndex] || 6.0;
                    return (
                      <div key={pl.id} className="border border-slate-100 bg-slate-50 p-2 rounded flex items-center justify-between text-xs">
                        <div className="space-y-0.5 flex-1 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold font-mono text-slate-700">P = {pl.magnitude} kN</span>
                            <span className="bg-sky-100 text-[9px] text-sky-800 font-bold px-1 py-0.2 rounded">{pl.case}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            Level {pl.levelIndex}, Span BM{String.fromCharCode(97 + pl.beamIndex)} @ {pl.distance}m
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium italic truncate">
                            "{pl.description}"
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="checkbox" 
                            checked={pl.active} 
                            onChange={() => togglePointLoad(pl.id)} 
                            title="Toggle activation"
                            className="rounded text-sky-600 focus:ring-sky-500" 
                          />
                          <button 
                            onClick={() => deletePointLoad(pl.id)}
                            className="text-slate-400 hover:text-rose-600 transition-colors"
                            title="Delete load"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 9: LOAD COMBINATIONS */}
      <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-xs">
        <button 
          onClick={() => toggleSection('combos')}
          className="w-full flex items-center justify-between p-3.5 font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4 text-slate-700" />
            9. Ultimate Combinations
          </span>
          <span className="text-xs text-slate-400">{openSection === 'combos' ? '▲' : '▼'}</span>
        </button>
        {openSection === 'combos' && (
          <div className="p-3 bg-white space-y-3">
            <div className="text-xs text-slate-400 pb-1">
              Active factored equation multipliers built into code summaries:
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2 border border-slate-100 rounded p-1 shadow-inner">
              {project.loadCombinations.map((combo) => (
                <div key={combo.id} className="border border-slate-100 p-2 rounded bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-700">{combo.name}</span>
                    <input 
                      type="checkbox" 
                      checked={combo.active}
                      onChange={() => toggleCombination(combo.id)}
                      className="rounded text-sky-600 focus:ring-sky-500"
                    />
                  </div>
                  
                  {combo.active && (
                    <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                      <div>
                        <span className="text-slate-400">DL:</span>
                        <input 
                          type="number" 
                          step={0.05}
                          value={combo.factors.DL ?? 0}
                          onChange={e => updateCombinationFactor(combo.id, 'DL', parseFloat(e.target.value) || 0)}
                          className="w-full border border-slate-300 rounded text-center font-mono py-0.5" 
                        />
                      </div>
                      <div>
                        <span className="text-slate-400">LL:</span>
                        <input 
                          type="number" 
                          step={0.05}
                          value={combo.factors.LL ?? 0}
                          onChange={e => updateCombinationFactor(combo.id, 'LL', parseFloat(e.target.value) || 0)}
                          className="w-full border border-slate-300 rounded text-center font-mono py-0.5" 
                        />
                      </div>
                      <div>
                        <span className="text-slate-400">WL:</span>
                        <input 
                          type="number" 
                          step={0.05}
                          value={combo.factors.WL ?? 0}
                          onChange={e => updateCombinationFactor(combo.id, 'WL', parseFloat(e.target.value) || 0)}
                          className="w-full border border-slate-300 rounded text-center font-mono py-0.5" 
                        />
                      </div>
                      <div>
                        <span className="text-slate-400">EQL:</span>
                        <input 
                          type="number" 
                          step={0.05}
                          value={combo.factors.EQL ?? 0}
                          onChange={e => updateCombinationFactor(combo.id, 'EQL', parseFloat(e.target.value) || 0)}
                          className="w-full border border-slate-300 rounded text-center font-mono py-0.5" 
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
