import React, { useState } from 'react';
import { 
  Target, TrendingUp, ChevronDown, 
  Zap, Wind, Droplets, Trash2, Recycle 
} from 'lucide-react';

// ============================================================
// PROPS
// ============================================================
interface BaselineTargetEvaluationProps {
  activeSubModule: string;
  selectedUnit: string;
  unitFullName: string;
  selectedYear: string;
  userRole: string;
}

// ============================================================
// CONSTANTS
// ============================================================
const TOPICS = [
  { id: 'energy', label: 'Energy', icon: Zap },
  { id: 'ghg', label: 'GHG', icon: Wind },
  { id: 'water', label: 'Water', icon: Droplets },
  { id: 'wastewater', label: 'Wastewater', icon: Droplets },
  { id: 'waste', label: 'Waste', icon: Trash2 },
  { id: 'waste_disposal', label: 'Waste Disposal Method', icon: Recycle },
];

// ============================================================
// COMPONENT
// ============================================================
const BaselineTargetEvaluation: React.FC<BaselineTargetEvaluationProps> = ({ 
  activeSubModule, 
  selectedUnit, 
  unitFullName, 
  selectedYear, 
  userRole 
}) => {
  const [selectedTopic, setSelectedTopic] = useState<string>('energy');

  const isNormalized = activeSubModule === 'bte_normalized';
  const modeTitle = isNormalized ? 'Normalized — Baseline, Target & Evaluation' : 'Absolute — Baseline, Target & Evaluation';
  const modeBadge = isNormalized ? 'Normalized' : 'Absolute';
  
  const currentTopic = TOPICS.find(t => t.id === selectedTopic) || TOPICS[0];
  const TopicIcon = currentTopic.icon;

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        
        {/* Left Side: Title and Context */}
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 mb-1 uppercase tracking-wide">
            <TrendingUp size={14} /> Strategy & Evaluation
          </div>
          <h2 className="text-xl font-bold text-gray-800">{modeTitle}</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">
            {unitFullName} ({selectedUnit}) &bull; {selectedYear}
          </p>
        </div>

        {/* Right Side: Topic Dropdown */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
          <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
            Select Topic:
          </label>
          <div className="relative w-full sm:w-64">
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full appearance-none bg-gray-50 border border-gray-300 text-gray-800 text-sm font-medium rounded-lg px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors cursor-pointer"
            >
              {TOPICS.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
              <ChevronDown size={16} />
            </div>
          </div>
        </div>

      </div>

      {/* DYNAMIC VIEW HEADER */}
      <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100/80 px-4 py-2 rounded-lg border border-gray-200 w-fit shadow-sm">
        <Target size={16} className="text-emerald-600" />
        <span className="font-semibold text-gray-800">{modeBadge} Baseline, Target & Evaluation</span>
        <span className="text-gray-400">&mdash;</span>
        <span className="font-semibold text-gray-800">{currentTopic.label}</span>
        <span className="text-gray-400">({selectedUnit} - {selectedYear})</span>
      </div>

      {/* MAIN WORKSPACE PLACEHOLDER */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm min-h-[500px] flex flex-col items-center justify-center p-8 text-center border-dashed">
        <div className="w-20 h-20 rounded-2xl bg-emerald-50 flex items-center justify-center mb-6 border border-emerald-100 shadow-sm">
          <TopicIcon className="text-emerald-600" size={36} />
        </div>
        
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          {currentTopic.label} {modeBadge} Workspace
        </h3>
        
        <p className="text-sm text-gray-500 max-w-md mb-8 leading-relaxed">
          This is a clean, structured placeholder for the <b>{currentTopic.label}</b> baseline, target setting, 
          and evaluation data entry based on the <b>{modeBadge}</b> methodology.
        </p>
        
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Methodology</span>
            <div className={`text-sm font-bold ${isNormalized ? 'text-emerald-600' : 'text-blue-600'}`}>
              {modeBadge}
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Topic</span>
            <div className="text-sm font-bold text-gray-800">{currentTopic.label}</div>
          </div>
          <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Year</span>
            <div className="text-sm font-bold text-gray-800">{selectedYear}</div>
          </div>
          <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Unit</span>
            <div className="text-sm font-bold text-gray-800">{selectedUnit}</div>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100">
          <Target size={14} /> Ready for baseline & target form implementation
        </div>
      </div>

    </div>
  );
};

export default BaselineTargetEvaluation;
