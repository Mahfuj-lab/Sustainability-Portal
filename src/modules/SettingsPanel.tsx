import React, { useMemo, useState, useEffect, useRef } from 'react';
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

/* ------------------------------------------------------------------ */
/* Group Logo, Unit Stamp Seal & Digital Signature Manager (types)     */
/* ------------------------------------------------------------------ */

export interface SignatoryInfo {
  name: string;
  designation: string;
  signatureUrl: string;
}

export interface UnitSignatoryRecord {
  stampUrl: string;
  preparedBy: SignatoryInfo;
  checkedBy: SignatoryInfo;
  approvedBy: SignatoryInfo;
}

export type UnitSignatoriesConfig = Record<string, UnitSignatoryRecord>;

const LOGO_STORAGE_KEY = 'corporate_brand_logo';
const DEFAULT_LOGO_URL = '/epyllion-logo.png';
const SIGNATORIES_STORAGE_KEY = 'unit_signatories_config';
const CUSTOM_UNIT_OPTION = '__custom_unit__';
const MAX_IMAGE_UPLOAD_BYTES = 8 * 1024 * 1024;

const emptySignatory = (): SignatoryInfo => ({ name: '', designation: '', signatureUrl: '' });

const emptyUnitRecord = (): UnitSignatoryRecord => ({
  stampUrl: '',
  preparedBy: emptySignatory(),
  checkedBy: emptySignatory(),
  approvedBy: emptySignatory(),
});

function normalizeSignatory(value: unknown): SignatoryInfo {
  const obj = (value && typeof value === 'object' ? value : {}) as Partial<SignatoryInfo>;
  return {
    name: typeof obj.name === 'string' ? obj.name : '',
    designation: typeof obj.designation === 'string' ? obj.designation : '',
    signatureUrl: typeof obj.signatureUrl === 'string' ? obj.signatureUrl : '',
  };
}

function normalizeUnitRecord(value: unknown): UnitSignatoryRecord {
  const obj = (value && typeof value === 'object' ? value : {}) as Partial<UnitSignatoryRecord>;
  return {
    stampUrl: typeof obj.stampUrl === 'string' ? obj.stampUrl : '',
    preparedBy: normalizeSignatory(obj.preparedBy),
    checkedBy: normalizeSignatory(obj.checkedBy),
    approvedBy: normalizeSignatory(obj.approvedBy),
  };
}

function loadUnitSignatories(): UnitSignatoriesConfig {
  try {
    const raw = localStorage.getItem(SIGNATORIES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const result: UnitSignatoriesConfig = {};
    Object.keys(parsed).forEach((code) => {
      result[code] = normalizeUnitRecord((parsed as Record<string, unknown>)[code]);
    });
    return result;
  } catch (e) {
    console.error('Failed to load unit signatories', e);
    return {};
  }
}

function loadBrandLogo(): string {
  try {
    const stored = localStorage.getItem(LOGO_STORAGE_KEY);
    if (stored && stored.length > 0) return stored;
  } catch (e) {
    console.error('Failed to load brand logo', e);
  }
  return DEFAULT_LOGO_URL;
}

function isUnitConfigured(rec: UnitSignatoryRecord | undefined): boolean {
  if (!rec) return false;
  const hasSignatory = (s: SignatoryInfo) => Boolean(s.name.trim() || s.designation.trim() || s.signatureUrl);
  return Boolean(rec.stampUrl) || hasSignatory(rec.preparedBy) || hasSignatory(rec.checkedBy) || hasSignatory(rec.approvedBy);
}

/**
 * UNIT_DIRECTORY may be an array of strings, an array of objects
 * ({ code, name }), or an object keyed by unit code. Normalise all shapes.
 */
function extractUnitEntries(dir: unknown): Array<{ code: string; name: string }> {
  const out: Array<{ code: string; name: string }> = [];
  const pushEntry = (code: unknown, name: unknown) => {
    if (typeof code === 'string' && code.trim()) {
      out.push({ code: code.trim(), name: typeof name === 'string' ? name : '' });
    }
  };
  if (Array.isArray(dir)) {
    dir.forEach((item) => {
      if (typeof item === 'string') {
        pushEntry(item, '');
      } else if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>;
        pushEntry(o.code ?? o.unitCode ?? o.id ?? o.key, o.name ?? o.unitName ?? o.fullName ?? o.label);
      }
    });
  } else if (dir && typeof dir === 'object') {
    Object.entries(dir as Record<string, unknown>).forEach(([key, val]) => {
      if (typeof val === 'string') {
        pushEntry(key, val);
      } else if (val && typeof val === 'object') {
        const o = val as Record<string, unknown>;
        pushEntry(o.code ?? o.unitCode ?? key, o.name ?? o.unitName ?? o.fullName ?? o.label);
      } else {
        pushEntry(key, '');
      }
    });
  }
  const seen = new Set<string>();
  return out.filter((e) => {
    if (seen.has(e.code)) return false;
    seen.add(e.code);
    return true;
  });
}

/**
 * Reads an image file, scales it down (keeping aspect ratio) to maxWidth
 * using an HTML5 Canvas, and returns a Base64 Data URL.
 * PNG inputs stay PNG so transparency (stamps, signatures) is preserved.
 */
function compressImageToDataUrl(file: File, maxWidth: number, forcePng = false): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpe?g)$/i.test(file.type)) {
      reject(new Error('Only PNG or JPG images are supported.'));
      return;
    }
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      reject(new Error('Image is too large. Choose a file under 8 MB.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('The selected file is not a valid image.'));
      img.onload = () => {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Image processing is not supported in this browser.'));
          return;
        }
        const keepPng = forcePng || /png/i.test(file.type);
        if (!keepPng) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(keepPng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

interface ImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (dataUrl: string) => void;
  disabled?: boolean;
  hint?: string;
  maxWidth?: number;
  forcePng?: boolean;
  accept?: string;
  previewHeightClass?: string;
}

function ImageUploadField({
  label,
  value,
  onChange,
  disabled = false,
  hint,
  maxWidth = 300,
  forcePng = false,
  accept = 'image/png,image/jpeg',
  previewHeightClass = 'h-24',
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string>('');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataUrl(file, maxWidth, forcePng);
      setError('');
      onChange(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    }
  };

  return (
    <div>
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <div
        className={
          'mt-1 flex items-center justify-center rounded-md border border-dashed border-slate-300 overflow-hidden ' +
          previewHeightClass
        }
        style={{
          backgroundColor: '#ffffff',
          backgroundImage:
            'linear-gradient(45deg, #f1f5f9 25%, transparent 25%), linear-gradient(-45deg, #f1f5f9 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f1f5f9 75%), linear-gradient(-45deg, transparent 75%, #f1f5f9 75%)',
          backgroundSize: '12px 12px',
          backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0',
        }}
      >
        {value ? (
          <img src={value} alt={label} className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="text-xs text-slate-400">No image uploaded</span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFile}
          disabled={disabled}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="px-3 py-1.5 text-xs font-semibold rounded-md border border-emerald-500 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {value ? 'Replace image' : 'Upload image'}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => {
              setError('');
              onChange('');
            }}
            disabled={disabled}
            className="px-3 py-1.5 text-xs font-semibold rounded-md border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Remove
          </button>
        )}
      </div>
      {hint && !error && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

interface SignatoryEditorProps {
  title: string;
  value: SignatoryInfo;
  onChange: (next: SignatoryInfo) => void;
  disabled?: boolean;
}

function SignatoryEditor({ title, value, onChange, disabled = false }: SignatoryEditorProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">{title}</h4>
      <div className="space-y-3">
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Full Name</span>
          <input
            type="text"
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            disabled={disabled}
            placeholder="e.g. Md. Rahim Uddin"
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:border-emerald-500 disabled:bg-slate-50"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Designation</span>
          <input
            type="text"
            value={value.designation}
            onChange={(e) => onChange({ ...value, designation: e.target.value })}
            disabled={disabled}
            placeholder="e.g. Sustainability Officer"
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:border-emerald-500 disabled:bg-slate-50"
          />
        </label>
        <ImageUploadField
          label="Signature Image (PNG)"
          value={value.signatureUrl}
          onChange={(url) => onChange({ ...value, signatureUrl: url })}
          disabled={disabled}
          maxWidth={300}
          forcePng
          accept="image/png"
          previewHeightClass="h-20"
          hint="Transparent PNG works best. Auto-compressed to 300px wide."
        />
      </div>
    </div>
  );
}

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

  // Group Logo, Unit Stamp Seal & Digital Signature Manager state
  const directoryEntries = useMemo(() => extractUnitEntries(UNIT_DIRECTORY as unknown), []);
  const [brandLogo, setBrandLogo] = useState<string>(() => loadBrandLogo());
  const [logoNotice, setLogoNotice] = useState<string>('');
  const [unitConfig, setUnitConfig] = useState<UnitSignatoriesConfig>(() => loadUnitSignatories());
  const [customUnits, setCustomUnits] = useState<string[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<string>(() => {
    const entries = extractUnitEntries(UNIT_DIRECTORY as unknown);
    return entries.length > 0 ? entries[0].code : UNITS[0];
  });
  const [unitDraft, setUnitDraft] = useState<UnitSignatoryRecord>(() => {
    const entries = extractUnitEntries(UNIT_DIRECTORY as unknown);
    const first = entries.length > 0 ? entries[0].code : UNITS[0];
    const cfg = loadUnitSignatories();
    return cfg[first] ? normalizeUnitRecord(cfg[first]) : emptyUnitRecord();
  });
  const [addingCustomUnit, setAddingCustomUnit] = useState<boolean>(false);
  const [customUnitInput, setCustomUnitInput] = useState<string>('');
  const [customUnitError, setCustomUnitError] = useState<string>('');
  const [unitSaved, setUnitSaved] = useState<string>('');
  const [unitSaveError, setUnitSaveError] = useState<string>('');

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

  useEffect(() => {
    if (!logoNotice) return;
    const t = setTimeout(() => setLogoNotice(''), 3000);
    return () => clearTimeout(t);
  }, [logoNotice]);

  useEffect(() => {
    if (!unitSaved) return;
    const t = setTimeout(() => setUnitSaved(''), 3500);
    return () => clearTimeout(t);
  }, [unitSaved]);

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

  // ---- Group Logo handlers ----
  const handleLogoChange = (dataUrl: string): void => {
    if (!dataUrl) {
      handleResetLogo();
      return;
    }
    try {
      localStorage.setItem(LOGO_STORAGE_KEY, dataUrl);
      setBrandLogo(dataUrl);
      setLogoNotice('✓ Group logo saved');
    } catch (e) {
      setLogoNotice('Could not save the logo. Browser storage may be full.');
    }
  };

  const handleResetLogo = (): void => {
    try {
      localStorage.removeItem(LOGO_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to reset logo', e);
    }
    setBrandLogo(DEFAULT_LOGO_URL);
    setLogoNotice('✓ Logo reset to default');
  };

  // ---- Unit stamp & signatory handlers ----
  const unitOptions = useMemo<Array<{ code: string; name: string }>>(() => {
    const list = [...directoryEntries];
    const known = new Set(list.map((e) => e.code));
    [...customUnits, ...Object.keys(unitConfig)].forEach((code) => {
      if (!known.has(code)) {
        known.add(code);
        list.push({ code, name: 'Custom unit' });
      }
    });
    return list;
  }, [directoryEntries, customUnits, unitConfig]);

  const configuredUnits = useMemo<Array<{ code: string; name: string; record: UnitSignatoryRecord }>>(() => {
    return Object.keys(unitConfig)
      .filter((code) => isUnitConfigured(unitConfig[code]))
      .map((code) => {
        const match = unitOptions.find((o) => o.code === code);
        return { code, name: match ? match.name : '', record: unitConfig[code] };
      })
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [unitConfig, unitOptions]);

  const selectUnit = (code: string): void => {
    setSelectedUnit(code);
    setUnitDraft(unitConfig[code] ? normalizeUnitRecord(unitConfig[code]) : emptyUnitRecord());
    setUnitSaved('');
    setUnitSaveError('');
  };

  const handleUnitSelectChange = (value: string): void => {
    if (value === CUSTOM_UNIT_OPTION) {
      setAddingCustomUnit(true);
      setCustomUnitInput('');
      setCustomUnitError('');
      return;
    }
    setAddingCustomUnit(false);
    setCustomUnitError('');
    selectUnit(value);
  };

  const handleConfirmCustomUnit = (): void => {
    const code = customUnitInput.trim().toUpperCase();
    if (!code) {
      setCustomUnitError('Enter a unit code.');
      return;
    }
    if (!/^[A-Z0-9][A-Z0-9 _-]{0,29}$/.test(code)) {
      setCustomUnitError('Use letters, numbers, spaces, hyphens or underscores (max 30 characters).');
      return;
    }
    const exists = unitOptions.some((o) => o.code.toUpperCase() === code);
    if (!exists) {
      setCustomUnits((prev) => [...prev, code]);
    }
    const resolved = unitOptions.find((o) => o.code.toUpperCase() === code)?.code ?? code;
    setAddingCustomUnit(false);
    setCustomUnitError('');
    setCustomUnitInput('');
    selectUnit(resolved);
  };

  const updateSignatory = (
    field: 'preparedBy' | 'checkedBy' | 'approvedBy',
    next: SignatoryInfo
  ): void => {
    setUnitDraft((prev) => ({ ...prev, [field]: next }));
    setUnitSaved('');
  };

  const handleSaveUnitConfig = (): void => {
    if (!selectedUnit) return;
    const nextConfig: UnitSignatoriesConfig = {
      ...unitConfig,
      [selectedUnit]: {
        stampUrl: unitDraft.stampUrl,
        preparedBy: { ...unitDraft.preparedBy, name: unitDraft.preparedBy.name.trim(), designation: unitDraft.preparedBy.designation.trim() },
        checkedBy: { ...unitDraft.checkedBy, name: unitDraft.checkedBy.name.trim(), designation: unitDraft.checkedBy.designation.trim() },
        approvedBy: { ...unitDraft.approvedBy, name: unitDraft.approvedBy.name.trim(), designation: unitDraft.approvedBy.designation.trim() },
      },
    };
    try {
      localStorage.setItem(SIGNATORIES_STORAGE_KEY, JSON.stringify(nextConfig));
      setUnitConfig(nextConfig);
      setUnitSaveError('');
      setUnitSaved(`✓ Stamp & signatures saved for ${selectedUnit}`);
    } catch (e) {
      setUnitSaveError('Could not save. Browser storage may be full — try smaller images.');
    }
  };

  const handleRemoveUnitConfig = (code: string): void => {
    const nextConfig: UnitSignatoriesConfig = { ...unitConfig };
    delete nextConfig[code];
    try {
      localStorage.setItem(SIGNATORIES_STORAGE_KEY, JSON.stringify(nextConfig));
      setUnitConfig(nextConfig);
      if (code === selectedUnit) setUnitDraft(emptyUnitRecord());
      setUnitSaveError('');
      setUnitSaved(`✓ Configuration removed for ${code}`);
    } catch (e) {
      setUnitSaveError('Could not update browser storage.');
    }
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

          {/* Group Logo, Unit Stamp Seal & Digital Signature Manager */}
          <div className="mt-10 border-t border-slate-200 pt-8">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-800">
                Group Logo, Unit Stamp Seal &amp; Digital Signature Manager
              </h2>
              <p className="text-sm text-slate-500">
                Set one logo for the whole group, then add a stamp and signatories for each unit. Everything here is applied to Excel and PDF reports automatically.
              </p>
            </div>

            {/* Part 1: Common Group Logo */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm mb-6">
              <h3 className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">
                Epyllion Group Logo (all units &amp; reports)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <ImageUploadField
                    label="Group Logo (PNG or JPG)"
                    value={brandLogo === DEFAULT_LOGO_URL ? '' : brandLogo}
                    onChange={handleLogoChange}
                    disabled={!canEdit}
                    maxWidth={300}
                    previewHeightClass="h-28"
                    hint="Auto-compressed to a maximum width of 300px."
                  />
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={handleResetLogo}
                      disabled={!canEdit || brandLogo === DEFAULT_LOGO_URL}
                      className="px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Reset to Default Logo
                    </button>
                    {logoNotice && (
                      <span
                        role="status"
                        className={
                          'ml-3 text-xs font-medium ' +
                          (logoNotice.startsWith('✓') ? 'text-emerald-700' : 'text-red-600')
                        }
                      >
                        {logoNotice}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-medium text-slate-600">Live preview</span>
                  <div className="mt-1 rounded-md border border-emerald-200 bg-emerald-50 p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-16 w-32 items-center justify-center rounded border border-slate-200 bg-white p-1">
                        <img
                          src={brandLogo}
                          alt="Epyllion Group Logo preview"
                          className="max-h-full max-w-full object-contain"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
                          }}
                          onLoad={(e) => {
                            (e.currentTarget as HTMLImageElement).style.visibility = 'visible';
                          }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-emerald-800">
                        {brandLogo === DEFAULT_LOGO_URL ? 'Default logo in use' : 'Custom logo in use'}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-emerald-800">
                      This common Group Logo will automatically appear on the TOP-LEFT of all Excel &amp; PDF reports across all units.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Part 2: Unit-wise Stamp Seal & Signatory Manager */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Unit-wise Stamp Seal &amp; Signatories</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Choose a unit, upload its stamp, and add the people who prepare, check and approve its reports.
                  </p>
                </div>
                <label className="block md:w-72">
                  <span className="text-xs font-medium text-slate-600">Unit</span>
                  <select
                    value={addingCustomUnit ? CUSTOM_UNIT_OPTION : selectedUnit}
                    onChange={(e) => handleUnitSelectChange(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {unitOptions.map((u) => (
                      <option key={u.code} value={u.code}>
                        {u.name ? `${u.code} — ${u.name}` : u.code}
                        {isUnitConfigured(unitConfig[u.code]) ? '  ✓' : ''}
                      </option>
                    ))}
                    <option value={CUSTOM_UNIT_OPTION}>+ Add Custom Unit Code</option>
                  </select>
                </label>
              </div>

              {addingCustomUnit && (
                <div className="mb-4 rounded-md border border-dashed border-emerald-400 bg-white p-3">
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">New unit code</span>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={customUnitInput}
                        onChange={(e) => {
                          setCustomUnitInput(e.target.value);
                          setCustomUnitError('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleConfirmCustomUnit();
                          }
                        }}
                        disabled={!canEdit}
                        placeholder="e.g. EXWL"
                        className="w-48 rounded border border-slate-300 px-2 py-1.5 text-sm uppercase focus:outline-none focus:border-emerald-500 disabled:bg-slate-50"
                      />
                      <button
                        type="button"
                        onClick={handleConfirmCustomUnit}
                        disabled={!canEdit}
                        className="px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Add unit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAddingCustomUnit(false);
                          setCustomUnitError('');
                        }}
                        className="px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </label>
                  {customUnitError && <p className="mt-1 text-xs text-red-600">{customUnitError}</p>}
                </div>
              )}

              {!addingCustomUnit && selectedUnit && (
                <>
                  <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">
                      Company Stamp / Seal — {selectedUnit}
                    </h4>
                    <div className="max-w-xs">
                      <ImageUploadField
                        label="Stamp image (transparent PNG or JPG)"
                        value={unitDraft.stampUrl}
                        onChange={(url) => {
                          setUnitDraft((prev) => ({ ...prev, stampUrl: url }));
                          setUnitSaved('');
                        }}
                        disabled={!canEdit}
                        maxWidth={300}
                        previewHeightClass="h-32"
                        hint="Auto-compressed to a maximum width of 300px. PNG keeps transparency."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                    <SignatoryEditor
                      title="Prepared By"
                      value={unitDraft.preparedBy}
                      onChange={(next) => updateSignatory('preparedBy', next)}
                      disabled={!canEdit}
                    />
                    <SignatoryEditor
                      title="Checked By"
                      value={unitDraft.checkedBy}
                      onChange={(next) => updateSignatory('checkedBy', next)}
                      disabled={!canEdit}
                    />
                    <SignatoryEditor
                      title="Approved By"
                      value={unitDraft.approvedBy}
                      onChange={(next) => updateSignatory('approvedBy', next)}
                      disabled={!canEdit}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-3">
                    {unitSaved && (
                      <span
                        role="status"
                        className="text-sm text-emerald-800 font-medium bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full"
                      >
                        {unitSaved}
                      </span>
                    )}
                    {unitSaveError && <span className="text-sm text-red-600">{unitSaveError}</span>}
                    <button
                      type="button"
                      onClick={handleSaveUnitConfig}
                      disabled={!canEdit}
                      className="px-5 py-2 text-sm font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      Save Unit Stamp &amp; Signatures
                    </button>
                  </div>
                  {!canEdit && (
                    <p className="mt-2 text-xs text-amber-600 text-right">
                      Your role ({userRole}) can view but not edit stamps and signatures.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Summary of configured units */}
            <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-slate-800">Configured units</h3>
                <span className="text-xs text-slate-500">
                  {configuredUnits.length} of {unitOptions.length} units set up
                </span>
              </div>
              {configuredUnits.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No unit has a stamp or signatory yet. Pick a unit above and save its details to see it here.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {configuredUnits.map(({ code, name, record }) => {
                    const people: Array<{ label: string; info: SignatoryInfo }> = [
                      { label: 'Prepared', info: record.preparedBy },
                      { label: 'Checked', info: record.checkedBy },
                      { label: 'Approved', info: record.approvedBy },
                    ];
                    return (
                      <li key={code} className="flex flex-wrap items-center justify-between gap-3 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-slate-200 bg-white">
                            {record.stampUrl ? (
                              <img src={record.stampUrl} alt={`${code} stamp`} className="max-h-full max-w-full object-contain" />
                            ) : (
                              <span className="text-[10px] text-slate-400">No stamp</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-800">
                              {code}
                              {name && <span className="ml-2 text-xs font-normal text-slate-500">{name}</span>}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {people.map((p) => {
                                const done = Boolean(p.info.name.trim() || p.info.signatureUrl);
                                return (
                                  <span
                                    key={p.label}
                                    className={
                                      'text-xs px-2 py-0.5 rounded-full border ' +
                                      (done
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                        : 'bg-slate-50 border-slate-200 text-slate-400')
                                    }
                                  >
                                    {p.label}
                                    {p.info.name.trim() ? `: ${p.info.name.trim()}` : done ? '' : ': not set'}
                                    {p.info.signatureUrl ? ' ✍' : ''}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setAddingCustomUnit(false);
                              selectUnit(code);
                            }}
                            className="px-3 py-1.5 text-xs font-semibold rounded-md border border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveUnitConfig(code)}
                            disabled={!canEdit}
                            className="px-3 py-1.5 text-xs font-semibold rounded-md border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
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
