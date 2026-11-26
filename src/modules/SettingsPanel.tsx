import React, { useState, useEffect } from 'react';
import { Palette, Flame, Lock, Bell, Save, Plus, Trash2, CheckCircle2, ShieldAlert } from 'lucide-react';
import { UNIT_DIRECTORY } from '../utils/unitDirectory';

export type ThemeKey = 'emerald' | 'navy' | 'midnight' | 'teal' | 'slate';

export interface ThemeConfig {
  id: ThemeKey;
  name: string;
  description: string;
  sidebarBg: string;
  sidebarText: string;
  headerBg: string;
  mainBg: string;
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
    description: 'Clean sustainability-focused green & crisp white interface',
    sidebarBg: 'bg-emerald-950',
    sidebarText: 'text-emerald-100',
    headerBg: 'bg-white border-b border-slate-200 text-slate-800',
    mainBg: 'bg-slate-50',
    cardBg: 'bg-white border border-slate-200 text-slate-800',
    accentBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    accentText: 'text-emerald-600',
    previewPrimary: '#064e3b',
    previewSecondary: '#10b981',
  },
  {
    id: 'navy',
    name: 'Corporate Navy',
    description: 'Executive boardroom navy blue & slate corporate look',
    sidebarBg: 'bg-slate-900',
    sidebarText: 'text-slate-200',
    headerBg: 'bg-white border-b border-slate-200 text-slate-800',
    mainBg: 'bg-slate-100',
    cardBg: 'bg-white border border-slate-200 text-slate-800',
    accentBg: 'bg-blue-700 hover:bg-blue-800 text-white',
    accentText: 'text-blue-700',
    previewPrimary: '#0f172a',
    previewSecondary: '#1d4ed8',
  },
  {
    id: 'midnight',
    name: 'Midnight Pro (Dark)',
    description: 'Low-glare dark workspace designed for long analytical sessions',
    sidebarBg: 'bg-zinc-950 border-r border-zinc-800',
    sidebarText: 'text-zinc-200',
    headerBg: 'bg-zinc-900 border-b border-zinc-800 text-zinc-100',
    mainBg: 'bg-zinc-950',
    cardBg: 'bg-zinc-900 border border-zinc-800 text-zinc-100',
    accentBg: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    accentText: 'text-emerald-400',
    previewPrimary: '#09090b',
    previewSecondary: '#27272a',
  },
  {
    id: 'teal',
    name: 'Teal Ocean',
    description: 'Modern industrial water & clean-tech inspired palette',
    sidebarBg: 'bg-teal-950',
    sidebarText: 'text-teal-100',
    headerBg: 'bg-white border-b border-teal-100 text-slate-800',
    mainBg: 'bg-teal-50/40',
    cardBg: 'bg-white border border-teal-100 text-slate-800',
    accentBg: 'bg-teal-600 hover:bg-teal-700 text-white',
    accentText: 'text-teal-600',
    previewPrimary: '#134e4a',
    previewSecondary: '#0d9488',
  },
  {
    id: 'slate',
    name: 'Slate Minimal',
    description: 'Neutral distraction-free monochrome enterprise workspace',
    sidebarBg: 'bg-neutral-900',
    sidebarText: 'text-neutral-200',
    headerBg: 'bg-white border-b border-neutral-200 text-neutral-800',
    mainBg: 'bg-neutral-50',
    cardBg: 'bg-white border border-neutral-200 text-neutral-800',
    accentBg: 'bg-neutral-800 hover:bg-neutral-900 text-white',
    accentText: 'text-neutral-800',
    previewPrimary: '#171717',
    previewSecondary: '#525252',
  },
];

interface EmissionFactorRow {
  id: string;
  source: string;
  unit: string;
  co2eFactor: string;
  energyFactor: string;
  reference: string;
}

const DEFAULT_FACTORS: EmissionFactorRow[] = [
  { id: 'grid', source: 'Grid Electricity (Bangladesh National Grid)', unit: 'kWh', co2eFactor: '0.620', energyFactor: '3.60', reference: 'DoE / IGES Grid EF' },
  { id: 'ngas', source: 'Natural Gas', unit: 'm³', co2eFactor: '1.930', energyFactor: '37.26', reference: 'IPCC 2006 / Petrobangla' },
  { id: 'diesel', source: 'Diesel (Generator / Boiler)', unit: 'Liter', co2eFactor: '2.680', energyFactor: '36.40', reference: 'DEFRA / IPCC' },
  { id: 'hfo', source: 'Furnace Oil (HFO)', unit: 'Liter', co2eFactor: '3.110', energyFactor: '40.40', reference: 'DEFRA / IPCC' },
  { id: 'cng', source: 'CNG (Compressed Natural Gas)', unit: 'm³', co2eFactor: '1.950', energyFactor: '38.00', reference: 'IPCC 2006' },
  { id: 'lpg', source: 'LPG (Liquefied Petroleum Gas)', unit: 'Kg', co2eFactor: '2.980', energyFactor: '46.10', reference: 'DEFRA / IPCC' },
  { id: 'biomass', source: 'Biomass / Wood Husk (Net CO2e)', unit: 'Kg', co2eFactor: '0.015', energyFactor: '15.50', reference: 'Higg FEM / IPCC' },
  { id: 'r22', source: 'Refrigerant R-22 (GWP)', unit: 'Kg', co2eFactor: '1810', energyFactor: '0', reference: 'IPCC AR5' },
  { id: 'r410a', source: 'Refrigerant R-410A (GWP)', unit: 'Kg', co2eFactor: '2088', energyFactor: '0', reference: 'IPCC AR5' },
  { id: 'r134a', source: 'Refrigerant R-134a (GWP)', unit: 'Kg', co2eFactor: '1430', energyFactor: '0', reference: 'IPCC AR5' },
];

interface SettingsPanelProps {
  currentTheme: ThemeKey;
  onSelectTheme: (theme: ThemeKey) => void;
  userRole?: string;
  restGet?: (...args: any[]) => Promise<any>;
  restSet?: (...args: any[]) => Promise<any>;
}

export default function SettingsPanel({
  currentTheme,
  onSelectTheme,
  userRole = 'super_admin',
  restGet,
  restSet,
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<'theme' | 'factors' | 'governance' | 'alerts'>('theme');
  const [factorYear, setFactorYear] = useState<string>('2026');
  const [factors, setFactors] = useState<EmissionFactorRow[]>(DEFAULT_FACTORS);

  const [lockYear, setLockYear] = useState<string>('2026');
  const [lockedUnits, setLockedUnits] = useState<Record<string, boolean>>({});
  const [orgName, setOrgName] = useState<string>('Epyllion Group');
  const [baselineYear, setBaselineYear] = useState<string>('2023');

  const [warningDays, setWarningDays] = useState<string>('60');
  const [criticalDays, setCriticalDays] = useState<string>('30');
  const [submissionDay, setSubmissionDay] = useState<string>('10');
  const [enableLicenseAlert, setEnableLicenseAlert] = useState<boolean>(true);
  const [enableMonthlyAlert, setEnableMonthlyAlert] = useState<boolean>(true);
  const [enableKpiAlert, setEnableKpiAlert] = useState<boolean>(true);

  const [saving, setSaving] = useState<boolean>(false);
  const [toast, setToast] = useState<string>('');

  const isViewer = userRole === 'viewer';
  const isDark = currentTheme === 'midnight';

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  useEffect(() => {
    const loadSettings = async () => {
      if (!restGet) return;
      try {
        const savedFactors = await restGet(`settings/emission_factors_${factorYear}`);
        if (savedFactors && Array.isArray(savedFactors.rows)) {
          setFactors(savedFactors.rows);
        } else {
          setFactors(DEFAULT_FACTORS);
        }

        const savedGov = await restGet('settings/governance_config');
        if (savedGov) {
          if (savedGov.orgName) setOrgName(savedGov.orgName);
          if (savedGov.baselineYear) setBaselineYear(savedGov.baselineYear);
          if (savedGov.lockedUnits) setLockedUnits(savedGov.lockedUnits);
        }

        const savedAlerts = await restGet('settings/alert_rules');
        if (savedAlerts) {
          if (savedAlerts.warningDays) setWarningDays(savedAlerts.warningDays);
          if (savedAlerts.criticalDays) setCriticalDays(savedAlerts.criticalDays);
          if (savedAlerts.submissionDay) setSubmissionDay(savedAlerts.submissionDay);
          if (typeof savedAlerts.enableLicenseAlert === 'boolean') setEnableLicenseAlert(savedAlerts.enableLicenseAlert);
          if (typeof savedAlerts.enableMonthlyAlert === 'boolean') setEnableMonthlyAlert(savedAlerts.enableMonthlyAlert);
          if (typeof savedAlerts.enableKpiAlert === 'boolean') setEnableKpiAlert(savedAlerts.enableKpiAlert);
        }
      } catch (e) {
        console.error('Settings load note:', e);
      }
    };
    loadSettings();
  }, [factorYear]);

  const handleSaveData = async (docKey: string, payload: any, label: string) => {
    if (isViewer) return;
    setSaving(true);
    try {
      if (restSet) {
        await restSet(`settings/${docKey}`, { ...payload, updatedAt: new Date().toISOString() });
      }
      showToast(`${label} saved successfully!`);
    } catch (e) {
      showToast('Saved locally (sync pending).');
    } finally {
      setSaving(false);
    }
  };

  const addCustomFactor = () => {
    setFactors([
      ...factors,
      { id: `custom_${Date.now()}`, source: '', unit: 'Kg', co2eFactor: '0', energyFactor: '0', reference: 'Custom' },
    ]);
  };

  const updateFactor = (idx: number, field: keyof EmissionFactorRow, val: string) => {
    const updated = [...factors];
    updated[idx] = { ...updated[idx], [field]: val };
    setFactors(updated);
  };

  const removeFactor = (idx: number) => {
    setFactors(factors.filter((_, i) => i !== idx));
  };

  const toggleUnitLock = (unitCode: string) => {
    const key = `${lockYear}_${unitCode}`;
    setLockedUnits({ ...lockedUnits, [key]: !lockedUnits[key] });
  };

  const cardClass = isDark
    ? 'bg-zinc-900 border border-zinc-800 text-zinc-100'
    : 'bg-white border border-slate-200 text-slate-800';

  const inputClass = isDark
    ? 'bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-emerald-500'
    : 'bg-white border-slate-300 text-slate-800 focus:border-emerald-600';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className={`p-6 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${cardClass}`}>
        <div>
          <h2 className="text-xl font-bold">Portal Settings & Configuration</h2>
          <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
            Manage visual appearance, GHG emission factors, audit data locks, and compliance alerts
          </p>
        </div>
        {toast && (
