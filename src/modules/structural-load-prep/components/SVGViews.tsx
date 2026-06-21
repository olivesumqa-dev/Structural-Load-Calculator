/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ProjectState, PointLoad } from '../types';
import { roundTo, BeamLoadResult, ColumnLoadResult, getLevelElevations } from '../calculators';
import { HelpCircle, Eye, ArrowUpRight, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';

interface SVGViewsProps {
  project: ProjectState;
  beamLoads: BeamLoadResult[];
  columnLoads: ColumnLoadResult[];
  windForces: any;
  seismicForces: any;
  activeBeamId: string | null;
  activeColId: string | null;
  onSelectBeam: (id: string | null) => void;
  onSelectCol: (id: string | null) => void;
  slabType: string;
  isDeleteModeActive?: boolean;
  onDeletePointLoad?: (id: string) => void;
  onDeleteBeamOverrides?: (levelIndex: number, spanIndex: number) => void;
  onDeleteColumnOverrides?: (levelIndex: number, gridIndex: number) => void;
  viewMode?: 'plan' | 'framing' | 'both';
}

export default function SVGViews({
  project,
  beamLoads,
  columnLoads,
  windForces,
  seismicForces,
  activeBeamId,
  activeColId,
  onSelectBeam,
  onSelectCol,
  slabType,
  isDeleteModeActive = false,
  onDeletePointLoad,
  onDeleteBeamOverrides,
  onDeleteColumnOverrides,
  viewMode = 'both',
}: SVGViewsProps) {
  const { geometry, pointLoads } = project;
  const numGrids = geometry.numGrids;
  const numLevels = geometry.numLevels;

  // Viewport Settings
  const width = 800;
  const heightPlan = 420;
  const heightFrame = 500;
  const paddingX = 100;

  // Zoom and Pan States
  const [zoomPlan, setZoomPlan] = useState({ scale: 1, x: 0, y: 0 });
  const [isDraggingPlan, setIsDraggingPlan] = useState(false);
  const [dragStartPlan, setDragStartPlan] = useState({ x: 0, y: 0 });

  const [zoomFrame, setZoomFrame] = useState({ scale: 1, x: 0, y: 0 });
  const [isDraggingFrame, setIsDraggingFrame] = useState(false);
  const [dragStartFrame, setDragStartFrame] = useState({ x: 0, y: 0 });

  // Zoom handlers
  const handleZoomInPlan = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomPlan(p => ({ ...p, scale: Math.min(p.scale * 1.25, 5) }));
  };
  const handleZoomOutPlan = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomPlan(p => ({ ...p, scale: Math.max(p.scale * 0.8, 0.5) }));
  };
  const handleResetPlan = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomPlan({ scale: 1, x: 0, y: 0 });
  };

  const handleZoomInFrame = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomFrame(f => ({ ...f, scale: Math.min(f.scale * 1.25, 5) }));
  };
  const handleZoomOutFrame = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomFrame(f => ({ ...f, scale: Math.max(f.scale * 0.8, 0.5) }));
  };
  const handleResetFrame = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomFrame({ scale: 1, x: 0, y: 0 });
  };

  // Pan Mouse Handlers - Plan View
  const handleMouseDownPlan = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (e.button !== 0) return; // Left click only
    setIsDraggingPlan(true);
    setDragStartPlan({ x: e.clientX - zoomPlan.x, y: e.clientY - zoomPlan.y });
  };

  const handleMouseMovePlan = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!isDraggingPlan) return;
    setZoomPlan(prev => ({
      ...prev,
      x: e.clientX - dragStartPlan.x,
      y: e.clientY - dragStartPlan.y
    }));
  };

  const handleMouseUpPlan = () => {
    setIsDraggingPlan(false);
  };

  // Pan Mouse Handlers - Frame View
  const handleMouseDownFrame = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (e.button !== 0) return;
    setIsDraggingFrame(true);
    setDragStartFrame({ x: e.clientX - zoomFrame.x, y: e.clientY - zoomFrame.y });
  };

  const handleMouseMoveFrame = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!isDraggingFrame) return;
    setZoomFrame(prev => ({
      ...prev,
      x: e.clientX - dragStartFrame.x,
      y: e.clientY - dragStartFrame.y
    }));
  };

  const handleMouseUpFrame = () => {
    setIsDraggingFrame(false);
  };

  // Touch Handlers for Mobile Devices
  const handleTouchStartPlan = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 1) {
      setIsDraggingPlan(true);
      setDragStartPlan({ 
        x: e.touches[0].clientX - zoomPlan.x, 
        y: e.touches[0].clientY - zoomPlan.y 
      });
    }
  };

  const handleTouchMovePlan = (e: React.TouchEvent<SVGSVGElement>) => {
    if (!isDraggingPlan || e.touches.length !== 1) return;
    setZoomPlan(prev => ({
      ...prev,
      x: e.touches[0].clientX - dragStartPlan.x,
      y: e.touches[0].clientY - dragStartPlan.y
    }));
  };

  const handleTouchStartFrame = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 1) {
      setIsDraggingFrame(true);
      setDragStartFrame({ 
        x: e.touches[0].clientX - zoomFrame.x, 
        y: e.touches[0].clientY - zoomFrame.y 
      });
    }
  };

  const handleTouchMoveFrame = (e: React.TouchEvent<SVGSVGElement>) => {
    if (!isDraggingFrame || e.touches.length !== 1) return;
    setZoomFrame(prev => ({
      ...prev,
      x: e.touches[0].clientX - dragStartFrame.x,
      y: e.touches[0].clientY - dragStartFrame.y
    }));
  };
  
  // Calculate horizontal grid coordinates
  const totalLength = geometry.spanLengths.reduce((a, b) => a + b, 0);
  const totalHeight = geometry.storeyHeights.reduce((a, b) => a + b, 0);

  // 1:1 Proportional Vertical Elevation Scaling
  // We find a uniform scale factor so both vertical heights and horizontal lengths fit in the viewport
  const maxScaleX = totalLength > 0 ? (width - 2 * paddingX) / totalLength : 40;
  const maxScaleY = totalHeight > 0 ? (heightFrame - 150) / totalHeight : 45;
  const unifiedScale = Math.max(12, Math.min(45, maxScaleX, maxScaleY));

  // Determine starting X to keep the structural frame perfectly centered inside the drawing area
  const startX = totalLength > 0 ? (width - totalLength * unifiedScale) / 2 : paddingX;

  const getGridX = (gridIdx: number): number => {
    let currentLen = 0;
    for (let i = 0; i < gridIdx; i++) {
      currentLen += geometry.spanLengths[i] || 0;
    }
    return startX + currentLen * unifiedScale;
  };

  const scaleFactor = unifiedScale;

  const getLevelY = (levelIdx: number): number => {
    // Level 0 (Foundation) is at the bottom, Level {numLevels} is at the top.
    // Scales 1:1 proportionally with the horizontal layouts.
    let currentHeight = 0;
    for (let i = 0; i < levelIdx; i++) {
      currentHeight += geometry.storeyHeights[i] || 0;
    }
    const yBase = heightFrame - 75; // ground baseline anchor
    return yBase - currentHeight * unifiedScale;
  };

  return (
    <div className="space-y-6">
      
      {/* DRAWING 1: STRUCTURAL PLAN VIEW */}
      {(viewMode === 'plan' || viewMode === 'both') && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <div>
            <span className="text-xs font-bold text-sky-600 tracking-wider uppercase">Drawing 1</span>
            <h3 className="font-bold text-slate-800 text-base">Structural Plan View (Selected Strip Zone)</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-lg p-0.5 shadow-2xs font-sans">
              <button 
                onClick={handleZoomInPlan}
                className="p-1 hover:bg-white rounded text-slate-700 hover:text-sky-600 transition-colors" 
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={handleZoomOutPlan}
                className="p-1 hover:bg-white rounded text-slate-700 hover:text-sky-600 transition-colors" 
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={handleResetPlan}
                className="p-1 hover:bg-white rounded text-slate-700 hover:text-sky-600 transition-colors" 
                title="Reset View"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
              <span className="text-[10px] font-mono px-1.5 text-slate-500 font-bold">{Math.round(zoomPlan.scale * 100)}%</span>
            </div>
            <div className="text-xs text-slate-400 font-sans italic flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-slate-300" />
              Drag drawing to Pan
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <svg 
            viewBox={`0 0 ${width} ${heightPlan}`} 
            onMouseDown={handleMouseDownPlan}
            onMouseMove={handleMouseMovePlan}
            onMouseUp={handleMouseUpPlan}
            onMouseLeave={handleMouseUpPlan}
            onTouchStart={handleTouchStartPlan}
            onTouchMove={handleTouchMovePlan}
            onTouchEnd={handleMouseUpPlan}
            style={{ cursor: isDraggingPlan ? 'grabbing' : 'grab' }}
            className="w-full h-auto bg-slate-50 rounded-lg select-none border border-slate-100 min-w-[650px]"
          >
            <g transform={`translate(${zoomPlan.x}, ${zoomPlan.y}) scale(${zoomPlan.scale})`}>
            {/* Grid references */}
            {Array.from({ length: numGrids }).map((_, gIdx) => {
              const x = getGridX(gIdx);
              return (
                <g key={`grid-v-${gIdx}`}>
                  {/* Grid bubble label at bottom of plan */}
                  <line x1={x} y1={25} x2={x} y2={390} stroke="#cbd5e1" strokeWidth={0.75} strokeDasharray="4 4" />
                  <circle cx={x} cy={395} r={10} fill="#f1f5f9" stroke="#94a3b8" strokeWidth={1} />
                  <text x={x} y={399} textAnchor="middle" fontSize={10} fontWeight="bold" fill="#64748b">
                    {geometry.gridLabels[gIdx]}
                  </text>
                </g>
              );
            })}

            {/* Scale indicator above */}
            <text x={paddingX} y={22} fontSize={10} fill="#94a3b8" fontWeight="500">
              Total Strip Length = {roundTo(totalLength, 2)}m | Trib Width: Above={geometry.tribWidthAbove}m, Below={geometry.tribWidthBelow}m
            </text>

            {/* Draw Slab Support nodes label on top and bottom boundary */}
            {Array.from({ length: numGrids }).map((_, gIdx) => {
              const x = getGridX(gIdx);
              // Above point S_top
              const yAbove = 210 - geometry.tribWidthAbove * scaleFactor;
              // Below point S_bottom
              const yBelow = 210 + geometry.tribWidthBelow * scaleFactor;

              return (
                <g key={`slab-nodes-${gIdx}`}>
                  {/* Nodes circles */}
                  <circle cx={x} cy={yAbove} r={4} fill="#475569" />
                  <circle cx={x} cy={yBelow} r={4} fill="#475569" />
                  
                  {/* SLabels - Positioned safely based on geometry to prevent any overlapping */}
                  <text x={x} y={yAbove - 8} textAnchor="middle" fontSize={9} fill="#475569" fontWeight="700">
                    S{gIdx * 2 + 1}
                  </text>
                  <text x={x} y={yBelow + 13} textAnchor="middle" fontSize={9} fill="#475569" fontWeight="700">
                    S{gIdx * 2 + 2}
                  </text>
                </g>
              );
            })}

            {/* DRAW TRIBUTARY AREA POLYGONS (45 DEGREES SHADED AREA) */}
            {geometry.spanLengths.map((L, sIdx) => {
              const xLeft = getGridX(sIdx);
              const xRight = getGridX(sIdx + 1);
              const centerY = 210;

              const H_above = geometry.tribWidthAbove;
              const H_below = geometry.tribWidthBelow;

              // Top Shape Polygons Points
              let topPoints = '';
              const limitAbove = L / 2;
              if (slabType === 'one-way-x') {
                // simple rectangle
                topPoints = `${xLeft},${centerY} ${xLeft},${centerY - H_above * scaleFactor} ${xRight},${centerY - H_above * scaleFactor} ${xRight},${centerY}`;
              } else if (slabType === 'one-way-y') {
                topPoints = ''; // empty
              } else {
                // Two-way actions (Trapezoidal or Triangular)
                if (L >= 2 * H_above) {
                  // Trapezoid: 45 angle peaks at H width, flat along center
                  const xPeakLeft = xLeft + H_above * scaleFactor;
                  const xPeakRight = xRight - H_above * scaleFactor;
                  topPoints = `${xLeft},${centerY} ${xPeakLeft},${centerY - H_above * scaleFactor} ${xPeakRight},${centerY - H_above * scaleFactor} ${xRight},${centerY}`;
                } else {
                  // Triangle: peak meets at L/2 center with height L/2
                  const xPeak = xLeft + (L / 2) * scaleFactor;
                  topPoints = `${xLeft},${centerY} ${xPeak},${centerY - limitAbove * scaleFactor} ${xRight},${centerY}`;
                }
              }

              // Bottom Shape Polygons Points
              let bottomPoints = '';
              const limitBelow = L / 2;
              if (slabType === 'one-way-x') {
                bottomPoints = `${xRight},${centerY} ${xRight},${centerY + H_below * scaleFactor} ${xLeft},${centerY + H_below * scaleFactor} ${xLeft},${centerY}`;
              } else if (slabType === 'one-way-y') {
                bottomPoints = '';
              } else {
                if (L >= 2 * H_below) {
                  const xPeakLeft = xLeft + H_below * scaleFactor;
                  const xPeakRight = xRight - H_below * scaleFactor;
                  bottomPoints = `${xRight},${centerY} ${xPeakRight},${centerY + H_below * scaleFactor} ${xPeakLeft},${centerY + H_below * scaleFactor} ${xLeft},${centerY}`;
                } else {
                  const xPeak = xLeft + (L / 2) * scaleFactor;
                  bottomPoints = `${xRight},${centerY} ${xPeak},${centerY + limitBelow * scaleFactor} ${xLeft},${centerY}`;
                }
              }

              return (
                <g key={`t_poly-${sIdx}`}>
                  {/* Shaded Top Area */}
                  {topPoints && (
                    <polygon 
                      points={topPoints} 
                      fill="url(#tribPatternAbove)" 
                      fillOpacity={0.65} 
                      stroke="#38bdf8" 
                      strokeWidth={1} 
                      strokeDasharray="2 2"
                    />
                  )}
                  {/* Shaded Bottom Area */}
                  {bottomPoints && (
                    <polygon 
                      points={bottomPoints} 
                      fill="url(#tribPatternBelow)" 
                      fillOpacity={0.65} 
                      stroke="#ea580c" 
                      strokeWidth={1} 
                      strokeDasharray="2 2"
                    />
                  )}

                  {/* Dimension marker line above span - moved significantly higher up to y=35 directly avoiding overlaps */}
                  <line x1={xLeft} y1={35} x2={xRight} y2={35} stroke="#64748b" strokeWidth={1} />
                  <line x1={xLeft} y1={30} x2={xLeft} y2={40} stroke="#64748b" strokeWidth={1} />
                  <line x1={xRight} y1={30} x2={xRight} y2={40} stroke="#64748b" strokeWidth={1} />
                  <text x={(xLeft + xRight) / 2} y={26} textAnchor="middle" fontSize={10} fill="#475569" fontWeight="bold">
                    L{sIdx + 1} = {roundTo(L, 2)}m
                  </text>
                </g>
              );
            })}

            {/* HEIGHT TRIBUTARY DIMENSION MARKERS (LEFT) */}
            <g key="trib-dimensions">
              <line x1={paddingX - 40} y1={210} x2={paddingX - 40} y2={210 - geometry.tribWidthAbove * scaleFactor} stroke="#0284c7" strokeWidth={1.2} />
              <line x1={paddingX - 40} y1={210} x2={paddingX - 40} y2={210 + geometry.tribWidthBelow * scaleFactor} stroke="#ea580c" strokeWidth={1.2} />
              {/* ticks */}
              <line x1={paddingX - 45} y1={210} x2={paddingX - 35} y2={210} stroke="#475569" strokeWidth={1} />
              <line x1={paddingX - 45} y1={210 - geometry.tribWidthAbove * scaleFactor} x2={paddingX - 35} y2={210 - geometry.tribWidthAbove * scaleFactor} stroke="#0284c7" strokeWidth={1} />
              <line x1={paddingX - 45} y1={210 + geometry.tribWidthBelow * scaleFactor} x2={paddingX - 35} y2={210 + geometry.tribWidthBelow * scaleFactor} stroke="#ea580c" strokeWidth={1} />
              {/* text */}
              <text x={paddingX - 48} y={210 - (geometry.tribWidthAbove * scaleFactor) / 2 + 4} textAnchor="end" fontSize={10} fill="#0284c7" fontWeight="bold">
                H2 = {roundTo(geometry.tribWidthAbove, 2)}m
              </text>
              <text x={paddingX - 48} y={210 + (geometry.tribWidthBelow * scaleFactor) / 2 + 4} textAnchor="end" fontSize={10} fill="#ea580c" fontWeight="bold">
                H1 = {roundTo(geometry.tribWidthBelow, 2)}m
              </text>
            </g>

            {/* BOLD HIGHLIGHTED RECTANGLE SHOWING STRUCTURAL FRAMING AREA OVERLAY */}
            <rect 
              x={paddingX - 15} 
              y={185} 
              width={width - 2 * paddingX + 30} 
              height={50} 
              fill="#000000" 
              fillOpacity={0.07} 
              stroke="#0f172a" 
              strokeWidth={2} 
              rx={4}
            />
            <text x={paddingX - 10} y={178} fontSize={10} fill="#0f172a" fontWeight="800" letterSpacing="0.05em">
              STRUCTURAL FRAMING AREA (DESIGN STRIP STRAP)
            </text>

            {/* Draw Columns on the plan view */}
            {Array.from({ length: numGrids }).map((_, gIdx) => {
              const x = getGridX(gIdx);
              const label = `C${gIdx + 1}`;
              const isSelected = activeColId?.includes(`Grid-${gIdx}`);

              return (
                <g 
                  key={`plan-col-${gIdx}`}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isDeleteModeActive) {
                      if (onDeleteColumnOverrides) {
                        for (let lvl = 1; lvl <= numLevels; lvl++) {
                          onDeleteColumnOverrides(lvl, gIdx);
                        }
                        alert(`Cleared column parameters & size overrides for Column Line Grid ${geometry.gridLabels[gIdx]} across all levels.`);
                      }
                    } else {
                      onSelectCol(`Grid-${gIdx}`);
                    }
                  }}
                >
                  <rect 
                    x={x - 10} 
                    y={200} 
                    width={20} 
                    height={20} 
                    fill={isSelected ? '#3b82f6' : (isDeleteModeActive ? '#fda4af' : '#334155')} 
                    stroke={isDeleteModeActive ? '#e11d48' : '#1e293b'} 
                    strokeWidth={1.5}
                    className="hover:fill-rose-500 transition-colors duration-150" 
                  />
                  <text x={x} y={194} textAnchor="middle" fontSize={9} fill={isDeleteModeActive ? '#e11d48' : '#1e293b'} fontWeight="bold">
                    {label}
                  </text>
                </g>
              );
            })}

            {/* Draw Beams on the plan view */}
            {geometry.spanLengths.map((L, sIdx) => {
              const xLeft = getGridX(sIdx);
              const xRight = getGridX(sIdx + 1);
              const label = `BM${String.fromCharCode(97 + sIdx)}`;
              
              // Highlight beam span if active
              const isBeamSelected = activeBeamId?.includes(`Span-${sIdx}`);

              // Calculate dynamic centered positions for "TRIBUTARY AREA" labels inside shaded boundaries to prevent ALL overlapping with lines, arrows or dimensions
              const yTextTop = 210 - (geometry.tribWidthAbove * scaleFactor) / 2;
              const yTextBottom = 210 + (geometry.tribWidthBelow * scaleFactor) / 2;

              return (
                <g 
                  key={`plan-beam-${sIdx}`}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isDeleteModeActive) {
                      if (onDeleteBeamOverrides) {
                        for (let lvl = 1; lvl <= numLevels; lvl++) {
                          onDeleteBeamOverrides(lvl, sIdx);
                        }
                        alert(`Cleared structural sizing and dynamic loads overrides for Span BM${String.fromCharCode(97 + sIdx)} across all levels.`);
                      }
                    } else {
                      onSelectBeam(`Span-${sIdx}`);
                    }
                  }}
                >
                  {/* Thick horizontal line representing beam */}
                  <line 
                    x1={xLeft + 10} 
                    y1={210} 
                    x2={xRight - 10} 
                    y2={210} 
                    stroke={isBeamSelected ? '#3b82f6' : (isDeleteModeActive ? '#ef4444' : '#1e293b')} 
                    strokeWidth={isDeleteModeActive ? 6 : 5} 
                    className="hover:stroke-rose-600 transition-colors duration-150"
                  />
                  
                  {/* Distributable distributed arrows inside strip represent loading direction */}
                  <path 
                    d={`M ${(xLeft+xRight)/2 - 15} 210 l 4 -4 m -4 4 l 4 4 m -4 -4 l 30 0 m -4 -4 l 4 4 m -4 4 l 4 -4`} 
                    stroke="#ffffff" 
                    strokeWidth={1} 
                    fill="none" 
                  />

                  <text x={(xLeft + xRight) / 2} y={225} textAnchor="middle" fontSize={9} fill={isDeleteModeActive ? '#e11d48' : '#000000'} fontWeight="bold">
                    {label}
                  </text>

                  {/* "TRIBUTARY AREA" Lightly printed label inside shaded shapes - positioned dynamically to avoid overlapping! */}
                  {geometry.tribWidthAbove > 0 && (
                    <text x={(xLeft+xRight)/2} y={yTextTop} textAnchor="middle" fontSize={8} fill="#0284c7" fontWeight="extrabold" opacity={0.8} letterSpacing="0.05em">
                      {slabType === 'two-way' ? 'TRIB AREA (TWO-WAY)' : 'TRIB AREA (ONE-WAY)'}
                    </text>
                  )}
                  {geometry.tribWidthBelow > 0 && (
                    <text x={(xLeft+xRight)/2} y={yTextBottom} textAnchor="middle" fontSize={8} fill="#ea580c" fontWeight="extrabold" opacity={0.8} letterSpacing="0.05em">
                      {slabType === 'two-way' ? 'TRIB AREA (TWO-WAY)' : 'TRIB AREA (ONE-WAY)'}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Point load indicators marker overlays on Plan view */}
            {pointLoads.filter(p => p.active).map((pl, pIdx) => {
              const xLeft = getGridX(pl.beamIndex);
              const L = geometry.spanLengths[pl.beamIndex] || 6.0;
              const ratio = L > 0 ? pl.distance / L : 0.5;
              const xPos = xLeft + ratio * (getGridX(pl.beamIndex + 1) - xLeft);

              return (
                <g 
                  key={`pl-planar-${pIdx}`} 
                  className="cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isDeleteModeActive && onDeletePointLoad) {
                      onDeletePointLoad(pl.id);
                    }
                  }}
                >
                  {isDeleteModeActive && (
                    <circle cx={xPos} cy={210} r={12} fill="#ef4444" fillOpacity={0.25} className="animate-ping" />
                  )}
                  <circle cx={xPos} cy={210} r={6} fill={isDeleteModeActive ? '#f43f5e' : '#ef4444'} stroke="#ffffff" strokeWidth={1} className="group-hover:scale-125 transition-transform" />
                  <line x1={xPos} y1={210} x2={xPos - 5} y2={190} stroke={isDeleteModeActive ? '#f43f5e' : '#ef4444'} strokeWidth={1.5} />
                  <line x1={xPos} y1={210} x2={xPos + 5} y2={190} stroke={isDeleteModeActive ? '#f43f5e' : '#ef4444'} strokeWidth={1.5} />
                  <text x={xPos} y={182} textAnchor="middle" fontSize={9} fill={isDeleteModeActive ? '#e11d48' : '#ef4444'} fontWeight="extrabold">
                    {isDeleteModeActive ? '❌' : `P=${pl.magnitude}kN`}
                  </text>
                </g>
              );
            })}

            {/* Definitions / SVG patterns */}
            <defs>
              <pattern id="tribPatternAbove" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="10" stroke="#bae6fd" strokeWidth="2" />
              </pattern>
              <pattern id="tribPatternBelow" width="10" height="10" patternTransform="rotate(-45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="10" stroke="#fecdd3" strokeWidth="2" />
              </pattern>
            </defs>
          </g>
        </svg>
      </div>
      </div>
      )}

      {/* DRAWING 2: FRAME ELEVATION DIAGRAM */}
      {(viewMode === 'framing' || viewMode === 'both') && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <div>
            <span className="text-xs font-bold text-violet-600 tracking-wider uppercase">Drawing 2</span>
            <h3 className="font-bold text-slate-800 text-base">Structural Framing Elevation Diagram (Column Lines & Levelling)</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-lg p-0.5 shadow-2xs font-sans">
              <button 
                onClick={handleZoomInFrame}
                className="p-1 hover:bg-white rounded text-slate-700 hover:text-sky-600 transition-colors" 
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={handleZoomOutFrame}
                className="p-1 hover:bg-white rounded text-slate-700 hover:text-sky-600 transition-colors" 
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={handleResetFrame}
                className="p-1 hover:bg-white rounded text-slate-700 hover:text-sky-600 transition-colors" 
                title="Reset View"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
              <span className="text-[10px] font-mono px-1.5 text-slate-500 font-bold">{Math.round(zoomFrame.scale * 100)}%</span>
            </div>
            <div className="text-xs text-slate-400 font-sans italic flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-slate-300" />
              Drag drawing to Pan
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <svg 
            viewBox={`0 0 ${width} ${heightFrame}`} 
            onMouseDown={handleMouseDownFrame}
            onMouseMove={handleMouseMoveFrame}
            onMouseUp={handleMouseUpFrame}
            onMouseLeave={handleMouseUpFrame}
            onTouchStart={handleTouchStartFrame}
            onTouchMove={handleTouchMoveFrame}
            onTouchEnd={handleMouseUpFrame}
            style={{ cursor: isDraggingFrame ? 'grabbing' : 'grab' }}
            className="w-full h-auto bg-slate-50 rounded-lg select-none border border-slate-100 min-w-[650px]"
          >
            <g transform={`translate(${zoomFrame.x}, ${zoomFrame.y}) scale(${zoomFrame.scale})`}>
            {/* Grid references vertical dashed lines and upper bubbles */}
            {Array.from({ length: numGrids }).map((_, gIdx) => {
              const x = getGridX(gIdx);
              const yTop = getLevelY(geometry.numLevels);
              const yBottom = getLevelY(0);
              return (
                <g key={`grid-elev-v-${gIdx}`}>
                  <line x1={x} y1={yTop - 20} x2={x} y2={yBottom + 10} stroke="#e2e8f0" strokeWidth={1} strokeDasharray="6 4" />
                  <circle cx={x} cy={yTop - 35} r={9} fill="#f8fafc" stroke="#64748b" strokeWidth={1} />
                  <text x={x} y={yTop - 32} textAnchor="middle" fontSize={9} fontWeight="bold" fill="#475569">
                    {geometry.gridLabels[gIdx]}
                  </text>
                </g>
              );
            })}

            {/* Span reference lines top */}
            {geometry.spanLengths.map((L, sIdx) => {
              const xLeft = getGridX(sIdx);
              const xRight = getGridX(sIdx + 1);
              const yTopOffset = getLevelY(geometry.numLevels) - 55;
              return (
                <g key={`elev-span-dim-${sIdx}`}>
                  <line x1={xLeft} y1={yTopOffset + 3} x2={xRight} y2={yTopOffset + 3} stroke="#94a3b8" strokeWidth={0.75} />
                  <text x={(xLeft + xRight) / 2} y={yTopOffset + 13} textAnchor="middle" fontSize={8} fill="#64748b" fontWeight="600">
                    L{sIdx + 1} = {roundTo(L, 2)}m
                  </text>
                </g>
              );
            })}

            {/* Support bases icons ground indicators at Level-0 */}
            {Array.from({ length: numGrids }).map((_, gIdx) => {
              const x = getGridX(gIdx);
              const yBase = getLevelY(0);

              return (
                <g key={`support-pinned-${gIdx}`}>
                  {/* Pin support triangle symbol */}
                  <polygon points={`${x},${yBase} ${x - 8},${yBase + 12} ${x + 8},${yBase + 12}`} fill="#475569" stroke="#334155" strokeWidth={1} />
                  {/* Hatch base */}
                  <line x1={x - 12} y1={yBase + 12} x2={x + 12} y2={yBase + 12} stroke="#131d2a" strokeWidth={1.5} />
                  <line x1={x - 10} y1={yBase + 12} x2={x - 14} y2={yBase + 17} stroke="#334155" strokeWidth={1} />
                  <line x1={x - 5} y1={yBase + 12} x2={x - 9} y2={yBase + 17} stroke="#334155" strokeWidth={1} />
                  <line x1={x} y1={yBase + 12} x2={x - 4} y2={yBase + 17} stroke="#334155" strokeWidth={1} />
                  <line x1={x + 5} y1={yBase + 12} x2={x + 1} y2={yBase + 17} stroke="#334155" strokeWidth={1} />
                  <line x1={x + 10} y1={yBase + 12} x2={x + 6} y2={yBase + 17} stroke="#334155" strokeWidth={1} />
                </g>
              );
            })}

            {/* LEVEL LABELS AT RIGHT BOUND - MOVED TO THE RIGHT MARGIN TO COMPLETELY PREVENT OVERLAPPING WITH WIND & SEISMIC LOAD ARROWS ON THE LEFT! */}
            {Array.from({ length: numLevels + 1 }).map((_, lIdx) => {
              const y = getLevelY(lIdx);
              const label = geometry.levelNames[lIdx] || `Level-${lIdx}`;
              
              // Find elevation
              const storeyElevations = getLevelElevations(geometry);
              const elevVal = storeyElevations[lIdx] ?? 0;

              return (
                <g key={`level-r-${lIdx}`}>
                  {/* Thin level lines spanning from left columns to the right boundary bubbles */}
                  <line x1={paddingX - 10} y1={y} x2={width - paddingX + 10} y2={y} stroke="#cbd5e1" strokeWidth={0.5} strokeDasharray={lIdx === 0 ? "none" : "3 3"} />
                  
                  {/* Label bubble/tag on Right Side */}
                  <rect x={width - paddingX + 10} y={y - 10} width={80} height={18} rx={3} fill="#f1f5f9" stroke="#94a3b8" strokeWidth={0.75} />
                  <text x={width - paddingX + 16} y={y + 2} fontSize={8} fontWeight="bold" fill="#334155">
                    {label}
                  </text>
                  <text x={width - paddingX + 76} y={y + 2} textAnchor="end" fontSize={7.5} fontWeight="bold" fill="#0284c7">
                    +{roundTo(elevVal, 2)}m
                  </text>
                </g>
              );
            })}

            {/* DRAW HORIZONTAL BEAMS & VERTICAL COLUMNS IN FRAME LINE */}
            {/* Draw Columns */}
            {Array.from({ length: numLevels }).map((_, lIdx) => {
              const storeyIndex = lIdx + 1; // 1 to numLevels
              const yTop = getLevelY(storeyIndex);
              const yBottom = getLevelY(storeyIndex - 1);

              return (
                <g key={`frame-columns-storey-${storeyIndex}`}>
                  {Array.from({ length: numGrids }).map((_, gIdx) => {
                    const x = getGridX(gIdx);
                    const colId = `C${storeyIndex}-${gIdx}`;
                    const isSelected = activeColId === colId;
                    
                    // Column label e.g., C1a
                    const label = `C${storeyIndex}${String.fromCharCode(97 + gIdx)}`;

                    return (
                      <g 
                        key={`col-line-${colId}`}
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isDeleteModeActive) {
                            if (onDeleteColumnOverrides) {
                              onDeleteColumnOverrides(storeyIndex, gIdx);
                              alert(`Cleared spacing & size overrides for Column ${label} at Storey ${storeyIndex}.`);
                            }
                          } else {
                            onSelectCol(colId);
                          }
                        }}
                      >
                        {/* Column body drawn as double matching rectangle borders or thick line representation */}
                        <line 
                          x1={x} 
                          y1={yBottom} 
                          x2={x} 
                          y2={yTop} 
                          stroke={isSelected ? '#2563eb' : (isDeleteModeActive ? '#f43f5e' : '#475569')} 
                          strokeWidth={isSelected ? 6 : (isDeleteModeActive ? 4.5 : 3.5)} 
                          className="hover:stroke-rose-500 transition-colors"
                        />
                        
                        {/* Text labels beside column */}
                        <text x={x + 7} y={(yTop + yBottom)/2 + 3} fontSize={8} fill={isSelected ? '#2563eb' : (isDeleteModeActive ? '#e11d48' : '#64748b')} fontWeight={isSelected || isDeleteModeActive ? 'bold' : 'normal'}>
                          {label}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })}

            {/* Draw Beams */}
            {Array.from({ length: numLevels }).map((_, lIdx) => {
              const levelIndex = lIdx + 1; // 1 to numLevels
              const y = getLevelY(levelIndex);

              return (
                <g key={`frame-beams-level-${levelIndex}`}>
                  {geometry.spanLengths.map((L, sIdx) => {
                    const xLeft = getGridX(sIdx);
                    const xRight = getGridX(sIdx + 1);
                    const beamId = `B${levelIndex}-${sIdx}`;
                    
                    const isSelected = activeBeamId === beamId;
                    
                    // Beam label e.g., B1a
                    const label = `B${levelIndex}${String.fromCharCode(97 + sIdx)}`;

                    // Distributed Load downward visual arrows representation
                    const arrowSpacing = 20;
                    const numArrows = Math.ceil((xRight - xLeft) / arrowSpacing);

                    return (
                      <g 
                        key={`beam-segment-${beamId}`}
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isDeleteModeActive) {
                            if (onDeleteBeamOverrides) {
                              onDeleteBeamOverrides(levelIndex, sIdx);
                              alert(`Cleared structural sizing and dynamic loads overrides for Beam ${label} at Level ${levelIndex}.`);
                            }
                          } else {
                            onSelectBeam(beamId);
                          }
                        }}
                      >
                        {/* Thick horizontal beam line */}
                        <line 
                          x1={xLeft} 
                          y1={y} 
                          x2={xRight} 
                          y2={y} 
                          stroke={isSelected ? '#1d4ed8' : (isDeleteModeActive ? '#ef4444' : '#1e293b')} 
                          strokeWidth={isSelected ? 5 : (isDeleteModeActive ? 4.5 : 3)} 
                          className="hover:stroke-rose-600 transition-colors"
                        />

                        {/* Arrows depicting distributed loading if gravity load is computed */}
                        {Array.from({ length: numArrows }).map((_, arrowIdx) => {
                          const arrowX = xLeft + 10 + arrowIdx * arrowSpacing;
                          if (arrowX < xRight - 5) {
                            return (
                              <g key={`arrow-${beamId}-${arrowIdx}`} opacity={0.6} className="pointer-events-none">
                                <line x1={arrowX} y1={y - 12} x2={arrowX} y2={y - 2} stroke="#0ea5e9" strokeWidth={0.75} />
                                <polygon points={`${arrowX},${y-2} ${arrowX-2.5},${y-6} ${arrowX+2.5},${y-6}`} fill="#0ea5e9" />
                              </g>
                            );
                          }
                          return null;
                        })}

                        {/* Top horizontal distributed line */}
                        <line x1={xLeft} y1={y - 12} x2={xRight} y2={y - 12} stroke="#38bdf8" strokeWidth={0.5} opacity={0.6} strokeDasharray="2 1" />

                        {/* Label */}
                        <text x={(xLeft + xRight) / 2} y={y + 11} textAnchor="middle" fontSize={8} fill={isSelected ? '#1d4ed8' : (isDeleteModeActive ? '#e11d48' : '#334155')} fontWeight="bold">
                          {label}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })}

            {/* LATERAL FORCES (WIND & SEISMIC ARROWS) ON DIAHPRAGMS */}
            {Array.from({ length: numLevels }).map((_, lIdx) => {
              const levelIndex = lIdx + 1;
              const y = getLevelY(levelIndex);

              // Get wind share and seismic force if calculated
              const windL = windForces?.levelWindForces?.find((wl: any) => wl.levelIndex === levelIndex);
              const seisL = seismicForces?.levelForces?.find((sl: any) => sl.levelIndex === levelIndex);

              const windF = windL ? windL.F_frame : 0;
              const seisF = seisL ? seisL.F_level : 0;

              return (
                <g key={`lateral-indicators-${levelIndex}`}>
                  {/* Wind Arrow from left side */}
                  {windF > 0 && (
                    <g opacity={1}>
                      <line x1={paddingX - 45} y1={y} x2={paddingX - 5} y2={y} stroke="#0284c7" strokeWidth={2} />
                      <polygon points={`${paddingX - 5},${y} ${paddingX - 12},${y-4} ${paddingX - 12},${y+4}`} fill="#0284c7" />
                      <text x={paddingX - 50} y={y + 3} textAnchor="end" fontSize={8} fontWeight="bold" fill="#0284c7">
                        {roundTo(windF, 1)}kN (WL)
                      </text>
                    </g>
                  )}

                  {/* Earthquake Arrow from left side (offset slightly below wind) */}
                  {seisF > 0 && (
                    <g opacity={1}>
                      <line x1={paddingX - 40} y1={y + 8} x2={paddingX - 5} y2={y + 8} stroke="#e11d48" strokeWidth={1.5} />
                      <polygon points={`${paddingX - 5},${y+8} ${paddingX - 10},${y+5} ${paddingX - 10},${y+11}`} fill="#e11d48" />
                      <text x={paddingX - 44} y={y + 11} textAnchor="end" fontSize={8} fontWeight="bold" fill="#e11d48">
                        {roundTo(seisF, 1)}kN (EQ)
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Draw Point Loads red arrows on Framingelevation where defined */}
            {pointLoads.filter(p => p.active).map((pl, pIdx) => {
              const y = getLevelY(pl.levelIndex);
              const xLeft = getGridX(pl.beamIndex);
              const L = geometry.spanLengths[pl.beamIndex] || 6.0;
              const ratio = L > 0 ? pl.distance / L : 0.5;
              const xPos = xLeft + ratio * (getGridX(pl.beamIndex + 1) - xLeft);

              return (
                <g 
                  key={`pl-elev-arrow-${pIdx}`} 
                  className="cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isDeleteModeActive && onDeletePointLoad) {
                      onDeletePointLoad(pl.id);
                    }
                  }}
                >
                  {isDeleteModeActive && (
                    <circle cx={xPos} cy={y - 12} r={12} fill="#ef4444" fillOpacity={0.25} className="animate-ping" />
                  )}
                  {/* Vertical bold point load arrow */}
                  <line x1={xPos} y1={y - 35} x2={xPos} y2={y - 3} stroke={isDeleteModeActive ? '#f43f5e' : '#ef4444'} strokeWidth={3} />
                  <polygon points={`${xPos},${y-3} ${xPos-4},${y-11} ${xPos+4},${y-11}`} fill={isDeleteModeActive ? '#f43f5e' : '#ef4444'} />
                  
                  <rect x={xPos - 30} y={y - 50} width={60} height={14} rx={2} fill={isDeleteModeActive ? '#ffe4e6' : '#fee2e2'} stroke={isDeleteModeActive ? '#f43f5e' : '#ef4444'} strokeWidth={0.75} />
                  <text x={xPos} y={y - 40} textAnchor="middle" fontSize={8} fill={isDeleteModeActive ? '#e11d48' : '#ef4444'} fontWeight="extrabold">
                    {isDeleteModeActive ? '❌' : `P = ${pl.magnitude}kN`}
                  </text>
                </g>
              );
            })}

            </g>
          </svg>
        </div>
      </div>
      )}

    </div>
  );
}
