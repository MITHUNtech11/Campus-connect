import { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { cn } from '../lib/utils';

export default function MapHeatmap() {
  const [mapData, setMapData] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch('/api/map')
      .then(res => res.json())
      .then(data => setMapData(data));
  }, []);

  const getHeatColor = (count: number) => {
    if (count >= 5) return 'bg-red-500 shadow-red-500/50';
    if (count >= 2) return 'bg-amber-500 shadow-amber-500/50';
    if (count > 0) return 'bg-emerald-500 shadow-emerald-500/50';
    return 'bg-slate-200';
  };

  const getIntensityLevel = (count: number) => {
    if (count >= 5) return 'High';
    if (count >= 2) return 'Medium';
    if (count > 0) return 'Low';
    return 'Empty';
  };

  const blocks = [
    { id: 'Block A', x: 20, y: 20, width: 200, height: 150 },
    { id: 'Block B', x: 250, y: 50, width: 180, height: 220 },
    { id: 'Block C', x: 50, y: 220, width: 160, height: 160 },
    { id: 'Library', x: 480, y: 100, width: 200, height: 200 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Live Campus Heatmap</h1>
          <p className="text-slate-500 mt-1">Real-time view of mentor availability across campus blocks.</p>
        </div>

        {/* Legend */}
        <div className="flex gap-6 mb-8 text-sm text-slate-600">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div> High Activity (5+)</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500"></div> Medium Activity (2-4)</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Low Activity (1)</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-200"></div> Empty</div>
        </div>

        {/* Simulated Map Canvas */}
        <div className="relative w-full h-[500px] bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden pattern-dots pattern-slate-200 pattern-bg-transparent pattern-size-4">
          {blocks.map(block => {
            const count = mapData[block.id] || 0;
            return (
              <div 
                key={block.id}
                className="absolute border-2 border-slate-300 rounded-xl bg-white/80 backdrop-blur-sm transition-all hover:border-indigo-400 cursor-pointer flex flex-col items-center justify-center p-4 shadow-sm"
                style={{
                  left: block.x,
                  top: block.y,
                  width: block.width,
                  height: block.height,
                }}
              >
                <div className={cn("w-6 h-6 rounded-full shadow-lg mb-2 flex items-center justify-center", getHeatColor(count))}>
                  <MapPin className={cn("w-3 h-3", count > 0 ? "text-white" : "text-slate-400")} />
                </div>
                <h3 className="font-bold text-slate-800">{block.id}</h3>
                <p className="text-xs text-slate-500 mt-1">{count} Mentors • {getIntensityLevel(count)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
