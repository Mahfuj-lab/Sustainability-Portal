import React from 'react';
import { 
  BarChart3, TrendingUp, TrendingDown, Factory, Zap, Wind, 
  Droplets, Trash2, ShieldCheck, FileCheck, Target, Info,
  ArrowUpRight, CheckCircle2, AlertCircle
} from 'lucide-react';

// ============================================================
// PROPS
// ============================================================
interface SustainabilitySummaryProps {
  selectedUnit: string;
  unitFullName: string;
  selectedYear: string;
  userRole: string;
}

// ============================================================
// MOCK DATA (Initialized to 0/Placeholder)
// ============================================================
const KPI_CARDS = [
  { label: 'Total Production', value: '0', unit: 'Pcs / Kg', icon: Factory, color: 'emerald', trend: '0%', trendUp: true },
  { label: 'Total Energy', value: '0', unit: 'kWh / MJ', icon: Zap, color: 'amber', trend: '0%', trendUp: true },
  { label: 'Total GHG Emissions', value: '0', unit: 'tCO2e (Scope 1 & 2)', icon: Wind, color: 'blue', trend: '0%', trendUp: true },
  { label: 'Total Water Withdrawal', value: '0', unit: 'm³', icon: Droplets, color: 'cyan', trend: '0%', trendUp: true },
  { label: 'Total Wastewater', value: '0', unit: 'm³', icon: Droplets, color: 'indigo', trend: '0%', trendUp: true },
  { label: 'Total Solid Waste', value: '0', unit: 'Kg / % Recycled', icon: Trash2, color: 'rose', trend: '0%', trendUp: true },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Color mapping to avoid dynamic Tailwind purge issues
const colorStyles: Record<string, { bg: string, text: string, iconBg: string, border: string }> = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', iconBg: 'bg-emerald-100', border: 'border-emerald-200' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', iconBg: 'bg-amber-100', border: 'border-amber-200' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', iconBg: 'bg-blue-100', border: 'border-blue-200' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-700', iconBg: 'bg-cyan-100', border: 'border-cyan-200' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', iconBg: 'bg-indigo-100', border: 'border-indigo-200' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-700', iconBg: 'bg-rose-100', border: 'border-rose-200' },
};

// ============================================================
// COMPONENT
// ============================================================
const SustainabilitySummary: React.FC<SustainabilitySummaryProps> = ({ 
  selectedUnit, 
  unitFullName, 
  selectedYear, 
  userRole 
}) => {
  return (
    <div className="space-y-6">
      
      {/* EXECUTIVE BANNER */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 mb-1 uppercase tracking-wide">
            <BarChart3 size={14} /> Executive Dashboard
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Sustainability Summary & Performance</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">
            {unitFullName} ({selectedUnit}) &bull; Reporting Year: {selectedYear}
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-50 border border-emerald-100 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
            Live Overview &bull; Ready for Data Sync
          </span>
        </div>
      </div>

      {/* INFO BANNER */}
      <div className="bg-blue-50 border border-blue-200 text-blue-800 px-5 py-4 rounded-xl flex items-start gap-3 shadow-sm">
        <Info size={20} className="text-blue-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold mb-1">Waiting for Data Entry</h4>
          <p className="text-xs text-blue-700/80 leading-relaxed">
            All metrics are currently initialized at zero. These executive cards, trend graphs, and compliance scores will automatically populate and visualize your performance once monthly Inventory and KPI data are entered.
          </p>
        </div>
      </div>

      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {KPI_CARDS.map((card, idx) => {
          const Icon = card.icon;
          const style = colorStyles[card.color];
          return (
            <div key={idx} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col justify-between transition-all hover:shadow-md">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${style.iconBg} ${style.text}`}>
                  <Icon size={24} />
                </div>
                <div className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full ${card.trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  {card.trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {card.trend}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{card.label}</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-black text-gray-800">{card.value}</h3>
                  <span className="text-xs font-semibold text-gray-400">{card.unit}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* VISUAL TRENDS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chart Area */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-800">Monthly Performance Trend</h3>
              <p className="text-xs text-gray-500">Production vs Energy & GHG Impact</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-gray-600">
                <span className="w-3 h-3 rounded bg-emerald-500"></span> Production
              </span>
              <span className="flex items-center gap-1.5 text-gray-600">
                <span className="w-3 h-3 rounded bg-amber-400"></span> Energy
              </span>
              <span className="flex items-center gap-1.5 text-gray-600">
                <span className="w-3 h-3 rounded bg-blue-400"></span> GHG
              </span>
            </div>
          </div>
          
          {/* CSS Chart Area Placeholder */}
          <div className="flex-1 min-h-[250px] flex items-end justify-between gap-2 border-b border-gray-200 pb-2 relative">
            {/* Horizontal Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              <div className="w-full border-t border-gray-100"></div>
              <div className="w-full border-t border-gray-100"></div>
              <div className="w-full border-t border-gray-100"></div>
              <div className="w-full border-t border-gray-100"></div>
            </div>

            {MONTHS.map((month) => (
              <div key={month} className="flex flex-col items-center gap-1 flex-1 z-10 group">
                <div className="w-full flex justify-center gap-1 items-end h-full relative">
                  {/* Ghost bars for placeholder */}
                  <div className="w-2 sm:w-3 bg-emerald-100 rounded-t-sm h-4 group-hover:bg-emerald-200 transition-all"></div>
                  <div className="w-2 sm:w-3 bg-amber-100 rounded-t-sm h-2 group-hover:bg-amber-200 transition-all"></div>
                  <div className="w-2 sm:w-3 bg-blue-100 rounded-t-sm h-3 group-hover:bg-blue-200 transition-all"></div>
                </div>
                <span className="text-[10px] font-semibold text-gray-400 mt-2">{month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Resource Intensity */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-1">Resource Intensity</h3>
          <p className="text-xs text-gray-500 mb-6">Metrics per unit of production</p>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-2">
                <span className="text-gray-600">Energy Intensity</span>
                <span className="text-gray-800">0 kWh/pcs</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-amber-400 h-2 rounded-full w-0"></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold mb-2">
                <span className="text-gray-600">GHG Intensity</span>
                <span className="text-gray-800">0 kgCO2e/pcs</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-blue-400 h-2 rounded-full w-0"></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold mb-2">
                <span className="text-gray-600">Water Intensity</span>
                <span className="text-gray-800">0 L/pcs</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-cyan-400 h-2 rounded-full w-0"></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold mb-2">
                <span className="text-gray-600">Waste Intensity</span>
                <span className="text-gray-800">0 g/pcs</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-rose-400 h-2 rounded-full w-0"></div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* COMPLIANCE SNAPSHOT */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <ShieldCheck className="text-emerald-600" size={20} />
          <h3 className="text-lg font-bold text-gray-800">Compliance & Readiness Snapshot</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Higg FEM */}
          <div className="border border-gray-200 rounded-lg p-4 flex items-start gap-4 bg-gray-50/50">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <FileCheck size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-800 mb-1">Higg FEM 4.0</h4>
              <p className="text-xs text-gray-500 mb-3">Facility Environmental Module</p>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded w-fit border border-amber-100">
                <AlertCircle size={12} /> Data Pending
              </div>
            </div>
          </div>

          {/* SBTi */}
          <div className="border border-gray-200 rounded-lg p-4 flex items-start gap-4 bg-gray-50/50">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <Target size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-800 mb-1">SBTi Targets</h4>
              <p className="text-xs text-gray-500 mb-3">Science Based Targets initiative</p>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded w-fit border border-amber-100">
                <AlertCircle size={12} /> Baseline Required
              </div>
            </div>
          </div>

          {/* License Readiness */}
          <div className="border border-gray-200 rounded-lg p-4 flex items-start gap-4 bg-gray-50/50">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-800 mb-1">License Readiness</h4>
              <p className="text-xs text-gray-500 mb-3">Permit & Regulatory Status</p>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded w-fit border border-emerald-100">
                <CheckCircle2 size={12} /> 0 of 0 Verified
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

export default SustainabilitySummary;
