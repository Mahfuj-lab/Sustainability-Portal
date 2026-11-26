import React, { useMemo, useState, useEffect } from 'react';

export type ThemeKey = 'emerald' | 'navy' | 'midnight' | 'teal' | 'slate';

export interface ThemeConfig {
  id: ThemeKey;
  name: string;
  description: string;
  sidebarBg: string;
  sidebarText: string;
  headerBg: string;
  mainBg: string;
  pageBg: string;
  cardBg: string;
  accentBg: string;
  accentText: string;
  previewPrimary: string;
  previewSecondary: string;
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'emerald',
    name: 'Emerald Eco',
    description: 'Fresh, sustainable greens for everyday ESG reporting.',
    sidebarBg: 'bg-white border-r border-gray-200',
    sidebarText: 'text-gray-700 font-medium',
    headerBg: 'bg-white border-b border-gray-200 text-gray-800',
    mainBg: 'bg-[#f8fafc]',
    pageBg: 'bg-[#f8fafc]',
    cardBg: 'bg-white',
    accentBg: 'bg-emerald-600',
    accentText: 'text-white',
    previewPrimary: '#065f46',
    previewSecondary: '#34d399',
  },
  {
    id: 'navy',
    name: 'Corporate Navy',
    description: 'Classic corporate blues with a professional tone.',
    sidebarBg: 'bg-slate-900',
    sidebarText: 'text-slate-100',
    headerBg: 'bg-blue-900',
    mainBg: 'bg-slate-100',
    pageBg: 'bg-slate-100',
    cardBg: 'bg-white',
    accentBg: 'bg-blue-700',
    accentText: 'text-white',
    previewPrimary: '#1e3a8a',
    previewSecondary: '#60a5fa',
  },
  {
    id: 'midnight',
    name: 'Midnight Pro (Dark)',
    description: 'Dark, low-glare interface for extended reporting sessions.',
    sidebarBg: 'bg-black',
    sidebarText: 'text-slate-200',
    headerBg: 'bg-neutral-900',
    mainBg: 'bg-neutral-950',
    pageBg: 'bg-neutral-950',
    cardBg: 'bg-neutral-900',
    accentBg: 'bg-indigo-500',
    accentText: 'text-white',
    previewPrimary: '#111827',
    previewSecondary: '#818cf8',
  },
  {
    id: 'teal',
    name: 'Teal Ocean',
    description: 'Calm teal tones reflecting water stewardship goals.',
    sidebarBg: 'bg-teal-900',
    sidebarText: 'text-teal-100',
    headerBg: 'bg-teal-800',
    mainBg: 'bg-teal-50',
    pageBg: 'bg-teal-50',
    cardBg: 'bg-white',
    accentBg: 'bg-teal-600',
    accentText: 'text-white',
    previewPrimary: '#134e4a',
    previewSecondary: '#2dd4bf',
  },
  {
    id: 'slate',
    name: 'Slate Minimal',
    description: 'Neutral, distraction-free layout focused on content.',
    sidebarBg: 'bg-slate-800',
    sidebarText: 'text-slate-100',
    headerBg: 'bg-slate-700',
    mainBg: 'bg-slate-50',
    pageBg: 'bg-slate-50',
    cardBg: 'bg-white',
    accentBg: 'bg-slate-600',
    accentText: 'text-white',
    previewPrimary: '#334155',
    previewSecondary: '#94a3b8',
  },
];

type SettingsTab = 'theme' | 'factors' | 'lock' | 'alerts';

interface EmissionFactor {
  id: string;
  name: string;
  unit: string;
  kgCO2ePerUnit: number;
  mjPerUnit: number;
  custom?: boolean;
}

const UNITS: string[] = [
  'EKWL',
  'DKL',
  'DDL',
  'EKWL-HW',
  'ESL',
  'ESL-Extention',
  'EFL',
  'EKL',
  'EPL',
  'EWL',
];

const BASE_FACTORS: EmissionFactor[] = [
  { id: 'grid', name: 'Bangladesh Grid Electricity', unit: 'kWh', kgCO2ePerUnit: 0.62, mjPerUnit: 3.6 },
  { id: 'gas', name: 'Natural Gas', unit: 'm³', kgCO2ePerUnit: 2.02, mjPerUnit: 38.3 },
  { id: 'diesel', name: 'Diesel', unit: 'L', kgCO2ePerUnit: 2.68, mjPerUnit: 36.4 },
  { id: 'furnace', name: 'Furnace Oil', unit: 'L', kgCO2ePerUnit: 3.15, mjPerUnit: 39.5 },
  { id: 'cng', name: 'CNG', unit: 'kg', kgCO2ePerUnit: 2.75, mjPerUnit: 48.0 },
  { id: 'lpg', name: 'LPG', unit: 'kg', kgCO2ePerUnit: 2.98, mjPerUnit: 46.1 },
  { id: 'biomass', name: 'Biomass', unit: 'kg', kgCO2ePerUnit: 0.02, mjPerUnit: 15.0 },
  { id: 'r22', name: 'Refrigerant R-22', unit: 'kg', kgCO2ePerUnit: 1810, mjPerUnit: 0 },
  { id: 'r410a', name: 'Refrigerant R-410A', unit: 'kg', kgCO2ePerUnit: 2088, mjPerUnit: 0 },
  { id: 'r134a', name: 'Refrigerant R-134a', unit: 'kg', kgCO2ePerUnit: 1430, mjPerUnit: 0 },
];

const YEARS: number[] = [2023, 2024, 2025, 2026, 2027];

interface LockState {
  locked: boolean;
  lastUpdated: string;
}

interface AlertRules {
  licenseExpiryWarningDays: number;
  criticalAlertDays: number;
  monthlySubmissionDeadlineDay: number;
  emailOnLock: boolean;
  emailOnFactorChange: boolean;
  emailOnMissingData: boolean;
  smsOnCritical: boolean;
  dailyDigest: boolean;
  weeklySummary: boolean;
}

export interface FactorSet {
  ngMjPerM3: number;
  ngKwhPerM3: number;
  dieselMjPerLiter: number;
  gridElecKgCo2PerKwh: number;
  ngKgCo2PerM3: number;
  dieselKgCo2PerLiter: number;
  cngKgCo2PerM3: number;
  petrolKgCo2PerLiter: number;
  r22Gwp: number;
  r134aGwp: number;
  r410aGwp: number;
  r404aGwp: number;
  r32Gwp: number;
}

const DEFAULT_FACTORS: FactorSet = {
  ngMjPerM3: 38.30,
  ngKwhPerM3: 10.64,
  dieselMjPerLiter: 35.80,
  gridElecKgCo2PerKwh: 0.6200,
  ngKgCo2PerM3: 2.0213,
  dieselKgCo2PerLiter: 2.5123,
  cngKgCo2PerM3: 2.0213,
  petrolKgCo2PerLiter: 2.3147,
  r22Gwp: 1810,
  r134aGwp: 1430,
  r410aGwp: 2088,
  r404aGwp: 3922,
  r32Gwp: 675,
};

export interface SettingsPanelProps {
  currentThemeId: string;
  onThemeChange: (newTheme: any) => void;
  theme?: any;
  userRole?: string;
  restGet?: (key: string) => unknown;
  restSet?: (key: string, value: unknown) => void;
  [key: string]: any;
}

function readNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export default function SettingsPanel({
  currentThemeId,
  onThemeChange,
  userRole,
  restGet,
  restSet,
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('theme');

  const [factorYear, setFactorYear] = useState<number>(2025);
  const [factors, setFactors] = useState<EmissionFactor[]>(BASE_FACTORS);
  const [factorsSaved, setFactorsSaved] = useState<boolean>(false);

  const [lockYear, setLockYear] = useState<number>(2025);
  const [locks, setLocks] = useState<Record<string, LockState>>(() => {
    const initial: Record<string, LockState> = {};
    UNITS.forEach((u) => {
      initial[u] = { locked: false, lastUpdated: '—' };
    });
    return initial;
  });
  const [groupName, setGroupName] = useState<string>('Epyllion Group');
  const [sbtiBaselineYear, setSbtiBaselineYear] = useState<number>(2022);
  const [lockSaved, setLockSaved] = useState<boolean>(false);

  const [alerts, setAlerts] = useState<AlertRules>(() => {
    const base: AlertRules = {
      licenseExpiryWarningDays: 90,
      criticalAlertDays: 30,
      monthlySubmissionDeadlineDay: 5,
      emailOnLock: true,
      emailOnFactorChange: true,
      emailOnMissingData: true,
      smsOnCritical: false,
      dailyDigest: false,
      weeklySummary: true,
    };
    if (restGet) {
      const stored = restGet('alertRules');
      if (stored && typeof stored === 'object') {
        const obj = stored as Partial<AlertRules>;
        return {
          licenseExpiryWarningDays: readNumber(obj.licenseExpiryWarningDays, base.licenseExpiryWarningDays),
          criticalAlertDays: readNumber(obj.criticalAlertDays, base.criticalAlertDays),
          monthlySubmissionDeadlineDay: readNumber(obj.monthlySubmissionDeadlineDay, base.monthlySubmissionDeadlineDay),
          emailOnLock: typeof obj.emailOnLock === 'boolean' ? obj.emailOnLock : base.emailOnLock,
          emailOnFactorChange: typeof obj.emailOnFactorChange === 'boolean' ? obj.emailOnFactorChange : base.emailOnFactorChange,
          emailOnMissingData: typeof obj.emailOnMissingData === 'boolean' ? obj.emailOnMissingData : base.emailOnMissingData,
          smsOnCritical: typeof obj.smsOnCritical === 'boolean' ? obj.smsOnCritical : base.smsOnCritical,
          dailyDigest: typeof obj.dailyDigest === 'boolean' ? obj.dailyDigest : base.dailyDigest,
          weeklySummary: typeof obj.weeklySummary === 'boolean' ? obj.weeklySummary : base.weeklySummary,
        };
      }
    }
    return base;
  });
  const [alertsSaved, setAlertsSaved] = useState<boolean>(false);

  // Year-wise Conversion Factors state
  const [factorsByYear, setFactorsByYear] = useState<Record<string, FactorSet>>({});
  const [selectedFactorYear, setSelectedFactorYear] = useState<number>(2025);
  const [factorYears, setFactorYears] = useState<number[]>([2023, 2024, 2025, 2026, 2027]);
  const [yearFactorsSaved, setYearFactorsSaved] = useState<boolean>(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sustainability_factors_by_year');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          setFactorsByYear(parsed);
          const existingYears = Object.keys(parsed).map(Number).filter(y => !isNaN(y));
          setFactorYears(prev => Array.from(new Set([...prev, ...existingYears])).sort((a, b) => a - b));
        }
      }
    } catch (e) {
      console.error('Failed to load factor years', e);
    }
  }, []);

  const currentYearFactors = factorsByYear[String(selectedFactorYear)] || DEFAULT_FACTORS;

  const handleYearFactorChange = (key: keyof FactorSet, value: string) => {
    const num = Number(value);
    const newValue = Number.isFinite(num) ? num : 0;
    setFactorsByYear(prev => ({
      ...prev,
      [String(selectedFactorYear)]: {
        ...(prev[String(selectedFactorYear)] || DEFAULT_FACTORS),
        [key]: newValue,
      },
    }));
    setYearFactorsSaved(false);
  };

  const handleAddYear = () => {
    const newYear = Math.max(...factorYears, 2025) + 1;
    if (!factorYears.includes(newYear)) {
      setFactorYears(prev => [...prev, newYear].sort((a, b) => a - b));
      setSelectedFactorYear(newYear);
      setFactorsByYear(prev => ({
        ...prev,
        [String(newYear)]: { ...DEFAULT_FACTORS },
      }));
      setYearFactorsSaved(false);
    }
  };

  const handleSaveYearFactors = () => {
    try {
      localStorage.setItem('sustainability_factors_by_year', JSON.stringify(factorsByYear));
      setYearFactorsSaved(true);
      setTimeout(() => setYearFactorsSaved(false), 3000);
    } catch (e) {
      alert('Failed to save factors to local storage.');
    }
  };

  const canEdit = useMemo<boolean>(() => {
    if (!userRole) return true;
    const role = userRole.toLowerCase();
    return role === 'admin' || role === 'superadmin' || role === 'manager';
  }, [userRole]);

  const handleFactorChange = (id: string, field: 'kgCO2ePerUnit' | 'mjPerUnit', value: string): void => {
    const num = Number(value);
    setFactors((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [field]: Number.isFinite(num) ? num : 0 } : f))
    );
    setFactorsSaved(false);
  };

  const handleAddCustomFactor = (): void => {
    const newId = `custom-${Date.now()}`;
    setFactors((prev) => [
      ...prev,
      { id: newId, name: 'New Custom Factor', unit: 'unit', kgCO2ePerUnit: 0, mjPerUnit: 0, custom: true },
    ]);
    setFactorsSaved(false);
  };

  const handleCustomNameChange = (id: string, value: string): void => {
    setFactors((prev) => prev.map((f) => (f.id === id ? { ...f, name: value } : f)));
    setFactorsSaved(false);
  };

  const handleCustomUnitChange = (id: string, value: string): void => {
    setFactors((prev) => prev.map((f) => (f.id === id ? { ...f, unit: value } : f)));
    setFactorsSaved(false);
  };

  const handleRemoveCustomFactor = (id: string): void => {
    setFactors((prev) => prev.filter((f) => f.id !== id));
    setFactorsSaved(false);
  };

  const handleSaveFactors = (): void => {
    if (restSet) restSet(`emissionFactors:${factorYear}`, factors);
    setFactorsSaved(true);
  };

  const handleToggleLock = (unit: string): void => {
    setLocks((prev) => ({
      ...prev,
      [unit]: {
        locked: !prev[unit].locked,
        lastUpdated: new Date().toLocaleString(),
      },
    }));
    setLockSaved(false);
  };

  const handleSaveLock = (): void => {
    if (restSet) {
      restSet(`dataLock:${lockYear}`, locks);
      restSet('corporateGroupName', groupName);
      restSet('sbtiBaselineYear', sbtiBaselineYear);
    }
    setLockSaved(true);
  };

  const handleAlertChange = <K extends keyof AlertRules>(key: K, value: AlertRules[K]): void => {
    setAlerts((prev) => ({ ...prev, [key]: value }));
    setAlertsSaved(false);
  };

  const handleSaveAlerts = (): void => {
    if (restSet) restSet('alertRules', alerts);
    setAlertsSaved(true);
  };

  const tabs: Array<{ id: SettingsTab; label: string; icon: string }> = [
    { id: 'theme', label: 'Theme & Appearance', icon: '🎨' },
    { id: 'factors', label: 'Emission Factors & Conversion', icon: '⚗️' },
    { id: 'lock', label: 'Data Lock & Unit Control', icon: '🔒' },
    { id: 'alerts', label: 'Alert & Notification Rules', icon: '🔔' },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure appearance, emission factors, data locks, and notification rules.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={
              'px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors ' +
              (activeTab === t.id
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')
            }
          >
            <span className="mr-1.5">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'theme' && (
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-1">Choose a Theme</h2>
          <p className="text-sm text-slate-500 mb-4">
            Select the color palette that best fits your reporting environment.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {THEMES.map((theme) => {
              const selected = currentThemeId === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => onThemeChange(theme.id)}
                  className={
                    'text-left rounded-xl border p-4 transition-all shadow-sm hover:shadow-md ' +
                    (selected
                      ? 'border-emerald-600 ring-2 ring-emerald-300 bg-white'
                      : 'border-slate-200 bg-white')
                  }
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex gap-1.5">
                      <span
                        className="inline-block w-6 h-6 rounded-full border border-white shadow"
                        style={{ backgroundColor: theme.previewPrimary }}
                      />
                      <span
                        className="inline-block w-6 h-6 rounded-full border border-white shadow"
                        style={{ backgroundColor: theme.previewSecondary }}
                      />
                    </div>
                    {selected && (
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800">{theme.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{theme.description}</p>
                  <div className="mt-3 flex gap-1">
                    <div className={'h-2 flex-1 rounded ' + theme.sidebarBg} />
                    <div className={'h-2 flex-1 rounded ' + theme.headerBg} />
                    <div className={'h-2 flex-1 rounded ' + theme.accentBg} />
                    <div className={'h-2 flex-1 rounded ' + theme.pageBg + ' border border-slate-200'} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Year-Wise Conversion, GHG & ODS Factor Settings */}
          <div className="mt-10 border-t border-slate-200 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Year-Wise Conversion, GHG &amp; ODS Factor Settings</h2>
                <p className="text-sm text-slate-500">
                  Configure Net Calorific Values (NCV), DEFRA/IPCC Emission Factors, and Refrigerant GWP factors per year.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  Year
                  <select
                    value={selectedFactorYear}
                    onChange={(e) => {
                      setSelectedFactorYear(Number(e.target.value));
                      setYearFactorsSaved(false);
                    }}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {factorYears.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={handleAddYear}
                  className="px-3 py-1.5 text-sm font-semibold rounded-md border border-dashed border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                >
                  + Add Year
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              {/* Card A: Energy Conversion */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">
                  Energy Conversion Factors (NCV)
                </h3>
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">Natural Gas to MJ</span>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={currentYearFactors.ngMjPerM3}
                        onChange={(e) => handleYearFactorChange('ngMjPerM3', e.target.value)}
                        disabled={!canEdit}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:border-emerald-500 disabled:bg-slate-50"
                      />
                      <span className="text-xs text-slate-500 whitespace-nowrap">MJ/m³</span>
                    </div>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">Natural Gas to kWh</span>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={currentYearFactors.ngKwhPerM3}
                        onChange={(e) => handleYearFactorChange('ngKwhPerM3', e.target.value)}
                        disabled={!canEdit}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:border-emerald-500 disabled:bg-slate-50"
                      />
                      <span className="text-xs text-slate-500 whitespace-nowrap">kWh/m³</span>
                    </div>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">Diesel to MJ</span>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={currentYearFactors.dieselMjPerLiter}
                        onChange={(e) => handleYearFactorChange('dieselMjPerLiter', e.target.value)}
                        disabled={!canEdit}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:border-emerald-500 disabled:bg-slate-50"
                      />
                      <span className="text-xs text-slate-500 whitespace-nowrap">MJ/L</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Card B: GHG Emission */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">
                  GHG Emission Factors (DEFRA / Grid)
                </h3>
                <div className="space-y-2">
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">Grid Electricity</span>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        step="0.0001"
                        value={currentYearFactors.gridElecKgCo2PerKwh}
                        onChange={(e) => handleYearFactorChange('gridElecKgCo2PerKwh', e.target.value)}
                        disabled={!canEdit}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:border-emerald-500 disabled:bg-slate-50"
                      />
                      <span className="text-xs text-slate-500 whitespace-nowrap">kg CO₂e/kWh</span>
                    </div>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">Natural Gas</span>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        step="0.0001"
                        value={currentYearFactors.ngKgCo2PerM3}
                        onChange={(e) => handleYearFactorChange('ngKgCo2PerM3', e.target.value)}
                        disabled={!canEdit}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:border-emerald-500 disabled:bg-slate-50"
                      />
                      <span className="text-xs text-slate-500 whitespace-nowrap">kg CO₂e/m³</span>
                    </div>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">Diesel</span>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        step="0.0001"
                        value={currentYearFactors.dieselKgCo2PerLiter}
                        onChange={(e) => handleYearFactorChange('dieselKgCo2PerLiter', e.target.value)}
                        disabled={!canEdit}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:border-emerald-500 disabled:bg-slate-50"
                      />
                      <span className="text-xs text-slate-500 whitespace-nowrap">kg CO₂e/L</span>
                    </div>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">CNG</span>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        step="0.0001"
                        value={currentYearFactors.cngKgCo2PerM3}
                        onChange={(e) => handleYearFactorChange('cngKgCo2PerM3', e.target.value)}
                        disabled={!canEdit}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:border-emerald-500 disabled:bg-slate-50"
                      />
                      <span className="text-xs text-slate-500 whitespace-nowrap">kg CO₂e/m³</span>
                    </div>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">Octane / Petrol</span>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        step="0.0001"
                        value={currentYearFactors.petrolKgCo2PerLiter}
                        onChange={(e) => handleYearFactorChange('petrolKgCo2PerLiter', e.target.value)}
                        disabled={!canEdit}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:border-emerald-500 disabled:bg-slate-50"
                      />
                      <span className="text-xs text-slate-500 whitespace-nowrap">kg CO₂e/L</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Card C: Refrigerant & ODS */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">
                  Refrigerant &amp; ODS GWP Factors (IPCC)
                </h3>
                <div className="space-y-2">
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">R-22</span>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        value={currentYearFactors.r22Gwp}
                        onChange={(e) => handleYearFactorChange('r22Gwp', e.target.value)}
                        disabled={!canEdit}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:border-emerald-500 disabled:bg-slate-50"
                      />
                      <span className="text-xs text-slate-500 whitespace-nowrap">GWP</span>
                    </div>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">R-134a</span>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        value={currentYearFactors.r134aGwp}
                        onChange={(e) => handleYearFactorChange('r134aGwp', e.target.value)}
                        disabled={!canEdit}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:border-emerald-500 disabled:bg-slate-50"
                      />
                      <span className="text-xs text-slate-500 whitespace-nowrap">GWP</span>
                    </div>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">R-410A</span>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        value={currentYearFactors.r410aGwp}
                        onChange={(e) => handleYearFactorChange('r410aGwp', e.target.value)}
                        disabled={!canEdit}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:border-emerald-500 disabled:bg-slate-50"
                      />
                      <span className="text-xs text-slate-500 whitespace-nowrap">GWP</span>
                    </div>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">R-404A</span>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        value={currentYearFactors.r404aGwp}
                        onChange={(e) => handleYearFactorChange('r404aGwp', e.target.value)}
                        disabled={!canEdit}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:border-emerald-500 disabled:bg-slate-50"
                      />
                      <span className="text-xs text-slate-500 whitespace-nowrap">GWP</span>
                    </div>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">R-32</span>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        value={currentYearFactors.r32Gwp}
                        onChange={(e) => handleYearFactorChange('r32Gwp', e.target.value)}
                        disabled={!canEdit}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:border-emerald-500 disabled:bg-slate-50"
                      />
                      <span className="text-xs text-slate-500 whitespace-nowrap">GWP</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              {yearFactorsSaved && (
                <span className="text-sm text-emerald-700 font-medium">✓ Factors saved for {selectedFactorYear}</span>
              )}
              <button
                type="button"
                onClick={handleSaveYearFactors}
                disabled={!canEdit}
                className="px-5 py-2 text-sm font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Save Factors for {selectedFactorYear}
              </button>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'factors' && (
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Emission Factors &amp; Conversion</h2>
              <p className="text-sm text-slate-500">
                Edit the factors used to convert activity data into CO₂e emissions.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-slate-600 font-medium">Year</span>
              <select
                value={factorYear}
                onChange={(e) => {
                  setFactorYear(Number(e.target.value));
                  setFactorsSaved(false);
                }}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Factor</th>
                  <th className="text-left px-4 py-3 font-semibold">Unit</th>
                  <th className="text-right px-4 py-3 font-semibold">kg CO₂e / Unit</th>
                  <th className="text-right px-4 py-3 font-semibold">MJ / Unit</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {factors.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2">
                      {f.custom ? (
                        <input
                          type="text"
                          value={f.name}
                          onChange={(e) => handleCustomNameChange(f.id, e.target.value)}
                          className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      ) : (
                        <span className="font-medium text-slate-700">{f.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {f.custom ? (
                        <input
                          type="text"
                          value={f.unit}
                          onChange={(e) => handleCustomUnitChange(f.id, e.target.value)}
                          className="w-24 rounded border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      ) : (
                        <span className="text-slate-500">{f.unit}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={f.kgCO2ePerUnit}
                        onChange={(e) => handleFactorChange(f.id, 'kgCO2ePerUnit', e.target.value)}
                        className="w-28 rounded border border-slate-300 px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={f.mjPerUnit}
                        onChange={(e) => handleFactorChange(f.id, 'mjPerUnit', e.target.value)}
                        className="w-28 rounded border border-slate-300 px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      {f.custom && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomFactor(f.id)}
                          className="text-xs text-red-600 hover:text-red-700 font-medium"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleAddCustomFactor}
              className="px-4 py-2 text-sm font-medium rounded-md border border-dashed border-emerald-500 text-emerald-700 hover:bg-emerald-50"
            >
              + Add Custom Factor
            </button>
            <div className="flex items-center gap-3">
              {factorsSaved && (
                <span className="text-sm text-emerald-700">✓ Saved for {factorYear}</span>
              )}
              <button
                type="button"
                onClick={handleSaveFactors}
                disabled={!canEdit}
                className="px-5 py-2 text-sm font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Factors
              </button>
            </div>
          </div>
          {!canEdit && (
            <p className="mt-2 text-xs text-amber-600">
              Your role ({userRole}) can view but not edit emission factors.
            </p>
          )}
        </section>
      )}

      {activeTab === 'lock' && (
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Data Lock &amp; Unit Control</h2>
              <p className="text-sm text-slate-500">
                Lock reported data per unit once verified. Locked units reject new submissions.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-slate-600 font-medium">Year</span>
              <select
                value={lockYear}
                onChange={(e) => {
                  setLockYear(Number(e.target.value));
                  setLockSaved(false);
                }}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {UNITS.map((unit) => {
              const state = locks[unit];
              return (
                <div
                  key={unit}
                  className={
                    'rounded-lg border p-3 flex items-center justify-between ' +
                    (state.locked
                      ? 'border-red-200 bg-red-50'
                      : 'border-emerald-200 bg-emerald-50')
                  }
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{unit}</div>
                    <div className="text-xs text-slate-500">
                      {state.locked ? 'Locked' : 'Open'} · {state.lastUpdated}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleLock(unit)}
                    disabled={!canEdit}
                    className={
                      'px-3 py-1.5 text-xs font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ' +
                      (state.locked
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700')
                    }
                  >
                    {state.locked ? 'Unlock' : 'Lock'}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Corporate Group Name</span>
              <input
                type="text"
                value={groupName}
                onChange={(e) => {
                  setGroupName(e.target.value);
                  setLockSaved(false);
                }}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">SBTi Baseline Year</span>
              <select
                value={sbtiBaselineYear}
                onChange={(e) => {
                  setSbtiBaselineYear(Number(e.target.value));
                  setLockSaved(false);
                }}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {[2018, 2019, 2020, 2021, 2022, 2023, 2024].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3">
            {lockSaved && <span className="text-sm text-emerald-700">✓ Settings saved</span>}
            <button
              type="button"
              onClick={handleSaveLock}
              disabled={!canEdit}
              className="px-5 py-2 text-sm font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Lock Settings
            </button>
          </div>
        </section>
      )}

      {activeTab === 'alerts' && (
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-1">Alert &amp; Notification Rules</h2>
          <p className="text-sm text-slate-500 mb-4">
            Configure thresholds and channels for automated compliance notifications.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">License Expiry Warning (days)</span>
              <input
                type="number"
                min={0}
                value={alerts.licenseExpiryWarningDays}
                onChange={(e) => handleAlertChange('licenseExpiryWarningDays', Number(e.target.value) || 0)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Critical Alert (days)</span>
              <input
                type="number"
                min={0}
                value={alerts.criticalAlertDays}
                onChange={(e) => handleAlertChange('criticalAlertDays', Number(e.target.value) || 0)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Monthly Submission Deadline (day)</span>
              <input
                type="number"
                min={1}
                max={28}
                value={alerts.monthlySubmissionDeadlineDay}
                onChange={(e) => handleAlertChange('monthlySubmissionDeadlineDay', Number(e.target.value) || 1)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
            {(
              [
                { key: 'emailOnLock', label: 'Email me when a unit is locked' },
                { key: 'emailOnFactorChange', label: 'Email me when emission factors change' },
                { key: 'emailOnMissingData', label: 'Email me on missing monthly data' },
                { key: 'smsOnCritical', label: 'Send SMS for critical alerts' },
                { key: 'dailyDigest', label: 'Daily email digest' },
                { key: 'weeklySummary', label: 'Weekly summary report' },
              ] as Array<{ key: keyof AlertRules; label: string }>
            ).map((item) => {
              const value = Boolean(alerts[item.key]);
              return (
                <div key={item.key} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-slate-700">{item.label}</span>
                  <button
                    type="button"
                    onClick={() => handleAlertChange(item.key, value === true ? false : true)}
                    disabled={!canEdit}
                    aria-pressed={value}
                    className={
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ' +
                      (value ? 'bg-emerald-600' : 'bg-slate-300')
                    }
                  >
                    <span
                      className={
                        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform ' +
                        (value ? 'translate-x-6' : 'translate-x-1')
                      }
                    />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-end gap-3">
            {alertsSaved && <span className="text-sm text-emerald-700">✓ Alert rules saved</span>}
            <button
              type="button"
              onClick={handleSaveAlerts}
              disabled={!canEdit}
              className="px-5 py-2 text-sm font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Alert Rules
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
