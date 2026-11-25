import React, { useState, useEffect } from 'react';
import { Check, Palette, Save, Factory } from 'lucide-react';

// ============================================================
// THEME CONFIGURATIONS
// ============================================================
export const THEMES = [
  {
    id: 'emerald',
    name: 'Emerald Sustainability',
    description: 'Vibrant emerald primary, crisp white cards, soft emerald accents.',
    previewColors: ['#ffffff', '#ecfdf5', '#10b981', '#047857', '#064e3b'],
    sidebarBg: 'bg-white',
    sidebarText: 'text-gray-600',
    sidebarActive: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    headerBg: 'bg-white border-gray-200',
    primaryBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    accentBadge: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    pageBg: 'bg-gray-50',
  },
  {
    id: 'ocean',
    name: 'Royal Ocean Blue',
    description: 'Deep sky/blue primary, crisp slate-50 background, high-contrast blue.',
    previewColors: ['#f8fafc', '#f0f9ff', '#0ea5e9', '#2563eb', '#1e3a8a'],
    sidebarBg: 'bg-white',
    sidebarText: 'text-slate-600',
    sidebarActive: 'bg-blue-50 text-blue-700 border-blue-200',
    headerBg: 'bg-white border-slate-200',
    primaryBtn: 'bg-blue-600 hover:bg-blue-700 text-white',
    accentBadge: 'bg-blue-50 text-blue-700 border-blue-100',
    pageBg: 'bg-slate-50',
  },
  {
    id: 'aurora',
    name: 'Vibrant Aurora (Colorful)',
    description: 'Rich indigo-to-purple-to-teal gradients, colorful status badges, modern SaaS look.',
    previewColors: ['#fdf4ff', '#e0e7ff', '#818cf8', '#c084fc', '#0d9488'],
    sidebarBg: 'bg-white',
    sidebarText: 'text-indigo-900/60',
    sidebarActive: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    headerBg: 'bg-white border-indigo-100',
    primaryBtn: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-teal-400 hover:opacity-90 text-white',
    accentBadge: 'bg-purple-50 text-purple-700 border-purple-100',
    pageBg: 'bg-[#fdf4ff]', // Very soft purple/white
  },
  {
    id: 'sunset',
    name: 'Warm Coral & Amber',
    description: 'Vibrant orange/amber & rose accents, crisp warm-white surface.',
    previewColors: ['#fffbeb', '#fef3c7', '#f59e0b', '#f43f5e', '#881337'],
    sidebarBg: 'bg-white',
    sidebarText: 'text-amber-900/60',
    sidebarActive: 'bg-amber-50 text-amber-700 border-amber-200',
    headerBg: 'bg-white border-amber-100',
    primaryBtn: 'bg-amber-600 hover:bg-amber-700 text-white',
    accentBadge: 'bg-rose-50 text-rose-700 border-rose-100',
    pageBg: 'bg-orange-50/30',
  },
  {
    id: 'midnight',
    name: 'Midnight Pro (Dark)',
    description: 'High-contrast slate-900 dark mode with glowing emerald/cyan accents.',
    previewColors: ['#0f172a', '#1e293b', '#334155', '#10b981', '#06b6d4'],
    sidebarBg: 'bg-slate-900',
    sidebarText: 'text-slate-400',
    sidebarActive: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    headerBg: 'bg-slate-900 border-slate-800',
    primaryBtn: 'bg-emerald-500 hover:bg-emerald-400 text-slate-900',
    accentBadge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    pageBg: 'bg-slate-950',
  },
];

// ============================================================
// PROPS
// ============================================================
interface SettingsPanelProps {
  currentThemeId: string;
  onThemeChange: (themeId: string) => void;
  // Emission Factors Props
  settingsFactors: any; // Using any to avoid strict typing conflicts if imported from elsewhere
  setSettingsFactors: (val: any) => void;
  isSuper: boolean;
  onSaveSettings: () => void;
  n: (val: any) => number;
}

// ============================================================
// COMPONENT
// ============================================================
const SettingsPanel: React.FC<SettingsPanelProps> = ({
  currentThemeId,
  onThemeChange,
  settingsFactors,
  setSettingsFactors,
  isSuper,
  onSaveSettings,
  n,
}) => {
  const [localTheme, setLocalTheme] = useState(currentThemeId || 'emerald');

  useEffect(() => {
    setLocalTheme(currentThemeId);
  }, [currentThemeId]);

  const handleThemeSelect = (themeId: string) => {
    setLocalTheme(themeId);
    localStorage.setItem('portal_theme', themeId);
    onThemeChange(themeId);
  };

  const activeTheme = THEMES.find(t => t.id === localTheme) || THEMES[0];
  const isDark = activeTheme.id === 'midnight';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* THEME SETTINGS SECTION */}
      <div className={`rounded-xl border shadow-sm p-6 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className={`p-2 rounded-lg ${activeTheme.accentBadge}`}>
            <Palette size={20} />
          </div>
          <div>
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Theme & Appearance
            </h2>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Personalize your portal experience. Changes are applied instantly.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {THEMES.map((theme) => {
            const isSelected = localTheme === theme.id;
            const isThemeDark = theme.id === 'midnight';
            
            return (
              <button
                key={theme.id}
                onClick={() => handleThemeSelect(theme.id)}
                className={`relative text-left rounded-xl border-2 transition-all duration-200 overflow-hidden group
                  ${isSelected 
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md scale-[1.02]' 
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }
                  ${isThemeDark ? 'bg-slate-800' : 'bg-white'}
                `}
              >
                {/* Visual Preview Area */}
                <div className={`h-24 p-4 flex gap-2 items-center ${isThemeDark ? 'bg-slate-800' : 'bg-gray-50'}`}>
                  {theme.previewColors.map((color, idx) => (
                    <div 
                      key={idx} 
                      className="w-8 h-8 rounded-full shadow-sm border border-black/5"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>

                {/* Content Area */}
                <div className={`p-4 ${isThemeDark ? 'bg-slate-900' : 'bg-white'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`font-bold text-sm ${isThemeDark ? 'text-white' : 'text-gray-900'}`}>
                      {theme.name}
                    </h3>
                    {isSelected && (
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <p className={`text-xs leading-relaxed ${isThemeDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    {theme.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* EMISSION FACTORS SECTION */}
      <div className={`rounded-xl border shadow-sm p-6 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className={`p-2 rounded-lg ${activeTheme.accentBadge}`}>
            <Factory size={20} />
          </div>
          <div>
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Emission Factors
            </h2>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Configure global kg CO2e factors used for auto-calculations.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {([
            ['grid_electricity','Grid Electricity (kWh)'],
            ['natural_gas','Natural Gas (m³)'],
            ['diesel','Diesel (L)'],
            ['petrol_octane','Petrol/Octane (L)'],
            ['cng','CNG (m³)'],
          ] as [string, string][]).map(([k, l]) => (
            <div key={k}>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                {l}
              </label>
              <input 
                type="number" 
                value={settingsFactors[k]} 
                disabled={!isSuper}
                onChange={e => setSettingsFactors({ ...settingsFactors, [k]: n(e.target.value) })}
                className={`w-full px-3 py-2 border rounded-lg text-sm outline-none transition-colors
                  ${isDark 
                    ? 'bg-slate-800 border-slate-700 text-white focus:border-emerald-500 disabled:opacity-50' 
                    : 'bg-white border-gray-300 text-gray-900 focus:border-emerald-500 disabled:bg-gray-50'
                  }
                `} 
              />
            </div>
          ))}
        </div>

        {isSuper && (
          <div className="mt-6 flex justify-end">
            <button 
              onClick={onSaveSettings} 
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all shadow-sm ${activeTheme.primaryBtn}`}
            >
              <Save size={16} /> Save Emission Factors
            </button>
          </div>
        )}
      </div>

    </div>
  );
};

export default SettingsPanel;
