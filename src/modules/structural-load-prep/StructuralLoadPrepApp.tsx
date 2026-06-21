/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { ProjectState, SlabPanelType } from './types';
import { SAMPLE_PROJECT_A, SAMPLE_PROJECT_B } from './defaultData';
import { 
  computeBeamLoads, 
  computeColumnLoads, 
  computeWindLoads, 
  computeSeismicLoads,
  roundTo
} from './calculators';
import { computeFinalConclusions } from './combinationCalculators';
import SidebarPanels from './components/SidebarPanels';
import SVGViews from './components/SVGViews';
import ResultsDisplay from './components/ResultsDisplay';
import TutorialSidebar from './components/TutorialSidebar';
import { 
  Layout, 
  Layers, 
  TableProperties, 
  FileCheck, 
  BookOpen, 
  Printer, 
  TrendingUp, 
  ShieldAlert, 
  RefreshCcw,
  Zap,
  Undo,
  Trash2,
  Calculator,
  Check
} from 'lucide-react';

export default function StructuralLoadPrepApp() {
  // 1. Core Project State
  const [project, setProject] = useState<ProjectState>(() => {
    // Attempt local storage recover first, else DEFAULT SAMPLE A
    const saved = localStorage.getItem('strucforge_load_prep_project');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.geometry) return parsed;
      } catch (e) {
        // Fallback
      }
    }
    return SAMPLE_PROJECT_A;
  });

  // 2. Active Tab & Selections states
  const [activeTab, setActiveTab] = useState<'plan' | 'framing' | 'results' | 'report'>('plan');
  const [activeBeamId, setActiveBeamId] = useState<string | null>(null);
  const [activeColId, setActiveColId] = useState<string | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState<boolean>(false);
  const [isDeleteModeActive, setIsDeleteModeActive] = useState<boolean>(false);
  
  // Method preset for slab actions
  const [slabType, setSlabType] = useState<SlabPanelType>('two-way');

  // 3. Save to localStorage instantly when project changes
  useEffect(() => {
    localStorage.setItem('strucforge_load_prep_project', JSON.stringify(project));
  }, [project]);

  // Undo action history state (limit to 30)
  const [history, setHistory] = useState<ProjectState[]>([]);

  // Function to commit snapshot before making changes
  const saveToHistory = (previous: ProjectState) => {
    setHistory(prev => {
      const nextHistory = [...prev, { ...previous }];
      if (nextHistory.length > 30) {
        nextHistory.shift();
      }
      return nextHistory;
    });
  };

  // Wrapper updater
  const updateProject = (newProjectStateOrUpdater: ProjectState | ((prev: ProjectState) => ProjectState)) => {
    setProject(prev => {
      const nextState = typeof newProjectStateOrUpdater === 'function' 
        ? newProjectStateOrUpdater(prev) 
        : newProjectStateOrUpdater;
      
      // Save prev to history if it's different
      if (JSON.stringify(prev) !== JSON.stringify(nextState)) {
        saveToHistory(prev);
      }
      return nextState;
    });
  };

  // Handle manual project state replacement
  const handleUpdate = (updater: (prev: ProjectState) => ProjectState) => {
    updateProject(prev => updater(prev));
  };

  // 1.5. Calculated State for Structural Calculations (Requires "Calculate" click on changes)
  const [calculatedProject, setCalculatedProject] = useState<ProjectState>(project);
  const [calculatedSlabType, setCalculatedSlabType] = useState<SlabPanelType>(slabType);
  const [conclusionsCompleted, setConclusionsCompleted] = useState<boolean>(false);

  const runCalculations = (p: ProjectState = project, s: SlabPanelType = slabType) => {
    setCalculatedProject(JSON.parse(JSON.stringify(p))); // deep clone to guarantee memo triggers
    setCalculatedSlabType(s);
    setConclusionsCompleted(false); // Reset sign-off whenever calculation is updated
  };

  const isStale = useMemo(() => {
    return JSON.stringify(project) !== JSON.stringify(calculatedProject) || slabType !== calculatedSlabType;
  }, [project, calculatedProject, slabType, calculatedSlabType]);

  const handleImport = (imported: ProjectState) => {
    updateProject(imported);
    runCalculations(imported, 'two-way');
    // Reset selections on new project
    setActiveBeamId(null);
    setActiveColId(null);
  };

  const handleLoadSampleA = () => {
    updateProject(SAMPLE_PROJECT_A);
    setSlabType('two-way');
    runCalculations(SAMPLE_PROJECT_A, 'two-way');
    setActiveBeamId(null);
    setActiveColId(null);
  };

  const handleLoadSampleB = () => {
    updateProject(SAMPLE_PROJECT_B);
    setSlabType('two-way');
    runCalculations(SAMPLE_PROJECT_B, 'two-way');
    setActiveBeamId(null);
    setActiveColId(null);
  };

  // Individual element-by-element delete functions
  const handleDeletePointLoad = (id: string) => {
    updateProject(prev => ({
      ...prev,
      pointLoads: prev.pointLoads.filter(pl => pl.id !== id)
    }));
  };

  const handleDeleteBeamOverrides = (levelIndex: number, spanIndex: number) => {
    updateProject(prev => {
      const nextOverrides = { ...prev.memberOverrides };
      const key = `${levelIndex}-${spanIndex}`;
      
      const keysAffected = ['beamWidths', 'beamDepths', 'slabThicknesses', 'slabSWs', 'beamSWs', 'SDLs', 'LLs', 'wallLoads'];
      keysAffected.forEach(k => {
        const record = (nextOverrides as any)[k];
        if (record && record[key] !== undefined) {
          const updatedRecord = { ...record };
          delete updatedRecord[key];
          (nextOverrides as any)[k] = updatedRecord;
        }
      });
      
      return {
        ...prev,
        memberOverrides: nextOverrides
      };
    });
  };

  const handleDeleteColumnOverrides = (levelIndex: number, gridIndex: number) => {
    updateProject(prev => {
      const nextOverrides = { ...prev.memberOverrides };
      const key = `${levelIndex}-${gridIndex}`;
      
      const keysAffected = ['columnWidths', 'columnDepths'];
      keysAffected.forEach(k => {
        const record = (nextOverrides as any)[k];
        if (record && record[key] !== undefined) {
          const updatedRecord = { ...record };
          delete updatedRecord[key];
          (nextOverrides as any)[k] = updatedRecord;
        }
      });
      
      return {
        ...prev,
        memberOverrides: nextOverrides
      };
    });
  };

  // Undo action trigger
  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setProject(previous);
    runCalculations(previous, slabType);
  };

  // Delete mistakes / reset
  const handleDeleteMistakes = () => {
    const confirmation = window.confirm("Are you sure you want to delete all manual drawings, custom point loads, and beam/column size & load overrides? This will restore standard layout.");
    if (!confirmation) return;

    updateProject(prev => ({
      ...prev,
      memberOverrides: {
        beamWidths: {},
        beamDepths: {},
        columnWidths: {},
        columnDepths: {},
        slabThicknesses: {},
        slabSWs: {},
        beamSWs: {},
        SDLs: {},
        LLs: {},
        wallLoads: {}
      },
      pointLoads: []
    }));
  };

  // Interactive print trigger
  const handlePrintReport = () => {
    setActiveTab('report');
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // 4. CASCADING ENGINE CALCULATION (Runs on Calculate click / sync)
  const beamLoads = useMemo(() => {
    return computeBeamLoads(calculatedProject, calculatedSlabType);
  }, [calculatedProject, calculatedSlabType]);

  const columnLoads = useMemo(() => {
    return computeColumnLoads(calculatedProject, beamLoads);
  }, [calculatedProject, beamLoads]);

  const windForces = useMemo(() => {
    return computeWindLoads(calculatedProject);
  }, [calculatedProject]);

  const seismicForces = useMemo(() => {
    return computeSeismicLoads(calculatedProject, beamLoads);
  }, [calculatedProject, beamLoads]);

  const finalConclusions = useMemo(() => {
    return computeFinalConclusions(calculatedProject, beamLoads, columnLoads, windForces, seismicForces);
  }, [calculatedProject, beamLoads, columnLoads, windForces, seismicForces]);

  const clearSelection = () => {
    setActiveBeamId(null);
    setActiveColId(null);
  };

  // Find currently active item trace properties if applicable
  const activeBeamData = activeBeamId ? beamLoads.find(b => `B${b.levelIndex}-${b.spanIndex}` === activeBeamId) : null;
  const activeColData = activeColId ? columnLoads.find(c => `C${c.levelIndex}-${c.gridIndex}` === activeColId) : null;

  return (
    <div className="w-full bg-slate-50 min-h-screen flex flex-col font-sans selection:bg-sky-200">
      
      {/* HEADER CONTROLS BAR */}
      <header className="bg-slate-900 text-white px-4 py-3 shrink-0 border-b border-slate-950 print-hidden">
        <div className="w-full max-w-[1720px] mx-auto flex flex-wrap items-center gap-x-5 gap-y-3">
          <img
            src="/assets/LOGO-STRUCF.png"
            alt="StrucForge Structural Design Studio"
            className="w-[210px] sm:w-[240px] h-auto shrink-0 rounded-sm"
          />

          <div className="flex flex-1 flex-wrap items-center justify-center gap-3 min-w-[320px]">
            <h1 className="text-base sm:text-lg lg:text-xl font-extrabold tracking-tight text-white text-center uppercase">
              R.C. Structural Design Load Prep
            </h1>

            <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700/60 p-1 rounded-lg shrink-0">
            {/* UNDO TOOL */}
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              title={`Undo Tool - Undo last manual change (Up to 30 states. Stored: ${history.length})`}
              className={`p-1.5 rounded transition-all flex items-center gap-1 ${
                history.length > 0
                  ? 'text-white hover:bg-slate-705 text-sky-400 hover:text-sky-300 cursor-pointer'
                  : 'text-slate-600 cursor-not-allowed'
              }`}
            >
              <Undo className="w-4 h-4" />
              <span className="text-[10px] font-sans font-bold">Undo</span>
              {history.length > 0 && (
                <span className="text-[9px] bg-sky-500/20 text-sky-400 px-1 rounded font-mono">{history.length}</span>
              )}
            </button>

            <span className="w-[1px] h-4 bg-slate-700" />

            {/* DELETE MISTAKES TOOL */}
            <button
              onClick={() => setIsDeleteModeActive(prev => !prev)}
              title="Delete Tool - Toggle Delete Mode. When active, click any concentrated load, beam size/load override or column override directly in Drawing 1 or 2 to delete them one-by-one."
              className={`p-1.5 rounded transition-all flex items-center gap-1 cursor-pointer ring-1 ${
                isDeleteModeActive
                  ? 'bg-rose-600 border-rose-500 text-white font-bold ring-rose-400/50 hover:bg-rose-700 animate-pulse'
                  : 'text-slate-300 border-transparent hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/25'
              }`}
            >
              <Trash2 className="w-4 h-4 font-bold" />
              <span className="text-[10px] font-sans font-bold">{isDeleteModeActive ? 'Delete Mode Active' : 'Delete'}</span>
            </button>

            <span className="w-[1px] h-4 bg-slate-700" />

            {/* PRINT REPORT TOOL */}
            <button
              onClick={handlePrintReport}
              title="Print Document Tool"
              className="p-1.5 rounded text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-400 transition-all flex items-center gap-1 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span className="text-[10px] font-sans font-bold">Print Report</span>
            </button>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto shrink-0">
            <span className="text-slate-400 text-xs font-semibold mr-1">Tweak Presets:</span>
            <button 
              onClick={handleLoadSampleA}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-all shadow-xs ${
                project.id === 'sample-project-a'
                  ? 'bg-sky-500 text-slate-900 ring-2 ring-sky-300'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-750'
              }`}
            >
              Sample A (3-Storey)
            </button>
            <button 
              onClick={handleLoadSampleB}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-all shadow-xs ${
                project.id === 'sample-project-b'
                  ? 'bg-sky-500 text-slate-900 ring-2 ring-sky-300'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-750'
              }`}
            >
              Sample B (12-Storey)
            </button>
          </div>

        </div>
      </header>

      {/* METADATA SUMMARY BAR */}
      <div className="bg-white px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 print-hidden">
        <div className="flex items-center gap-3">
          <div className="space-y-0.5">
            <div className="text-slate-800 font-extrabold text-xs flex flex-wrap items-center gap-2">
              <span>{project.name}</span>
              {project.location && (
                <span className="text-[9px] font-normal text-slate-500 bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded font-sans">
                  📍 {project.location}
                </span>
              )}
              {project.owner && (
                <span className="text-[9px] font-normal text-slate-500 bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded font-sans">
                  👤 Owner: {project.owner}
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 font-medium">
              Designer: <span className="text-slate-600 font-bold">{project.designer}</span> | Date: {project.date} | Standards Code: <span className="font-bold text-sky-600 uppercase">{project.codeStandard}</span>
            </div>
          </div>
        </div>

        {/* Quick parameters readout metrics */}
        <div className="flex items-center gap-4 text-xs font-mono font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
          <div>
            <span className="text-[10px] font-sans text-slate-400 block font-normal leading-3">Total Height</span>
            {project.geometry.storeyHeights.reduce((a, b) => a + b, 0).toFixed(1)}m
          </div>
          <div className="border-l pl-3 border-slate-200">
            <span className="text-[10px] font-sans text-slate-400 block font-normal leading-3">Storeys Count</span>
            {project.geometry.numLevels} Levels
          </div>
          <div className="border-l pl-3 border-slate-200">
            <span className="text-[10px] font-sans text-slate-400 block font-normal leading-3">Grids / Spans</span>
            {project.geometry.numGrids} Grids
          </div>
          <div className="border-l pl-3 border-slate-200 text-indigo-600">
            <span className="text-[10px] font-sans text-slate-400 block font-normal leading-3">Slab Transfer Type</span>
            <select 
              value={slabType}
              onChange={e => setSlabType(e.target.value as SlabPanelType)}
              className="font-bold bg-transparent focus:outline-hidden hover:text-indigo-805 cursor-pointer font-sans"
            >
              <option value="two-way">Two-Way (45° Tributary)</option>
              <option value="one-way-x">One-Way Spans Parallel to Beams (BM)</option>
              <option value="one-way-y">One-Way Spans Perpendicular (Zero BM)</option>
              <option value="manual">Manual Area Override</option>
            </select>
          </div>
        </div>
      </div>

      {/* THREE ZONE LAYOUT CONTAINER */}
      <div className="flex-1 w-full max-w-[1720px] mx-auto flex flex-col lg:flex-row overflow-hidden">
        
        {/* ZONE A: LEFT INPUT SIDEBAR (Scrollable) */}
        <aside className="w-full lg:w-[350px] bg-slate-100 border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto max-h-screen p-4 scrollbar-thin print-hidden">
          <div className="flex items-center gap-1 text-slate-400 uppercase tracking-widest text-[9px] font-extrabold mb-3">
            <Layout className="w-3.5 h-3.5" />
            Control Parameters Panels
          </div>
          <SidebarPanels 
            project={project}
            onChange={handleUpdate}
            activeBeamId={activeBeamId}
            activeColId={activeColId}
            onClearSelection={clearSelection}
          />
        </aside>

        {/* ZONE B: CENTER INTERACTIVE SEGMENT (WORKSPACE) */}
        <main className="flex-1 bg-white flex flex-col overflow-y-auto p-5 space-y-5">
          
          {/* WORKSPACE TAB NAVIGATION TABS BAR */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 shrink-0 print-hidden">
            <div className="flex items-center gap-1 pl-1">
              {[
                { id: 'plan', label: '1. Plan View / Tributary', icon: Layout },
                { id: 'framing', label: '2. Framing Elevation Diagram', icon: Layers },
                { id: 'results', label: '3. Data Schedules Spreadsheets', icon: TableProperties },
                { id: 'report', label: '4. Print-Ready Structural Summary', icon: FileCheck }
              ].map(tab => {
                const IconComp = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-extrabold rounded-lg transition-all ${
                      activeTab === tab.id
                        ? 'bg-slate-800 text-white shadow-md'
                        : 'bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    <IconComp className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Print trigger and tutorial toggle button */}
            <div className="flex items-center gap-2">
              {/* 🚀 PROMINENT CALCULATE DESIGN CHANGES BUTTON */}
              <button
                onClick={() => runCalculations()}
                id="btn-calculate-changes"
                className={`flex items-center gap-1.5 text-xs font-black px-4 py-1.5 rounded-lg border shadow-xs transition-all duration-300 ${
                  isStale
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 animate-[pulse_1.5s_infinite] ring-2 ring-emerald-500/30'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                }`}
                title={isStale ? "Parameters have changed. Click to run cascading design calculations!" : "Current structural design calculations are fully solved and synchronized."}
              >
                <Calculator className={`w-4 h-4 ${isStale ? 'animate-bounce text-emerald-100' : 'text-slate-500'}`} />
                <span>{isStale ? "Calculate Changes" : "Calculation Solved"}</span>
                {isStale ? (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-100"></span>
                  </span>
                ) : (
                  <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                )}
              </button>

              <button 
                onClick={() => {
                  if (!conclusionsCompleted) {
                    alert("Verification Required: Please go to the 'Results' tab, select 'Load Combinations & Governing Conclusions', and click 'Verify and Authorize Conclusions' to unlock report printing.");
                    return;
                  }
                  window.print();
                }}
                className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border ${
                  conclusionsCompleted 
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-500 shadow-sm'
                    : 'bg-slate-100 text-slate-400 border-slate-250 cursor-not-allowed'
                }`}
                title={conclusionsCompleted ? "Trigger browser print layout dialog" : "Print locked until Loading Conclusions are verified under Results sub-tab"}
              >
                <Printer className={`w-4 h-4 ${conclusionsCompleted ? 'text-indigo-100' : 'text-slate-400'}`} />
                <span>{conclusionsCompleted ? "Print Report" : "Print Locked"}</span>
              </button>
            </div>
          </div>

          {/* Banner notification for Delete Mode */}
          {isDeleteModeActive && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-2.5 rounded-xl text-xs font-sans font-bold flex items-center justify-between shadow-2xs print-hidden animate-pulse">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-rose-100/80 border border-rose-200 text-rose-700 px-1.5 py-0.5 rounded text-[10px] uppercase font-black">Interactive Tool Active</span>
                <span>Click any point load (marked red) or beam/column directly on Drawing 1 or 2 below to delete it one-by-one.</span>
              </div>
              <button 
                onClick={() => setIsDeleteModeActive(false)}
                className="bg-rose-600 text-white font-bold rounded px-2.5 py-1 text-[10px] hover:bg-rose-700 transition"
              >
                Exit Delete Mode
              </button>
            </div>
          )}

          {/* ACTIVE TAB DISPLAY ZONE CONTENT */}
          <div className="flex-1">
            {activeTab === 'plan' && (
              <SVGViews 
                project={project}
                beamLoads={beamLoads}
                columnLoads={columnLoads}
                windForces={windForces}
                seismicForces={seismicForces}
                activeBeamId={activeBeamId}
                activeColId={activeColId}
                onSelectBeam={setActiveBeamId}
                onSelectCol={setActiveColId}
                slabType={slabType}
                isDeleteModeActive={isDeleteModeActive}
                onDeletePointLoad={handleDeletePointLoad}
                onDeleteBeamOverrides={handleDeleteBeamOverrides}
                onDeleteColumnOverrides={handleDeleteColumnOverrides}
                viewMode="plan"
              />
            )}

            {activeTab === 'framing' && (
              <SVGViews 
                project={project}
                beamLoads={beamLoads}
                columnLoads={columnLoads}
                windForces={windForces}
                seismicForces={seismicForces}
                activeBeamId={activeBeamId}
                activeColId={activeColId}
                onSelectBeam={setActiveBeamId}
                onSelectCol={setActiveColId}
                slabType={slabType}
                isDeleteModeActive={isDeleteModeActive}
                onDeletePointLoad={handleDeletePointLoad}
                onDeleteBeamOverrides={handleDeleteBeamOverrides}
                onDeleteColumnOverrides={handleDeleteColumnOverrides}
                viewMode="framing"
              />
            )}

            {activeTab === 'results' && (
              <ResultsDisplay 
                project={project}
                beamLoads={beamLoads}
                columnLoads={columnLoads}
                windForces={windForces}
                seismicForces={seismicForces}
                activeBeamId={activeBeamId}
                activeColId={activeColId}
                onImportProject={handleImport}
                slabType={slabType}
                conclusionsCompleted={conclusionsCompleted}
                onSignOffConclusions={setConclusionsCompleted}
                finalConclusions={finalConclusions}
              />
            )}

            {activeTab === 'report' && (
              <div className="space-y-6">
                {!conclusionsCompleted ? (
                  <div className="bg-amber-50 border border-amber-250 rounded-xl p-6 text-center space-y-4 max-w-2xl mx-auto my-8 shadow-sm print-hidden font-sans">
                    <div className="font-extrabold text-amber-900 text-sm flex items-center justify-center gap-2">
                      <span className="text-xl">⚠️</span> Load Combination Verification Pending
                    </div>
                    <p className="text-xs text-amber-850 leading-normal max-w-md mx-auto">
                      In professional structural design practice, final governing loading conclusions must be checked and formally signed off under the **Results** page before generating or printing the official load schedules report.
                    </p>
                    <div className="pt-2">
                      <button
                        onClick={() => {
                          setActiveTab('results');
                        }}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-lg shadow-sm transition-all duration-150 flex items-center justify-center gap-1.5 mx-auto"
                      >
                        <Calculator className="w-4 h-4" />
                        Go to Results & Verify Load Combinations
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                  {/* On-screen Print Guidance Banner */}
                <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-xs space-y-2 text-sky-900 print-hidden font-sans">
                  <div className="font-bold flex items-center gap-1.5 text-sky-950 text-sm">
                    <Printer className="w-4 h-4 text-sky-600" />
                    How to Export / Print Your Structural Report:
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-sky-800 leading-relaxed">
                    <li>
                      <strong>Iframe Preview Security:</strong> Modern browsers often restrict direct iframe printing triggers. For optimal rendering, please click the <strong className="text-sky-950">"Open in New Tab"</strong> button in the far top right of your live application preview, then click <strong className="text-sky-950">"Print Report"</strong> there.
                    </li>
                    <li>
                      <strong>Check Background Colors option:</strong> In the print preview panel, toggle <strong>"Background graphics"</strong> (under More Settings) on. This preserves grid colors, diagram boundaries, and strip shadings.
                    </li>
                    <li>
                      <strong>Save to File:</strong> Change your printer destination to <strong>"Save as PDF"</strong> to download a clean, durable PDF copy.
                    </li>
                  </ul>
                </div>

                <div aria-label="Calculation report layout template" className="printable-report-card print:p-0 p-4 border border-slate-200 rounded-xl space-y-6 bg-white shrink-0 scrollbar-none font-sans text-slate-800">
                <div className="text-center space-y-2 border-b pb-5">
                  <h2 className="text-xl font-black tracking-tight uppercase text-slate-900">StrucForge Structural Load Preparation Document</h2>
                  <p className="text-xs text-slate-500 font-medium font-sans">Complies with {project.codeStandard.toUpperCase()} structural design procedures. Calculated automatically.</p>
                  
                  {/* PROJECT IDENTITY META GRID */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 text-[11px] text-slate-600 bg-slate-50 border border-slate-100 p-3 rounded-lg font-sans">
                    <div className="text-left">
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">Project Name</span>
                      <span className="font-extrabold text-slate-900">{project.name}</span>
                    </div>
                    <div className="text-left">
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">Project Location</span>
                      <span className="font-extrabold text-slate-900">{project.location || 'Metro Manila, Philippines'}</span>
                    </div>
                    <div className="text-left">
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">Project Owner</span>
                      <span className="font-extrabold text-slate-900">{project.owner || 'StrucForge Dev Corp'}</span>
                    </div>
                    <div className="text-left">
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">Designer (E.o.R.)</span>
                      <span className="font-extrabold text-sky-700">{project.designer}</span>
                    </div>
                  </div>
                </div>

                {/* Print Safety Statement Warning */}
                <div className="bg-amber-50 rounded-lg p-3 text-xs leading-normal font-sans border border-amber-200">
                  <span className="font-extrabold text-amber-850 block uppercase text-[10px] tracking-wide mb-0.5">Licensed Professional Engineering Statement</span>
                  This calculation report has been run automatically. Full geometric, slab supporting paths, self weighing parameters, point loadings, soil seismic coefficients, wind exposures, and combinations factors must be checked and signed off by a certified Engineer of Record before using outputs in RC analysis or foundation drafting environments.
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <div className="font-extrabold border-b pb-0.5 text-slate-700">A. Geometry Definition Specifications</div>
                    <p>Total Level height of frame: <strong>{project.geometry.storeyHeights.reduce((a,b)=>a+b,0).toFixed(2)}m</strong></p>
                    <p>Building framing bays check: <strong>{project.geometry.numGrids - 1} spans</strong></p>
                    <p>Perpendicular upper boundary H2: <strong>{project.geometry.tribWidthAbove}m</strong></p>
                    <p>Perpendicular lower boundary H1: <strong>{project.geometry.tribWidthBelow}m</strong></p>
                  </div>
                  <div className="space-y-1.5">
                    <div className="font-extrabold border-b pb-0.5 text-slate-700">B. Code Standard Parameters</div>
                    <p>Standard select: <strong className="uppercase">{project.codeStandard}</strong></p>
                    <p>Wind category: <strong>{project.wind.exposure}</strong> | Speed: <strong>{project.wind.speed} {project.wind.speedUnit}</strong></p>
                    <p>Seismic Site class: <strong>{project.seismic.siteClass}</strong> | PGA Zone: <strong>{project.seismic.zoneFactor}</strong></p>
                    <p>R-ductility factor: <strong>{project.seismic.responseModification}</strong></p>
                  </div>
                </div>

                {/* Print miniature SVG representations */}
                <div className="border border-slate-100 pt-3 rounded-lg overflow-hidden bg-slate-50/50">
                  <div className="text-center font-bold text-xs text-slate-700 mb-2">Plan Shaded Strip Projection Diagram</div>
                  <SVGViews 
                    project={project}
                    beamLoads={beamLoads}
                    columnLoads={columnLoads}
                    windForces={windForces}
                    seismicForces={seismicForces}
                    activeBeamId={activeBeamId}
                    activeColId={activeColId}
                    onSelectBeam={setActiveBeamId}
                    onSelectCol={setActiveColId}
                    slabType={slabType}
                  />
                </div>

                {/* Summary calculation log lists */}
                <div className="space-y-4">
                  <div className="font-extrabold border-b pb-1 text-slate-800 text-sm">C. Master Loading Schedules Results</div>
                  
                  {/* Miniature beam table for quick print review */}
                  <div className="space-y-1.5">
                    <div className="font-bold text-xs">Table C1: Beam Distributed Load Schedule</div>
                    <table className="w-full text-left text-[10px] leading-tight border">
                      <thead className="bg-slate-50 border-b">
                        <tr className="font-bold">
                          <th className="p-1 border-r">Beam</th>
                          <th className="p-1 border-r">Span</th>
                          <th className="p-1 border-r">Size</th>
                          <th className="p-1 border-r text-right">Slab SW (kN/m)</th>
                          <th className="p-1 border-r text-right">SDL</th>
                          <th className="p-1 border-r text-right">LL (kN/m)</th>
                          <th className="p-1 border-r text-right">Wall (kN/m)</th>
                          <th className="p-1 border-r text-right text-amber-800">Point P (kN)</th>
                          <th className="p-1 text-right text-purple-800">Eq PL (kN/m)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-mono">
                        {beamLoads.map((b, i) => {
                          const beamPLs = project.pointLoads.filter(
                            pl => pl.active && pl.levelIndex === b.levelIndex && pl.beamIndex === b.spanIndex
                          );
                          return (
                            <tr key={i}>
                              <td className="p-1 border-r font-sans font-bold">{b.beamLabel}</td>
                              <td className="p-1 border-r">{b.L}m</td>
                              <td className="p-1 border-r">{b.b}x{b.h}</td>
                              <td className="p-1 border-r text-right">{b.slab_SW.toFixed(2)}</td>
                              <td className="p-1 border-r text-right">{b.SDL.toFixed(2)}</td>
                              <td className="p-1 border-r text-right text-sky-700">{b.LL.toFixed(2)}</td>
                              <td className="p-1 border-r text-right">{b.wall_load.toFixed(2)}</td>
                              <td className="p-1 border-r text-right text-amber-800">
                                {beamPLs.length > 0 ? (
                                  <span className="text-[9px]">
                                    {beamPLs.map(pl => `${pl.case[0]}:${pl.magnitude}`).join(', ')}
                                  </span>
                                ) : '—'}
                              </td>
                              <td className="p-1 text-right text-purple-800">
                                {b.point_DL_eq > 0 || b.point_LL_eq > 0 ? (
                                  <span className="text-[9px]">
                                    {b.point_DL_eq > 0 && `D:${b.point_DL_eq.toFixed(1)}`}
                                    {b.point_LL_eq > 0 && ` L:${b.point_LL_eq.toFixed(1)}`}
                                  </span>
                                ) : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Columns axial table */}
                  <div className="space-y-1.5 pt-2">
                    <div className="font-bold text-xs">Table C2: Column Axial Cumulative Weights</div>
                    <table className="w-full text-left text-[10px] leading-tight border">
                      <thead className="bg-slate-50 border-b font-bold">
                        <tr>
                          <th className="p-1 border-r">Col ID</th>
                          <th className="p-1 border-r">Grid</th>
                          <th className="p-1 border-r">Level</th>
                          <th className="p-1 border-r text-right">Storey Col SW</th>
                          <th className="p-1 border-r text-right">DL Accum (kN)</th>
                          <th className="p-1 border-r text-right">LL Accum (kN)</th>
                          <th className="p-1 text-right bg-slate-100">Total Axial (kN)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-mono">
                        {columnLoads.filter((_, idx)=> idx % 4 === 0 || idx < 12).map((c, i) => (
                          <tr key={i}>
                            <td className="p-1 border-r font-sans font-bold">{c.columnLabel}</td>
                            <td className="p-1 border-r">{project.geometry.gridLabels[c.gridIndex]}</td>
                            <td className="p-1 border-r">{c.levelName}</td>
                            <td className="p-1 border-r text-right">{c.column_SW.toFixed(1)}</td>
                            <td className="p-1 border-r text-right">{c.accumulatedDL.toFixed(1)}</td>
                            <td className="p-1 border-r text-right">{c.accumulatedLL.toFixed(1)}</td>
                            <td className="p-1 text-right font-bold bg-slate-50">{(c.accumulatedDL + c.accumulatedLL).toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Wind / Seismic lateral forces */}
                  <div className="grid grid-cols-2 gap-4 pt-3 pb-4">
                    <div className="space-y-1">
                      <p className="font-bold text-xs text-slate-700">Table C3: Wind Story Distribution</p>
                      <ul className="text-[10px] space-y-0.5 list-disc pl-4 leading-normal font-mono">
                        {windForces.levelWindForces.map((wf: any, idx: number) => (
                          <li key={idx}>{wf.levelName}: P_net={wf.p_windward.toFixed(2)} kPa | F_frame=<strong>{wf.F_frame.toFixed(1)} kN</strong></li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-xs text-slate-700">Table C4: Static Seismic story demand summaries</p>
                      <ul className="text-[10px] space-y-0.5 list-disc pl-4 leading-normal font-mono">
                        {seismicForces.levelForces.map((lf: any, idx: number) => (
                          <li key={idx}>Level-{lf.levelIndex}: W_level={lf.W_level.toFixed(1)} kN | F_level=<strong>{lf.F_level.toFixed(1)} kN</strong></li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* SECTION D: ULTIMATE LOAD COMBINATION & GOVERNING DESIGN CONCLUSIONS */}
                  <div className="space-y-4 pt-4 border-t border-slate-200">
                    <div className="font-extrabold pb-1 text-slate-800 text-sm">D. Ultimate Load Combination & Governing Design Conclusions</div>
                    
                    {/* Lateral Governing Box */}
                    <div className="bg-sky-50 border border-sky-100 rounded-lg p-3 text-[10px] leading-relaxed">
                      <span className="font-extrabold uppercase text-sky-950 block text-[9px] tracking-wide mb-1">Governing Lateral Load Case Analysis (Member & Base Shears)</span>
                      {finalConclusions.lateral.conclusionText}
                    </div>

                    {/* Beam combinations summary */}
                    <div className="space-y-1.5">
                      <div className="font-bold text-xs">Table D1: Beam Governing Factored Load Combinations</div>
                      <table className="w-full text-left text-[9px] border">
                        <thead className="bg-slate-50 border-b font-bold">
                          <tr>
                            <th className="p-1 border-r">Beam</th>
                            <th className="p-1 border-r text-right">Service DL (kN/m)</th>
                            <th className="p-1 border-r text-right">Service LL (kN/m)</th>
                            <th className="p-1 border-r">Governing Load Combination</th>
                            <th className="p-1 border-r text-right bg-emerald-50">Factored w_u (kN/m)</th>
                            <th className="p-1">Engineering Conclusion</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y font-mono">
                          {finalConclusions.beams.map((b, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="p-1 border-r font-sans font-bold">{b.beamLabel}</td>
                              <td className="p-1 border-r text-right">{b.serviceDL.toFixed(2)}</td>
                              <td className="p-1 border-r text-right">{b.serviceLL.toFixed(2)}</td>
                              <td className="p-1 border-r font-sans text-[9px]">{b.governingComboName}</td>
                              <td className="p-1 border-r text-right font-extrabold bg-emerald-50/55 text-emerald-900">{b.maxWu.toFixed(2)}</td>
                              <td className="p-1 font-sans text-[9px] text-slate-500 italic leading-snug">{b.conclusion}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Column combinations summary */}
                    <div className="space-y-1.5 pt-2">
                      <div className="font-bold text-xs">Table D2: Column Governing Factored Axial Combinations (Foundation Level)</div>
                      <table className="w-full text-left text-[9px] border">
                        <thead className="bg-slate-50 border-b font-bold">
                          <tr>
                            <th className="p-1 border-r">Column</th>
                            <th className="p-1 border-r text-right">Service DL (kN)</th>
                            <th className="p-1 border-r text-right">Service LL (kN)</th>
                            <th className="p-1 border-r">Max Gravity Combo</th>
                            <th className="p-1 border-r text-right bg-indigo-50">Max P_u (kN)</th>
                            <th className="p-1 border-r">Min Uplift Combo</th>
                            <th className="p-1 border-r text-right bg-amber-50 font-bold text-amber-900">Min P_u (kN)</th>
                            <th className="p-1">Engineering Construction Conclusion</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y font-mono">
                          {finalConclusions.columns.map((c, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="p-1 border-r font-sans font-bold">{c.columnLabel}</td>
                              <td className="p-1 border-r text-right">{c.serviceDL.toFixed(1)}</td>
                              <td className="p-1 border-r text-right">{c.serviceLL.toFixed(1)}</td>
                              <td className="p-1 border-r font-sans text-[9px]">{c.governingCompressComboName}</td>
                              <td className="p-1 border-r text-right font-extrabold bg-indigo-50/55 text-indigo-950">{c.maxPuCompress.toFixed(1)}</td>
                              <td className="p-1 border-r font-sans text-[9px]">{c.governingUpliftComboName}</td>
                              <td className="p-1 border-r text-right font-semibold bg-amber-50/55 text-amber-900">{c.minPuCompress.toFixed(1)}</td>
                              <td className="p-1 font-sans text-[9px] text-slate-500 leading-snug italic">{c.conclusion}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              </div>
                  </>
                )}
              </div>
            )}
          </div>
        </main>

      </div>

      {/* AUTO-HIDE TUTORIAL DRAWER */}
      <div
        className={`fixed right-0 top-[116px] bottom-5 z-50 flex items-stretch print-hidden transition-transform duration-300 ease-out ${
          tutorialOpen ? 'translate-x-0' : 'translate-x-[calc(100%_-_2.5rem)]'
        }`}
        onMouseEnter={() => setTutorialOpen(true)}
        onMouseLeave={() => setTutorialOpen(false)}
      >
        <button
          type="button"
          onClick={() => setTutorialOpen(prev => !prev)}
          className="w-10 bg-slate-900 hover:bg-orange-500 text-white hover:text-slate-950 border border-slate-700 font-extrabold text-[10px] tracking-[0.14em] uppercase flex flex-col items-center justify-center gap-2 rounded-l-lg shadow-xl"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          aria-expanded={tutorialOpen}
          aria-label={tutorialOpen ? 'Hide tutorials' : 'Show tutorials'}
        >
          <BookOpen className="w-4 h-4" />
          Tutorials
        </button>
        <aside className="w-[300px] sm:w-[340px] bg-white border border-slate-200 shadow-2xl select-none overflow-hidden">
          <TutorialSidebar onClose={() => setTutorialOpen(false)} />
        </aside>
      </div>
      
    </div>
  );
}
