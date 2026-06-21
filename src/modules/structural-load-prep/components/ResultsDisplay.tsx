/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ProjectState } from '../types';
import { roundTo, buildAssumptionsLog, BeamLoadResult, ColumnLoadResult } from '../calculators';
import { FinalLoadingConclusion } from '../combinationCalculators';
import { 
  Download, 
  Upload, 
  FileText, 
  Calculator, 
  Table, 
  FileSpreadsheet, 
  Check, 
  HelpCircle,
  Clock,
  Briefcase
} from 'lucide-react';

interface ResultsDisplayProps {
  project: ProjectState;
  beamLoads: BeamLoadResult[];
  columnLoads: ColumnLoadResult[];
  windForces: any;
  seismicForces: any;
  activeBeamId: string | null;
  activeColId: string | null;
  onImportProject: (imported: ProjectState) => void;
  slabType: string;
  conclusionsCompleted: boolean;
  onSignOffConclusions: (completed: boolean) => void;
  finalConclusions: FinalLoadingConclusion;
}

export default function ResultsDisplay({
  project,
  beamLoads,
  columnLoads,
  windForces,
  seismicForces,
  activeBeamId,
  activeColId,
  onImportProject,
  slabType,
  conclusionsCompleted,
  onSignOffConclusions,
  finalConclusions,
}: ResultsDisplayProps) {
  const [activeResultsSubTab, setActiveResultsSubTab] = useState<string>('beams');
  const assumptions = buildAssumptionsLog(project);

  const updateBeamOverride = (levelIndex: number, spanIndex: number, dimension: 'width' | 'depth', value: number) => {
    const updated = {
      ...project,
      memberOverrides: {
        ...project.memberOverrides,
        beamWidths: {
          ...project.memberOverrides.beamWidths,
          ...(dimension === 'width' ? { [`${levelIndex}-${spanIndex}`]: value } : {})
        },
        beamDepths: {
          ...project.memberOverrides.beamDepths,
          ...(dimension === 'depth' ? { [`${levelIndex}-${spanIndex}`]: value } : {})
        }
      }
    };
    onImportProject(updated);
  };

  const updateColumnOverride = (levelIndex: number, gridIndex: number, dimension: 'width' | 'depth', value: number) => {
    const updated = {
      ...project,
      memberOverrides: {
        ...project.memberOverrides,
        columnWidths: {
          ...project.memberOverrides.columnWidths,
          ...(dimension === 'width' ? { [`${levelIndex}-${gridIndex}`]: value } : {})
        },
        columnDepths: {
          ...project.memberOverrides.columnDepths,
          ...(dimension === 'depth' ? { [`${levelIndex}-${gridIndex}`]: value } : {})
        }
      }
    };
    onImportProject(updated);
  };

  const updateSlabOverride = (levelIndex: number, spanIndex: number, value: number) => {
    const updated = {
      ...project,
      memberOverrides: {
        ...project.memberOverrides,
        slabThicknesses: {
          ...(project.memberOverrides.slabThicknesses || {}),
          [`${levelIndex}-${spanIndex}`]: value
        }
      }
    };
    onImportProject(updated);
  };

  const updateLoadOverride = (levelIndex: number, spanIndex: number, type: 'slabSW' | 'beamSW' | 'SDL' | 'LL' | 'wall', value: number) => {
    const updated = { ...project };
    if (type === 'slabSW') {
      updated.memberOverrides = {
        ...updated.memberOverrides,
        slabSWs: { ...(updated.memberOverrides.slabSWs || {}), [`${levelIndex}-${spanIndex}`]: value }
      };
    } else if (type === 'beamSW') {
      updated.memberOverrides = {
        ...updated.memberOverrides,
        beamSWs: { ...(updated.memberOverrides.beamSWs || {}), [`${levelIndex}-${spanIndex}`]: value }
      };
    } else if (type === 'SDL') {
      updated.memberOverrides = {
        ...updated.memberOverrides,
        SDLs: { ...(updated.memberOverrides.SDLs || {}), [`${levelIndex}-${spanIndex}`]: value }
      };
    } else if (type === 'LL') {
      updated.memberOverrides = {
        ...updated.memberOverrides,
        LLs: { ...(updated.memberOverrides.LLs || {}), [`${levelIndex}-${spanIndex}`]: value }
      };
    } else if (type === 'wall') {
      updated.memberOverrides = {
        ...updated.memberOverrides,
        wallLoads: { ...(updated.memberOverrides.wallLoads || {}), [`${levelIndex}-${spanIndex}`]: value }
      };
    }
    onImportProject(updated);
  };

  // Helper to trigger JSON download
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${project.name.toLowerCase().replace(/\s+/g, "_")}_structural_load_prep.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Helper for JSON import
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (imported && imported.geometry && imported.memberSizes) {
          onImportProject(imported);
          alert("Project imported successfully!");
        } else {
          alert("Invalid file format. Ensure it is a valid StrucForge load preparation schema.");
        }
      } catch (err) {
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
  };

  // CSV Exporter for any tabular data
  const exportToCSV = (headers: string[], rows: string[][], filename: string) => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += headers.join(",") + "\n";
    rows.forEach(row => {
      const sanitized = row.map(val => `"${val.replace(/"/g, '""')}"`);
      csvContent += sanitized.join(",") + "\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleExportBeamsCSV = () => {
    const headers = [
      'Beam ID', 'Level', 'Grid Left', 'Grid Right', 'Span Length (m)',
      'Slab SW (kN/m)', 'Beam SW (kN/m)', 'SDL (kN/m)', 'LL (kN/m)',
      'Wall load (kN/m)', 'Parapet load (kN/m)', 'Service Total DL (kN/m)', 'Service Total LL (kN/m)'
    ];
    const rows = beamLoads.map(b => [
      b.beamLabel,
      b.levelName,
      project.geometry.gridLabels[b.spanIndex],
      project.geometry.gridLabels[b.spanIndex + 1],
      b.L.toString(),
      roundTo(b.slab_SW, 3).toString(),
      roundTo(b.beam_SW, 3).toString(),
      roundTo(b.SDL, 3).toString(),
      roundTo(b.LL, 3).toString(),
      roundTo(b.wall_load, 3).toString(),
      roundTo(b.parapet_load, 3).toString(),
      roundTo(b.service_DL, 3).toString(),
      roundTo(b.service_LL, 3).toString()
    ]);
    exportToCSV(headers, rows, `${project.name.toLowerCase().replace(/\s+/g, '_')}_beams_schedule`);
  };

  const handleExportColumnsCSV = () => {
    const headers = [
      'Column ID', 'Grid line', 'Support Level', 'Width (b mm)', 'Depth (h mm)',
      'Left Beam React DL (kN)', 'Left Beam React LL (kN)', 'Right Beam React DL (kN)', 'Right Beam React LL (kN)',
      'Point DL (kN)', 'Point LL (kN)', 'Column Storey SW (kN)',
      'Accumulated DL (kN)', 'Accumulated LL (kN)', 'Total Axial Load (kN)'
    ];
    const rows = columnLoads.map(c => [
      c.columnLabel,
      project.geometry.gridLabels[c.gridIndex],
      c.levelName,
      c.b.toString(),
      c.h.toString(),
      roundTo(c.leftBeamReaction_DL, 2).toString(),
      roundTo(c.leftBeamReaction_LL, 2).toString(),
      roundTo(c.rightBeamReaction_DL, 2).toString(),
      roundTo(c.rightBeamReaction_LL, 2).toString(),
      roundTo(c.pointDL, 2).toString(),
      roundTo(c.pointLL, 2).toString(),
      roundTo(c.column_SW, 2).toString(),
      roundTo(c.accumulatedDL, 2).toString(),
      roundTo(c.accumulatedLL, 2).toString(),
      roundTo(c.accumulatedDL + c.accumulatedLL, 2).toString()
    ]);
    exportToCSV(headers, rows, `${project.name.toLowerCase().replace(/\s+/g, '_')}_columns_axial_accumulation`);
  };

  // Find active element details for the visual calculation trace
  const activeBeamData = activeBeamId ? beamLoads.find(b => `B${b.levelIndex}-${b.spanIndex}` === activeBeamId) : null;
  const activeColData = activeColId ? columnLoads.find(c => `C${c.levelIndex}-${c.gridIndex}` === activeColId) : null;

  return (
    <div className="space-y-6">
      
      {/* EXPORT / IMPORT CONTROLS ROW */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 p-3 rounded-lg">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-700">Project Action Hub:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* JSON Export */}
          <button 
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white font-medium rounded hover:bg-slate-900 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export Project JSON
          </button>
          
          {/* JSON Import */}
          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 font-medium rounded hover:bg-slate-50 transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            Import JSON
            <input 
              type="file" 
              accept=".json" 
              onChange={handleImportJSON} 
              className="hidden" 
            />
          </label>

          {/* CSV Export Tab dependant */}
          <button 
            onClick={activeResultsSubTab === 'columns' ? handleExportColumnsCSV : handleExportBeamsCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 text-white font-medium rounded hover:bg-sky-750 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export Active Schedule CSV
          </button>
        </div>
      </div>

      {/* RESULTS SUB-TABS NAVIGATION */}
      <div className="border-b border-slate-200">
        <div className="flex flex-wrap gap-1">
          {[
            { id: 'beams', label: 'Beam Loads Schedule', dotColor: 'bg-emerald-500' },
            { id: 'columns', label: 'Column Load Accumulation', dotColor: 'bg-blue-500' },
            { id: 'levels', label: 'Level-by-Level Force Summary', dotColor: 'bg-violet-500' },
            { id: 'lateral', label: 'Wind & Seismic Lateral Force Distribution', dotColor: 'bg-rose-500' },
            { id: 'combinations', label: conclusionsCompleted ? '✓ Load Combinations & Conclusions' : '⚡ Load Combinations & Conclusions', dotColor: conclusionsCompleted ? 'bg-emerald-600' : 'bg-amber-500 animate-pulse' },
            { id: 'assumptions', label: 'Verified Assumptions Log', dotColor: 'bg-amber-500' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveResultsSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-t-2 border-r border-l rounded-t-md transition-all ${
                activeResultsSubTab === tab.id
                  ? 'border-t-sky-600 bg-white text-slate-800 border-x-slate-200 shadow-xs'
                  : 'border-t-transparent border-x-transparent bg-slate-50 text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${tab.dotColor}`} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* SUB-TABS CONTENT */}
      <div className="bg-white rounded-lg min-h-[300px]">
        
        {/* TAB 1: BEAM LOAD SCHEDULE */}
        {activeResultsSubTab === 'beams' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs text-slate-500 font-sans italic">
                *Beam line results derived from {slabType.toUpperCase()} tributary transfers. Double weight includes plaster, partitions, and framing self weights.
              </span>
            </div>
            
            <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-inner">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase font-sans font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 border-r border-slate-200">Beam ID</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Level</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Span (m)</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center">Beam Size (b × h)</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center">Slab Thk (mm)</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-right">Slab SW (kN/m)</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-right">Beam SW (kN/m)</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-right">SDL (kN/m)</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-right">LL (kN/m)</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-right text-slate-700">Wall Load (kN/m)</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-right text-amber-700 font-bold bg-amber-50/50">Point Load(s) P (kN)</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-right text-purple-700 font-bold bg-purple-50/20">Eq. PL w_eq (kN/m)</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-right text-slate-705">Service total DL/LL (kN/m)</th>
                    <th className="py-2.5 px-3 text-right bg-indigo-50 text-indigo-950 font-black border-l border-indigo-150">Total Load w (kN/m)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {beamLoads.map((beam, idx) => {
                    const isSelected = activeBeamId === `B${beam.levelIndex}-${beam.spanIndex}`;
                    return (
                      <tr 
                        key={idx} 
                        className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                          isSelected ? 'bg-indigo-50/50 font-semibold' : ''
                        }`}
                      >
                        <td className="py-2 px-3 border-r border-slate-200 font-sans font-bold text-slate-800">{beam.beamLabel}</td>
                        <td className="py-2 px-3 border-r border-slate-200 text-slate-500 font-sans">{beam.levelName}</td>
                        <td className="py-2 px-3 border-r border-slate-200 text-center">{roundTo(beam.L, 2)}m</td>
                        <td className="py-1 px-2 border-r border-slate-200 text-center">
                          <div className="flex items-center justify-center gap-1 font-sans">
                            <input 
                              type="number" 
                              value={beam.b} 
                              onClick={(e) => e.stopPropagation()}
                              className="w-12 text-center p-0.5 border border-slate-200 rounded font-mono text-[11px] bg-slate-50 focus:bg-white focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                updateBeamOverride(beam.levelIndex, beam.spanIndex, 'width', val);
                              }}
                            />
                            <span className="text-slate-450 text-[10px]">×</span>
                            <input 
                              type="number" 
                              value={beam.h} 
                              onClick={(e) => e.stopPropagation()}
                              className="w-12 text-center p-0.5 border border-slate-200 rounded font-mono text-[11px] bg-slate-50 focus:bg-white focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                updateBeamOverride(beam.levelIndex, beam.spanIndex, 'depth', val);
                              }}
                            />
                          </div>
                        </td>
                        <td className="py-1 px-2 border-r border-slate-200 text-center">
                          <input 
                            type="number" 
                            value={beam.slabThickness} 
                            onClick={(e) => e.stopPropagation()}
                            className="w-16 text-center p-0.5 border border-slate-200 rounded font-mono text-[11px] bg-slate-50 focus:bg-white focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              updateSlabOverride(beam.levelIndex, beam.spanIndex, val);
                            }}
                          />
                        </td>
                        <td className="py-1 px-1.5 border-r border-slate-200 text-right">
                          <input 
                            type="number" 
                            step="0.01"
                            value={roundTo(beam.slab_SW, 3)} 
                            onClick={(e) => e.stopPropagation()}
                            className="w-16 text-right p-0.5 border border-slate-200 rounded font-mono text-[11px] bg-slate-50 focus:bg-white focus:ring-1 focus:ring-sky-500 text-slate-800"
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              updateLoadOverride(beam.levelIndex, beam.spanIndex, 'slabSW', val);
                            }}
                          />
                        </td>
                        <td className="py-1 px-1.5 border-r border-slate-200 text-right">
                          <input 
                            type="number" 
                            step="0.01"
                            value={roundTo(beam.beam_SW, 3)} 
                            onClick={(e) => e.stopPropagation()}
                            className="w-16 text-right p-0.5 border border-slate-200 rounded font-mono text-[11px] bg-slate-50 focus:bg-white focus:ring-1 focus:ring-sky-500 text-slate-800"
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              updateLoadOverride(beam.levelIndex, beam.spanIndex, 'beamSW', val);
                            }}
                          />
                        </td>
                        <td className="py-1 px-1.5 border-r border-slate-200 text-right">
                          <input 
                            type="number" 
                            step="0.01"
                            value={roundTo(beam.SDL, 3)} 
                            onClick={(e) => e.stopPropagation()}
                            className="w-16 text-right p-0.5 border border-slate-200 rounded font-mono text-[11px] bg-slate-50 focus:bg-white focus:ring-1 focus:ring-sky-500 text-slate-800"
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              updateLoadOverride(beam.levelIndex, beam.spanIndex, 'SDL', val);
                            }}
                          />
                        </td>
                        <td className="py-1 px-1.5 border-r border-slate-200 text-right">
                          <input 
                            type="number" 
                            step="0.01"
                            value={roundTo(beam.LL, 3)} 
                            onClick={(e) => e.stopPropagation()}
                            className="w-16 text-right p-0.5 border border-slate-200 rounded font-mono text-[11px] bg-sky-50 focus:bg-white focus:ring-1 focus:ring-sky-500 text-sky-850 font-bold"
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              updateLoadOverride(beam.levelIndex, beam.spanIndex, 'LL', val);
                            }}
                          />
                        </td>
                        <td className="py-1 px-1.5 border-r border-slate-200 text-right font-mono text-[11px]">
                          <input 
                            type="number" 
                            step="0.01"
                            value={roundTo(beam.wall_load, 2)} 
                            onClick={(e) => e.stopPropagation()}
                            className="w-16 text-right p-0.5 border border-slate-200 rounded font-mono text-[11px] bg-slate-50 focus:bg-white focus:ring-1 focus:ring-sky-500 text-slate-800"
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              updateLoadOverride(beam.levelIndex, beam.spanIndex, 'wall', val);
                            }}
                          />
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right bg-amber-50/20 text-amber-900 font-mono text-[11px]">
                          {(() => {
                            const beamPLs = project.pointLoads.filter(
                              pl => pl.active && pl.levelIndex === beam.levelIndex && pl.beamIndex === beam.spanIndex
                            );
                            return beamPLs.length > 0 ? (
                              <div className="flex flex-col items-end gap-0.5">
                                {beamPLs.map((pl, pIdx) => (
                                  <span key={pIdx} title={`${pl.case}: ${pl.description || ''}`}>
                                    {pl.case === 'LL' ? 'P_L' : 'P_D'} = {pl.magnitude} @ {pl.distance}m
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-350">—</span>
                            );
                          })()}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right bg-purple-50/10 text-purple-800 font-mono text-[11px]">
                          {beam.point_DL_eq > 0 || beam.point_LL_eq > 0 ? (
                            <div className="flex flex-col items-end gap-0.5">
                              {beam.point_DL_eq > 0 && (
                                <span>w_D = {roundTo(beam.point_DL_eq, 2)}</span>
                              )}
                              {beam.point_LL_eq > 0 && (
                                <span className="text-purple-950 font-bold">w_L = {roundTo(beam.point_LL_eq, 2)}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-350">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right bg-slate-50/20 text-slate-800 font-sans">
                          <span className="font-mono text-[11px]">DL={roundTo(beam.service_DL, 2)}</span>
                          <span className="mx-1 text-slate-300">|</span>
                          <span className="font-mono text-[11px] text-sky-700 font-bold font-semibold">LL={roundTo(beam.service_LL, 2)}</span>
                        </td>
                        <td className="py-2 px-3 text-right bg-indigo-50 text-indigo-950 font-black text-xs border-l border-indigo-150">
                          {roundTo(beam.service_DL + beam.service_LL, 2)} <span className="text-[10px] text-indigo-600 font-normal">kN/m</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: COLUMN LOAD ACCUMULATION */}
        {activeResultsSubTab === 'columns' && (
          <div className="space-y-4">
            <div className="px-1 text-xs text-slate-500 leading-relaxed font-sans italic">
              *Columns transfer Reactions from Beams level-by-level starting from the uppermost roof down. Cumulative columns weights SW are integrated automatically below. 
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase font-sans font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 border-r border-slate-200">Column ID</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Grid Line</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Supporting Level</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center">Col Size (b × h)</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-right">Left Beam DL/LL (kN)</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-right">Right Beam DL/LL (kN)</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-right">Point Load DL/LL (kN)</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-right">Storey SW (kN)</th>
                    <th className="py-2.5 px-3 text-right bg-slate-100 text-slate-800 text-center font-bold">Accumulated Service DL/LL (kN)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {columnLoads.map((col, idx) => {
                    const isSelected = activeColId === `C${col.levelIndex}-${col.gridIndex}` || activeColId === `Grid-${col.gridIndex}`;
                    return (
                      <tr 
                        key={idx} 
                        className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                          isSelected ? 'bg-blue-50/50 font-semibold' : ''
                        }`}
                      >
                        <td className="py-2 px-3 border-r border-slate-200 font-sans font-bold text-slate-800">{col.columnLabel}</td>
                        <td className="py-2 px-3 border-r border-slate-200 text-center text-slate-500 font-sans">{project.geometry.gridLabels[col.gridIndex]}</td>
                        <td className="py-2 px-3 border-r border-slate-200 text-slate-500 font-sans">{col.levelName}</td>
                        <td className="py-1 px-2 border-r border-slate-200 text-center">
                          <div className="flex items-center justify-center gap-1 font-sans">
                            <input 
                              type="number" 
                              value={col.b} 
                              onClick={(e) => e.stopPropagation()}
                              className="w-12 text-center p-0.5 border border-slate-200 rounded font-mono text-[11px] bg-slate-50 focus:bg-white focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                updateColumnOverride(col.levelIndex, col.gridIndex, 'width', val);
                              }}
                            />
                            <span className="text-slate-450 text-[10px]">×</span>
                            <input 
                              type="number" 
                              value={col.h} 
                              onClick={(e) => e.stopPropagation()}
                              className="w-12 text-center p-0.5 border border-slate-200 rounded font-mono text-[11px] bg-slate-50 focus:bg-white focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                updateColumnOverride(col.levelIndex, col.gridIndex, 'depth', val);
                              }}
                            />
                          </div>
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right text-slate-400">
                          {roundTo(col.leftBeamReaction_DL, 1)} / <span className="text-sky-600">{roundTo(col.leftBeamReaction_LL, 1)}</span>
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right text-slate-400">
                          {roundTo(col.rightBeamReaction_DL, 1)} / <span className="text-sky-600">{roundTo(col.rightBeamReaction_LL, 1)}</span>
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right text-slate-400">
                          {col.pointDL > 0 || col.pointLL > 0 ? (
                            <span>{roundTo(col.pointDL, 1)} / <span className="text-sky-600">{roundTo(col.pointLL, 1)}</span></span>
                          ) : '-'}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right text-slate-500">{roundTo(col.column_SW, 2)}</td>
                        <td className="py-2 px-3 text-right bg-slate-50 font-sans font-bold text-slate-800 text-center text-[11px]">
                          DL = {roundTo(col.accumulatedDL, 2)} | LL = <span className="text-sky-700">{roundTo(col.accumulatedLL, 2)}</span>
                          <span className="text-slate-400 font-normal font-mono text-[10px] ml-1.5">(Total = {roundTo(col.accumulatedDL + col.accumulatedLL, 2)} kN)</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: LEVEL-BY-LEVEL SUMMARY */}
        {activeResultsSubTab === 'levels' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-500 px-1 font-sans italic">
              *Diaphragm heights and estimated cumulative loading weights used to compute velocity-profile wind forces and static base seismic shear.
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase font-sans font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 border-r border-slate-200">Level Index</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Height Ele. (m)</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Height Storey (m)</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-right">Exposed Width x Length (m)</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-right">Floor Area (m²)</th>
                    <th className="py-2.5 px-3 text-right bg-sky-50 text-sky-800">Seismic Weight W_i (kN)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {seismicForces.levelForces.map((lf: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-3 border-r border-slate-200 font-sans font-bold text-slate-800">Level-{lf.levelIndex} {lf.levelName.includes('Roof') ? '(Roof)' : ''}</td>
                      <td className="py-2 px-3 border-r border-slate-200 text-center">{roundTo(lf.z_height, 2)}m</td>
                      <td className="py-2 px-3 border-r border-slate-200 text-center">
                        {roundTo(project.geometry.storeyHeights[lf.levelIndex - 1] || 3.0, 2)}m
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-right text-slate-500">
                        {project.geometry.buildingPlanWidth} × {project.geometry.buildingPlanLength}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-right text-slate-500">
                        {roundTo(project.geometry.buildingPlanWidth * project.geometry.buildingPlanLength, 1)} m²
                      </td>
                      <td className="py-2 px-3 text-right bg-sky-50/30 text-sky-850 font-bold">
                        {roundTo(lf.W_level, 2)} kN
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-sans font-extrabold text-slate-800 border-t border-slate-200">
                    <td colSpan={5} className="py-3 px-3 text-right uppercase">Total Seismic Building Weight (W):</td>
                    <td className="py-3 px-3 text-right font-mono text-sky-900 border-l border-slate-200">
                      {roundTo(seismicForces.totalSeismicWeight, 2)} kN
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: LATERAL FORCE LISTS */}
        {activeResultsSubTab === 'lateral' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Wind Equivalent Static details */}
            <div className="border border-slate-200 rounded-lg p-4 space-y-3.5 shadow-xs">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shrink-0" />
                  Wind Force Distribution Table
                </span>
                <span className="text-[10px] font-mono font-bold bg-cyan-100 text-cyan-800 px-1.5 py-0.5 rounded">
                  Wind V={project.wind.speed}{project.wind.speedUnit}
                </span>
              </div>
              
              <div className="overflow-x-auto text-[11px]">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 font-bold border-b border-slate-200 text-slate-600 font-sans">
                    <tr>
                      <th className="p-1.5">Level</th>
                      <th className="p-1.5 text-center">K_z</th>
                      <th className="p-1.5 text-right">P_net (kPa)</th>
                      <th className="p-1.5 text-right">A_proj (m²)</th>
                      <th className="p-1.5 text-right">Frame Force F_i (kN)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-slate-550">
                    {windForces.levelWindForces.map((wf: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-1.5 font-sans font-semibold text-slate-705">{wf.levelName}</td>
                        <td className="p-1.5 text-center">{roundTo(wf.K_z, 3)}</td>
                        <td className="p-1.5 text-right font-bold text-slate-800">{roundTo(wf.p_windward, 3)}</td>
                        <td className="p-1.5 text-right text-slate-400">{roundTo(wf.projectedArea, 1)}</td>
                        <td className="p-1.5 text-right font-bold text-cyan-700">{roundTo(wf.F_frame, 1)} kN</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-cyan-50 border border-cyan-100 p-3 rounded text-[11px] text-cyan-800 space-y-1 relative leading-relaxed">
                <div className="font-bold">Summary wind performance values:</div>
                <p>Frame share factor: <span className="font-bold">{project.geometry.frameSharePercent}%</span></p>
                <p>Total building wind shear shear value: <span className="font-bold">{roundTo(windForces.baseShearV, 2)} kN</span></p>
                <p>Overturning total wind moment: <span className="font-bold">{roundTo(windForces.overturningMoment, 2)} kN-m</span></p>
              </div>
            </div>

            {/* Seismic static details */}
            <div className="border border-slate-200 rounded-lg p-4 space-y-3.5 shadow-xs">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                  Seismic Force Distribution Table
                </span>
                <span className="text-[10px] font-mono font-bold bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded">
                  Z={project.seismic.zoneFactor} | R={project.seismic.responseModification}
                </span>
              </div>

              <div className="overflow-x-auto text-[11px]">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 font-bold border-b border-slate-200 text-slate-600 font-sans">
                    <tr>
                      <th className="p-1.5">Level</th>
                      <th className="p-1.5 text-right">W_i (kN)</th>
                      <th className="p-1.5 text-center">C_vx</th>
                      <th className="p-1.5 text-right">Force F_x (kN)</th>
                      <th className="p-1.5 text-right">Shear V_x (kN)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-slate-550">
                    {seismicForces.levelForces.slice().reverse().map((sf: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-1.5 font-sans font-semibold text-slate-705">Level-{sf.levelIndex}</td>
                        <td className="p-1.5 text-right text-slate-400">{roundTo(sf.W_level, 1)}</td>
                        <td className="p-1.5 text-center">{roundTo(sf.C_vx, 4)}</td>
                        <td className="p-1.5 text-right font-bold text-rose-700">{roundTo(sf.F_level, 1)} kN</td>
                        <td className="p-1.5 text-right text-slate-800 font-bold">{roundTo(sf.V_shear, 1)} kN</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-rose-50 border border-rose-100 p-3 rounded text-[11px] text-rose-800 space-y-1 relative leading-relaxed">
                <div className="font-bold">Summary seismic performance values:</div>
                <p>Calculated Fundamental period (T): <span className="font-bold">{roundTo(seismicForces.periodT, 3)} seconds</span></p>
                <p>Vertical k-exponent: <span className="font-bold">{roundTo(seismicForces.k_exponent, 3)}</span></p>
                <p>Design base static shear coefficient: <span className="font-bold">{roundTo(seismicForces.baseShearV / seismicForces.totalSeismicWeight, 4)}</span></p>
                <p>Total equivalent static base shear: <span className="font-bold">{roundTo(seismicForces.baseShearV, 2)} kN</span></p>
              </div>
            </div>

          </div>
        )}

        {/* TAB: LOAD COMBINATIONS & GOVERNING CONCLUSIONS */}
        {activeResultsSubTab === 'combinations' && (
          <div className="space-y-6 font-sans">
            
            {/* SIGN-OFF BANNER PANEL */}
            <div className={`p-5 rounded-xl border transition-all duration-300 ${
              conclusionsCompleted 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                : 'bg-amber-50 border-amber-300 text-amber-950'
            }`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-black text-sm uppercase tracking-wide flex items-center gap-2">
                    {conclusionsCompleted ? (
                      <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-emerald-650 text-white text-[11px] font-extrabold shadow-xs">✓</span>
                    ) : (
                      <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-amber-600 text-white text-xs font-bold animate-ping">!</span>
                    )}
                    {conclusionsCompleted ? 'Engineering Loading Conclusions Certified' : 'Loading Conclusions Sign-off Required'}
                  </h3>
                  <p className="text-xs text-slate-650 leading-relaxed max-w-2xl">
                    {conclusionsCompleted 
                      ? 'The structural loading conclusions have been authorized and stamped. Iframe printing restrictions have been bypassed, and the official printed layout is now unlocked! Navigate to the "Printable Report" tab to view or export.' 
                      : 'Before exporting or printing the report, a comprehensive check of all factored combinations (combining dead, live, wind, and seismic components) is required. Review the summaries below and click "Authorize conclusions" to proceed.'}
                  </p>
                </div>
                <div className="shrink-0 flex items-center">
                  {conclusionsCompleted ? (
                    <button
                      onClick={() => onSignOffConclusions(false)}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg border transition-colors shadow-xs"
                    >
                      Revoke Verification
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        onSignOffConclusions(true);
                        alert("Structural load combinations successfully verified and engineering signed-off! Printable report is now unlocked.");
                      }}
                      className="px-4 py-2 bg-emerald-650 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-lg transition-all duration-150 shadow-md flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5 font-black" />
                      Verify & Authorize Conclusions
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* LATERAL BASE SHEAR ANALYSIS DECK */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col justify-between space-y-2">
                <div>
                  <span className="font-extrabold uppercase text-slate-400 text-[9px] tracking-widest block font-mono">Structural Wind Force</span>
                  <div className="text-2xl font-black text-slate-800 font-mono mt-1">
                    {finalConclusions.lateral.windBaseShear.toFixed(2)} <span className="text-xs">kN</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 font-sans leading-normal">
                  Cumulative net horizontal drag demand acting on the building frame face projected area.
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col justify-between space-y-2">
                <div>
                  <span className="font-extrabold uppercase text-slate-400 text-[9px] tracking-widest block font-mono">Equivalent Seismic Shear</span>
                  <div className="text-2xl font-black text-slate-800 font-mono mt-1">
                    {finalConclusions.lateral.seismicBaseShear.toFixed(2)} <span className="text-xs">kN</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 font-sans leading-normal">
                  Static base seismic response based on building total reactive mass and mechanical characteristics.
                </p>
              </div>

              <div className="border border-indigo-200 rounded-xl p-4 bg-indigo-50/50 flex flex-col justify-between space-y-2 md:col-span-1">
                <div>
                  <span className="font-extrabold uppercase text-indigo-500 text-[9px] tracking-widest block font-mono">Governing Lateral Case</span>
                  <div className="text-lg font-black text-indigo-950 font-sans mt-0.5 flex items-center gap-1.5">
                    <span className="flex h-2 w-2 rounded-full bg-rose-500" />
                    {finalConclusions.lateral.governingLateralCase.toUpperCase()} GOVERNS
                  </div>
                </div>
                <p className="text-[10px] text-indigo-900 font-sans leading-normal">
                  {finalConclusions.lateral.governingLateralCase === 'Seismic' ? 'Earthquake base reactions are larger. Main moment frame design must follow seismic seismic ductility.' : 'Wind shear base drag exceeds seismic. Building structure must resist high velocity pressure sway.'}
                </p>
              </div>

            </div>

            <div className="bg-sky-50 border border-sky-100 rounded-lg p-3.5 text-xs text-sky-950 leading-relaxed font-sans">
              <strong>Lateral Loading Synopsis:</strong> {finalConclusions.lateral.conclusionText}
            </div>

            {/* MEMBER ANALYSIS SECTION */}
            <div className="space-y-4">
              <h4 className="font-extrabold text-sm text-slate-800 border-b pb-1">1. Beam Factored Load Combinations & Gravity Conclusions</h4>
              <p className="text-xs text-slate-500 italic leading-normal">
                Factored gravity loads (w_u) represent ultimate limits computed by evaluating active dead and live load combinations. Use governed values for beam bending moment diagrams and shears.
              </p>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 uppercase font-sans font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 border-r border-slate-200">Beam</th>
                      <th className="py-2.5 px-3 border-r border-slate-200 text-right">Service D (kN/m)</th>
                      <th className="py-2.5 px-3 border-r border-slate-200 text-right">Service L (kN/m)</th>
                      <th className="py-2.5 px-3 border-r border-slate-200 text-center">Governing Load Combination</th>
                      <th className="py-2.5 px-3 border-r border-slate-200 text-right bg-emerald-50 text-emerald-950">Factored w_u (kN/m)</th>
                      <th className="py-2.5 px-3">Structural Evaluation Conclusion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {finalConclusions.beams.map((b, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 border-r border-slate-200 font-sans font-extrabold text-slate-800">{b.beamLabel}</td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right">{b.serviceDL.toFixed(2)}</td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right">{b.serviceLL.toFixed(2)}</td>
                        <td className="py-2 px-3 border-r border-slate-200 text-center font-sans text-xs">{b.governingComboName}</td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right font-black bg-emerald-50/30 text-emerald-900">{b.maxWu.toFixed(2)}</td>
                        <td className="py-2 px-3 font-sans text-[11px] text-slate-500 italic leading-snug">{b.conclusion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* COLUMN ANALYSIS SECTION */}
            <div className="space-y-4 pt-2">
              <h4 className="font-extrabold text-sm text-slate-800 border-b pb-1">2. Column Factored Axial Combinations & Stability Checks (Foundation Level)</h4>
              <p className="text-xs text-slate-500 italic leading-normal">
                Analysis evaluates critical base columns. Outer columns (Grid A and D) include lateral overturning influence (±ΔP) caused by global wind and earthquake base moments.
              </p>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 uppercase font-sans font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 border-r border-slate-200">Column</th>
                      <th className="py-2.5 px-3 border-r border-slate-200 text-right">Service D (kN)</th>
                      <th className="py-2.5 px-3 border-r border-slate-200 text-right">Service L (kN)</th>
                      <th className="py-2.5 px-3 border-r border-slate-200 text-right text-indigo-700 bg-indigo-50/20">Wind Overturning ΔP</th>
                      <th className="py-2.5 px-3 border-r border-slate-200 text-right text-sky-700 bg-sky-50/20">Seismic Overturning ΔP</th>
                      <th className="py-2.5 px-3 border-r border-slate-200 text-center">Max Compression Combo</th>
                      <th className="py-2.5 px-3 border-r border-slate-200 text-right bg-indigo-50 text-indigo-950">Max P_u (kN)</th>
                      <th className="py-2.5 px-3 border-r border-slate-200 text-center">Min Stabilizing Combo</th>
                      <th className="py-2.5 px-3 border-r border-slate-200 text-right bg-amber-50 text-amber-950 font-bold">Min P_u (kN)</th>
                      <th className="py-2.5 px-3">Geotechnical Foundation Conclusion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
                    {finalConclusions.columns.map((c, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 border-r border-slate-200 font-sans font-extrabold text-slate-800">{c.columnLabel}</td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right">{c.serviceDL.toFixed(1)}</td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right">{c.serviceLL.toFixed(1)}</td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right bg-indigo-50/10">{c.overturningDeltaWind > 0 ? `±${c.overturningDeltaWind.toFixed(1)}` : '—'}</td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right bg-sky-50/10">{c.overturningDeltaSeis > 0 ? `±${c.overturningDeltaSeis.toFixed(1)}` : '—'}</td>
                        <td className="py-2 px-3 border-r border-slate-200 text-center font-sans">{c.governingCompressComboName}</td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right font-black bg-indigo-50/30 text-indigo-900">{c.maxPuCompress.toFixed(1)}</td>
                        <td className="py-2 px-3 border-r border-slate-200 text-center font-sans">{c.governingUpliftComboName}</td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right font-black bg-amber-50/30 text-amber-900">{c.minPuCompress.toFixed(1)}</td>
                        <td className="py-2 px-3 font-sans text-[11px] text-slate-500 italic leading-snug">{c.conclusion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 5: ASSUMPTIONS LOG */}
        {activeResultsSubTab === 'assumptions' && (
          <div className="space-y-4">
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase font-sans font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 border-r border-slate-200">Parameter Parameter</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center">Value</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center">Unit</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 font-sans">Source Type</th>
                    <th className="py-2.5 px-3">Engineering Notes / Comments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assumptions.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 border-r border-slate-200 font-bold text-slate-750">{item.parameter}</td>
                      <td className="py-2.5 px-3 border-r border-slate-200 text-center font-mono font-bold text-slate-800">{item.value}</td>
                      <td className="py-2.5 px-3 border-r border-slate-200 text-center text-slate-500">{item.unit}</td>
                      <td className="py-2.5 px-3 border-r border-slate-200">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 uppercase">
                          {item.source}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px] leading-relaxed italic">
                        {item.notes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* FORMULA TRACE DETAILS PANEL - DYNAMIC UPDATE ON INTERACTION */}
      <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/80 space-y-3.5">
        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <Calculator className="w-4 h-4 text-sky-600" />
          Interactive Structural Calculation & Verification Trace Log
        </h4>
        
        {activeBeamData ? (
          <div className="bg-white border border-slate-250 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-extrabold text-xs text-sky-800 font-mono">Beam Trace: {activeBeamData.beamLabel} (Level {activeBeamData.levelName})</span>
              <span className="text-[10px] text-slate-400">Span Length L = {roundTo(activeBeamData.L, 2)}m</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="space-y-2 bg-slate-50 p-2.5 rounded border border-slate-100">
                <div className="font-bold font-sans text-slate-700 underline mb-1">Beam self-weight (SW)</div>
                <p className="text-slate-400 text-[9px] font-sans">Formula: b_m * h_m * concrete_unit_weight</p>
                <p className="text-slate-700 font-bold">
                  ({activeBeamData.b}/1000) × ({activeBeamData.h}/1000) × {project.materials.concUnitWeight} kN/m³
                </p>
                <p className="text-emerald-700 font-extrabold text-sm border-t pt-1">
                  = {roundTo(activeBeamData.beam_SW, 3)} kN/m
                </p>
              </div>

              <div className="space-y-2 bg-slate-50 p-2.5 rounded border border-slate-100">
                <div className="font-bold font-sans text-slate-700 underline mb-1">Slab Self-Weight transferred to beam</div>
                <p className="text-slate-400 text-[9px] font-sans">Formula: eq_tributary_width * (slabThickness_m * conc_density)</p>
                <p className="text-slate-700">
                  Width = {roundTo(activeBeamData.tributary.totalEquivalentWidth, 2)}m | Thk = {project.memberSizes.slabThickness}mm
                </p>
                <p className="text-emerald-700 font-extrabold text-sm border-t pt-1">
                  = {roundTo(activeBeamData.slab_SW, 3)} kN/m
                </p>
              </div>

              <div className="space-y-2 bg-slate-50 p-2.5 rounded border border-slate-100">
                <div className="font-bold font-sans text-slate-700 underline mb-1">Superimposed Dead Load (SDL)</div>
                <p className="text-slate-400 text-[9px] font-sans">SDL Pressures base: Finish ({project.materials.floorFinish}) + Partition ({project.materials.partitionLoad}) + MEP ({project.materials.mepAllowance}) + Plaster = {roundTo(activeBeamData.SDL / (activeBeamData.tributary.totalEquivalentWidth || 1), 2)} kPa</p>
                <p className="text-slate-705">
                  Width {roundTo(activeBeamData.tributary.totalEquivalentWidth, 2)}m × SDL Pressure
                </p>
                <p className="text-emerald-700 font-extrabold text-sm border-t pt-1">
                  = {roundTo(activeBeamData.SDL, 3)} kN/m
                </p>
              </div>

              <div className="space-y-2 bg-slate-50 p-2.5 rounded border border-slate-100">
                <div className="font-bold font-sans text-slate-700 underline mb-1">Live Load (LL) on span</div>
                <p className="text-slate-400 text-[9px] font-sans">Floor live load = {project.materials.liveLoadOccupancy} kPa</p>
                <p className="text-slate-705">
                  Width {roundTo(activeBeamData.tributary.totalEquivalentWidth, 2)}m × Live pressure
                </p>
                <p className="text-emerald-700 font-extrabold text-sm border-t pt-1">
                  = {roundTo(activeBeamData.LL, 3)} kN/m
                </p>
              </div>
            </div>

            <div className="border-t pt-2 mt-2 leading-relaxed text-slate-500 text-[11px] font-sans">
              <span className="font-bold text-slate-800">Equivalent Support Reactions transferred to columns:</span>
              <p className="font-mono text-xs text-slate-700 mt-1">
                R_left = R_right = (DL_total × L) / 2 = ({roundTo(activeBeamData.service_DL, 2)} × {roundTo(activeBeamData.L, 2)}) / 2 = <span className="font-bold text-sky-700">{roundTo((activeBeamData.service_DL * activeBeamData.L) / 2, 2)} kN</span>
              </p>
            </div>
          </div>
        ) : activeColData ? (
          <div className="bg-white border border-slate-250 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center border-b pb-22">
              <span className="font-extrabold text-xs text-blue-800 font-mono">Column Trace: {activeColData.columnLabel} (Level {activeColData.levelName})</span>
              <span className="text-[10px] text-slate-400">Dimensions: {activeColData.b} × {activeColData.h} mm</span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="bg-slate-50 p-3 rounded space-y-1.5 border border-slate-100">
                <div className="font-bold font-sans text-slate-705">Self Weight of this storey column segment:</div>
                <p className="text-slate-500 text-[10px]">
                  col_width_m × col_depth_m × storey_height_m × concrete_unit_weight
                </p>
                <p className="text-slate-800">
                  ({activeColData.b}/1000) × ({activeColData.h}/1000) × {project.geometry.storeyHeights[activeColData.levelIndex - 1]}m × {project.materials.concUnitWeight} kN/m³
                </p>
                <p className="font-bold text-emerald-700">
                  = {roundTo(activeColData.column_SW, 2)} kN
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded space-y-1 bg-sky-50/20 border border-slate-100 leading-relaxed">
                <div className="font-bold font-sans text-slate-705">Service Load components accumulate down:</div>
                <p className="text-slate-450 text-[10px] font-sans">Sum of left beam reactions, right beam reactions, point loads and column SW at this level:</p>
                <p className="text-slate-750 font-sans">
                  - Left reaction DL = {roundTo(activeColData.leftBeamReaction_DL, 2)} kN | LL = {roundTo(activeColData.leftBeamReaction_LL, 2)} kN <br />
                  - Right reaction DL = {roundTo(activeColData.rightBeamReaction_DL, 2)} kN | LL = {roundTo(activeColData.rightBeamReaction_LL, 2)} kN <br />
                  - Direct point loads DL = {roundTo(activeColData.pointDL, 2)} kN | LL = {roundTo(activeColData.pointLL, 2)} kN <br />
                  - Head SW = {roundTo(activeColData.column_SW, 2)} kN
                </p>
                <p className="border-t border-slate-200 pt-1.5 mt-1 text-[11px] font-sans font-bold text-slate-800">
                  Level service component total: DL = {roundTo(activeColData.levelServiceDL, 2)} kN, LL = {roundTo(activeColData.levelServiceLL, 2)} kN
                </p>
                <p className="text-blue-800 text-sm font-sans font-extrabold pt-1">
                  Accumulated Service DL from roof down: {roundTo(activeColData.accumulatedDL, 2)} kN
                </p>
                <p className="text-sky-800 text-sm font-sans font-extrabold">
                  Accumulated Service LL from roof down: {roundTo(activeColData.accumulatedLL, 2)} kN
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic text-center py-4 bg-white border border-dashed rounded-lg">
            Click any member line (beam or column) in either diagram to inspect the immediate structural equation substitution trace.
          </p>
        )}
      </div>

    </div>
  );
}
