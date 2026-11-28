import React, { useState, useEffect } from 'react';
import { Save, Plus, X, Printer, CheckCircle2, AlertCircle, FileSpreadsheet, Lock } from 'lucide-react';
import { UNIT_DIRECTORY } from '../utils/unitDirectory';
import {
  InventorySaveStatus,
  normalizeNumericInput,
  useHybridAutoSave,
  useInventoryGrid,
} from '../utils/inventoryDataEntry';

export interface BoilerGeneratorCompressorFormProps {
  selectedUnit: string;
  selectedYear: string;
  userRole?: string;
  [key: string]: any;
}

interface MeterItem {
  id: string;
  name: string;
}

interface MonthData {
  genDieselValues: Record<string, string>;
  genRunningHourValues: Record<string, string>;
  genElectricityValues: Record<string, string>;
  boilerDieselValues: Record<string, string>;
  boilerNgValues: Record<string, string>;
  boilerDieselHourValues: Record<string, string>;
  boilerNgHourValues: Record<string, string>;
  boilerSteamValues: Record<string, string>;
  compElecValues: Record<string, string>;
  compRunningHour: string;
  compAir: string;
  remarks: string;
}

type FormData = Record<string, MonthData>;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// ---------------------------------------------------------------------------
// Design system: one theme per section (all class strings are literal so
// Tailwind can detect them).
// ---------------------------------------------------------------------------
interface SectionTheme {
  groupHeader: string; // top group header cell
  subHeader: string;   // name / column header cells
  subHeaderSoft: string; // third-row header cells
  tint: string;        // body column tint
  tintStrong: string;  // body tint for calculated totals column
  locked: string;      // read-only locked / calculated box
  footer: string;      // footer cells
  footerStrong: string;
  input: string;       // editable input focus styling
  nameInput: string;   // header name input focus styling
}

const THEMES: Record<'generator' | 'boiler' | 'compressor' | 'remarks', SectionTheme> = {
  generator: {
    groupHeader: 'bg-emerald-200 text-emerald-900 border-emerald-300',
    subHeader: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    subHeaderSoft: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    tint: 'bg-emerald-50/70',
    tintStrong: 'bg-emerald-100/70',
    locked: 'bg-emerald-100 border-emerald-300 text-emerald-900',
    footer: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    footerStrong: 'bg-emerald-200 text-emerald-950 border-emerald-300',
    input: 'focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200',
    nameInput: 'focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200',
  },
  boiler: {
    groupHeader: 'bg-sky-200 text-sky-900 border-sky-300',
    subHeader: 'bg-sky-100 text-sky-900 border-sky-200',
    subHeaderSoft: 'bg-sky-50 text-sky-800 border-sky-200',
    tint: 'bg-sky-50/70',
    tintStrong: 'bg-sky-100/70',
    locked: 'bg-sky-100 border-sky-300 text-sky-900',
    footer: 'bg-sky-50 text-sky-900 border-sky-200',
    footerStrong: 'bg-sky-200 text-sky-950 border-sky-300',
    input: 'focus:border-sky-600 focus:ring-2 focus:ring-sky-200',
    nameInput: 'focus:border-sky-600 focus:ring-2 focus:ring-sky-200',
  },
  compressor: {
    groupHeader: 'bg-amber-200 text-amber-900 border-amber-300',
    subHeader: 'bg-amber-100 text-amber-900 border-amber-200',
    subHeaderSoft: 'bg-amber-50 text-amber-800 border-amber-200',
    tint: 'bg-amber-50/70',
    tintStrong: 'bg-amber-100/70',
    locked: 'bg-amber-100 border-amber-300 text-amber-900',
    footer: 'bg-amber-50 text-amber-900 border-amber-200',
    footerStrong: 'bg-amber-200 text-amber-950 border-amber-300',
    input: 'focus:border-amber-600 focus:ring-2 focus:ring-amber-200',
    nameInput: 'focus:border-amber-600 focus:ring-2 focus:ring-amber-200',
  },
  remarks: {
    groupHeader: 'bg-slate-200 text-slate-800 border-slate-300',
    subHeader: 'bg-slate-100 text-slate-800 border-slate-200',
    subHeaderSoft: 'bg-slate-50 text-slate-700 border-slate-200',
    tint: 'bg-slate-50/80',
    tintStrong: 'bg-slate-100/80',
    locked: 'bg-slate-100 border-slate-300 text-slate-800',
    footer: 'bg-slate-50 text-slate-700 border-slate-200',
    footerStrong: 'bg-slate-200 text-slate-900 border-slate-300',
    input: 'focus:border-slate-500 focus:ring-2 focus:ring-slate-200',
    nameInput: 'focus:border-slate-500 focus:ring-2 focus:ring-slate-200',
  },
};

const INPUT_BASE =
  'w-full min-w-[4.5rem] border border-slate-300 bg-white rounded px-2 py-1 text-right text-xs text-slate-800 outline-none transition disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed';

const NAME_INPUT_BASE =
  'w-full border border-slate-300 bg-white rounded px-2 py-1 text-center text-xs font-semibold text-slate-800 outline-none transition disabled:bg-transparent disabled:border-transparent disabled:text-slate-800';

const LOCKED_BASE =
  'w-full min-w-[4.5rem] px-2 py-1 text-right text-xs font-bold rounded border flex items-center justify-end gap-1';

const CELL = 'px-1.5 py-1.5 border-b border-r border-slate-200';
const TH = 'px-2 py-2 border-b border-r text-center text-xs font-semibold whitespace-nowrap';

const n = (val: any): number => {
  const num = parseFloat(val);
  return isNaN(num) ? 0 : num;
};

const fmt = (val: number, decimals: number = 2): string => {
  return val.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const getEmptyMonth = (): MonthData => ({
  genDieselValues: {},
  genRunningHourValues: {},
  genElectricityValues: {},
  boilerDieselValues: {},
  boilerNgValues: {},
  boilerDieselHourValues: {},
  boilerNgHourValues: {},
  boilerSteamValues: {},
  compElecValues: {},
  compRunningHour: '',
  compAir: '',
  remarks: '',
});

const getUnitInfo = (code: string) => {
  const fallback = { fullName: code || 'Unknown Unit', address: 'Dhaka, Bangladesh' };
  if (!code) return fallback;

  try {
    const dir = UNIT_DIRECTORY as any;
    if (Array.isArray(dir)) {
      const found = dir.find((u: any) => u && (u.code === code || u.id === code));
      if (found) {
        return {
          fullName: found.fullName || found.name || code,
          address: found.address || 'Dhaka, Bangladesh',
        };
      }
    } else if (dir && typeof dir === 'object') {
      const found = dir[code];
      if (found) {
        return {
          fullName: found.fullName || found.name || code,
          address: found.address || 'Dhaka, Bangladesh',
        };
      }
    }
  } catch (e) {
    console.error('UNIT_DIRECTORY lookup failed', e);
  }
  return fallback;
};

export default function BoilerGeneratorCompressorForm({
  selectedUnit,
  selectedYear,
  userRole,
  restGet,
  restSet,
}: BoilerGeneratorCompressorFormProps) {
  const isViewer = userRole === 'viewer';
  const safeUnit = selectedUnit || 'UNKNOWN';
  const safeYear = selectedYear || '2025';
  const storageKey = `boiler_gen_comp_${safeUnit}_${safeYear}`;
  const ngDieselKey = `ng_diesel_veh_${safeUnit}_${safeYear}`;
  const elecSolarKey = `elec_solar_${safeUnit}_${safeYear}`;
  const unitInfo = getUnitInfo(safeUnit);

  const [generators, setGenerators] = useState<MeterItem[]>([
    { id: 'g1', name: 'Generator 1' },
    { id: 'g2', name: 'Generator 2' },
  ]);

  const [boilers, setBoilers] = useState<MeterItem[]>([
    { id: 'b1', name: 'Boiler 1' },
    { id: 'b2', name: 'Boiler 2' },
  ]);

  const [compressors, setCompressors] = useState<MeterItem[]>([
    { id: 'c1', name: 'Compressor 1' },
    { id: 'c2', name: 'Compressor 2' },
  ]);

  const [data, setData] = useState<FormData>({});
  const [isSaved, setIsSaved] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ ngDiesel: false, elecSolar: false });
  const [loadedKey, setLoadedKey] = useState('');
  const { gridHandlers, gridError, reportGridError } = useInventoryGrid();
  const { status, error, saveNow } = useHybridAutoSave({
    unit: safeUnit,
    year: safeYear,
    moduleId: 'boiler_gen_comp',
    storageKey,
    payload: { compressors, data },
    restGet,
    restSet,
    enabled: !isViewer,
    ready: loadedKey === storageKey,
  });

  const [sections, setSections] = useState({
    generator: true,
    boiler: true,
    compressor: true,
    remarks: true,
  });

  useEffect(() => {
    let loadedGenerators: MeterItem[] = [];
    let loadedBoilers: MeterItem[] = [];
    let storedNgDiesel: any = null;
    let loadedElecSolar: any = null;

    try {
      const rawNgDiesel = localStorage.getItem(ngDieselKey);
      if (rawNgDiesel) {
        storedNgDiesel = JSON.parse(rawNgDiesel);
        if (storedNgDiesel && Array.isArray(storedNgDiesel.generators) && storedNgDiesel.generators.length > 0) {
          loadedGenerators = storedNgDiesel.generators.map((g: any) => ({ id: g.id, name: g.name || 'Generator' }));
        }
        if (storedNgDiesel && Array.isArray(storedNgDiesel.boilers) && storedNgDiesel.boilers.length > 0) {
          loadedBoilers = storedNgDiesel.boilers.map((b: any) => ({ id: b.id, name: b.name || 'Boiler' }));
        }
        setSyncStatus(prev => ({ ...prev, ngDiesel: true }));
      }
    } catch (e) {
      console.error('Failed to load NG/Diesel sync data', e);
    }

    try {
      const rawElec = localStorage.getItem(elecSolarKey);
      if (rawElec) {
        loadedElecSolar = JSON.parse(rawElec);
        setSyncStatus(prev => ({ ...prev, elecSolar: true }));
      }
    } catch (e) {
      console.error('Failed to load Electricity sync data', e);
    }

    if (loadedGenerators.length === 0) {
      loadedGenerators = [{ id: 'g1', name: 'Generator 1' }, { id: 'g2', name: 'Generator 2' }];
    }
    if (loadedBoilers.length === 0) {
      loadedBoilers = [{ id: 'b1', name: 'Boiler 1' }, { id: 'b2', name: 'Boiler 2' }];
    }

    setGenerators(loadedGenerators);
    setBoilers(loadedBoilers);

    // Load own data
    let parsedOwn: any = null;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        parsedOwn = JSON.parse(stored);
        
        if (parsedOwn && Array.isArray(parsedOwn.compressors) && parsedOwn.compressors.length > 0) {
          setCompressors(parsedOwn.compressors);
        } else {
          setCompressors([{ id: 'c1', name: 'Compressor 1' }, { id: 'c2', name: 'Compressor 2' }]);
        }

        if (parsedOwn && parsedOwn.data && typeof parsedOwn.data === 'object') {
          const validatedData: FormData = {};
          MONTHS.forEach(m => {
            const rawMonth = parsedOwn.data[m];
            validatedData[m] = rawMonth && typeof rawMonth === 'object' 
              ? {
                  genDieselValues: rawMonth.genDieselValues || {},
                  genRunningHourValues: rawMonth.genRunningHourValues || {},
                  genElectricityValues: rawMonth.genElectricityValues || {},
                  boilerDieselValues: rawMonth.boilerDieselValues || {},
                  boilerNgValues: rawMonth.boilerNgValues || {},
                  boilerDieselHourValues: rawMonth.boilerDieselHourValues || {},
                  boilerNgHourValues: rawMonth.boilerNgHourValues || {},
                  boilerSteamValues: rawMonth.boilerSteamValues || {},
                  compElecValues: rawMonth.compElecValues || {},
                  compRunningHour: rawMonth.compRunningHour || '',
                  compAir: rawMonth.compAir || '',
                  remarks: rawMonth.remarks || '',
                }
              : getEmptyMonth();
          });
          setData(validatedData);
        } else {
          const initialData: FormData = {};
          MONTHS.forEach(m => { initialData[m] = getEmptyMonth(); });
          setData(initialData);
        }
      } else {
        const initialData: FormData = {};
        MONTHS.forEach(m => { initialData[m] = getEmptyMonth(); });
        setData(initialData);
      }
    } catch (e) {
      console.error('Failed to load own local storage', e);
      const initialData: FormData = {};
      MONTHS.forEach(m => { initialData[m] = getEmptyMonth(); });
      setData(initialData);
    }

    // Merge cross-module data
    if (loadedGenerators.length > 0 && loadedBoilers.length > 0) {
      try {
        const initialData: FormData = {};
        MONTHS.forEach(m => { initialData[m] = getEmptyMonth(); });
        
        MONTHS.forEach(m => {
          const ownMonth = parsedOwn?.data?.[m] || {};
          
          loadedGenerators.forEach(g => {
            let genDiesel = '';
            let genElec = '';
            if (storedNgDiesel && storedNgDiesel.data?.[m]?.genDieselValues?.[g.id]) {
              genDiesel = storedNgDiesel.data[m].genDieselValues[g.id];
            }
            if (loadedElecSolar && loadedElecSolar.data?.[m]?.generators?.[g.id]) {
              genElec = loadedElecSolar.data[m].generators[g.id];
            }
            
            if (!ownMonth.genDieselValues?.[g.id] && genDiesel) {
              initialData[m].genDieselValues[g.id] = genDiesel;
            } else if (ownMonth.genDieselValues?.[g.id]) {
              initialData[m].genDieselValues[g.id] = ownMonth.genDieselValues[g.id];
            }
            
            if (!ownMonth.genElectricityValues?.[g.id] && genElec) {
              initialData[m].genElectricityValues[g.id] = genElec;
            } else if (ownMonth.genElectricityValues?.[g.id]) {
              initialData[m].genElectricityValues[g.id] = ownMonth.genElectricityValues[g.id];
            }
            
            if (ownMonth.genRunningHourValues?.[g.id]) {
              initialData[m].genRunningHourValues[g.id] = ownMonth.genRunningHourValues[g.id];
            }
          });
          
          loadedBoilers.forEach(b => {
            let bDiesel = '';
            if (storedNgDiesel && storedNgDiesel.data?.[m]?.boilerDieselValues?.[b.id]) {
              bDiesel = storedNgDiesel.data[m].boilerDieselValues[b.id];
            }
            if (!ownMonth.boilerDieselValues?.[b.id] && bDiesel) {
              initialData[m].boilerDieselValues[b.id] = bDiesel;
            } else if (ownMonth.boilerDieselValues?.[b.id]) {
              initialData[m].boilerDieselValues[b.id] = ownMonth.boilerDieselValues[b.id];
            }
            
            if (ownMonth.boilerNgValues?.[b.id]) {
              initialData[m].boilerNgValues[b.id] = ownMonth.boilerNgValues[b.id];
            }
            if (ownMonth.boilerDieselHourValues?.[b.id]) {
              initialData[m].boilerDieselHourValues[b.id] = ownMonth.boilerDieselHourValues[b.id];
            }
            if (ownMonth.boilerNgHourValues?.[b.id]) {
              initialData[m].boilerNgHourValues[b.id] = ownMonth.boilerNgHourValues[b.id];
            }
            if (ownMonth.boilerSteamValues?.[b.id]) {
              initialData[m].boilerSteamValues[b.id] = ownMonth.boilerSteamValues[b.id];
            }
          });
          
          if (ownMonth.compRunningHour) initialData[m].compRunningHour = ownMonth.compRunningHour;
          if (ownMonth.compAir) initialData[m].compAir = ownMonth.compAir;
          if (ownMonth.remarks) initialData[m].remarks = ownMonth.remarks;
          
          if (ownMonth.compElecValues && typeof ownMonth.compElecValues === 'object') {
            initialData[m].compElecValues = { ...(ownMonth.compElecValues as Record<string, any>) };
          }
        });
        
        setData(initialData);
      } catch (e) {
        console.error('Failed to merge cross-module data', e);
      }
    }

    setLoadedKey(storageKey);
  }, [storageKey, ngDieselKey, elecSolarKey]);

  const handleSave = () => {
    if (isViewer) return;
    void saveNow().then((saved) => {
      if (!saved) return;
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    });
  };

  const updateMonthField = (month: string, field: keyof MonthData, value: string) => {
    if (isViewer) return;
    if (field !== 'remarks') {
      const normalized = normalizeNumericInput(value);
      if (normalized === null) {
        reportGridError(value.trim().startsWith('-') ? 'Negative value not allowed' : 'Invalid text pasted in numeric cell');
        return;
      }
      value = normalized;
    }
    setData(prev => ({
      ...prev,
      [month]: {
        ...(prev[month] || getEmptyMonth()),
        [field]: value,
      },
    }));
  };

  const updateNestedQty = (month: string, section: keyof MonthData, id: string, value: string) => {
    if (isViewer) return;
    const normalized = normalizeNumericInput(value);
    if (normalized === null) {
      reportGridError(value.trim().startsWith('-') ? 'Negative value not allowed' : 'Invalid text pasted in numeric cell');
      return;
    }
    value = normalized;

    setData(prev => {
      const prevMonth = prev[month] || getEmptyMonth();
      return {
        ...prev,
        [month]: {
          ...prevMonth,
          [section]: {
            ...((prevMonth[section] as any) || {}),
            [id]: value,
          },
        },
      };
    });
  };

  const updateCompressorName = (id: string, name: string) => {
    if (isViewer) return;
    setCompressors(prev => prev.map(c => (c.id === id ? { ...c, name } : c)));
  };

  const addCompressor = () => {
    if (isViewer) return;
    const newId = `c${Date.now()}`;
    setCompressors(prev => [...prev, { id: newId, name: `Compressor ${prev.length + 1}` }]);
  };

  const removeCompressor = (id: string) => {
    if (isViewer) return;
    setCompressors(prev => prev.filter(c => c.id !== id));
  };

  // Calculations
  const getGenDieselTotal = (row: MonthData) => generators.reduce((sum, g) => sum + n(row.genDieselValues?.[g.id]), 0);
  const getGenRunHourTotal = (row: MonthData) => generators.reduce((sum, g) => sum + n(row.genRunningHourValues?.[g.id]), 0);
  const getGenElecTotal = (row: MonthData) => generators.reduce((sum, g) => sum + n(row.genElectricityValues?.[g.id]), 0);
  
  const getGenIntensity = (row: MonthData) => {
    const diesel = getGenDieselTotal(row);
    const elec = getGenElecTotal(row);
    return diesel > 0 ? (elec / diesel).toFixed(3) : '0.000';
  };

  const getBoilerDieselTotal = (row: MonthData) => boilers.reduce((sum, b) => sum + n(row.boilerDieselValues?.[b.id]), 0);
  const getBoilerNgTotal = (row: MonthData) => boilers.reduce((sum, b) => sum + n(row.boilerNgValues?.[b.id]), 0);
  
  const getBoilerTotalRunHour = (row: MonthData, boilerId: string) => {
    return n(row.boilerDieselHourValues?.[boilerId]) + n(row.boilerNgHourValues?.[boilerId]);
  };

  const getCompElecTotal = (row: MonthData) => compressors.reduce((sum, c) => sum + n(row.compElecValues?.[c.id]), 0);

  const getYearlySum = (getter: (m: string, r: MonthData) => number) => {
    return MONTHS.reduce((sum, m) => sum + getter(m, data[m] || getEmptyMonth()), 0);
  };

  const getYearlyGenIntensity = () => {
    const annDiesel = getYearlySum((m, r) => getGenDieselTotal(r));
    const annElec = getYearlySum((m, r) => getGenElecTotal(r));
    return annDiesel > 0 ? (annElec / annDiesel).toFixed(3) : '0.000';
  };

  const generateHTMLTemplate = (isPrint: boolean = false) => {
    const title = `Boiler, Generator & Compressor Report`;
    const logoHtml = `<img src="/epyllion-logo.png" alt="Epyllion" style="height: 40px; margin-bottom: 10px;" onerror="this.style.display='none'" />`;

    const letterhead = `
      <div style="text-align: center; margin-bottom: 20px;">
        ${logoHtml}
        <h1 style="color: #065f46; margin: 0; font-size: 24px;">Epyllion Group</h1>
        <h2 style="margin: 5px 0; font-size: 18px;">${unitInfo.fullName}</h2>
        <p style="margin: 0; font-size: 12px; color: #555;">${unitInfo.address}</p>
        <p style="margin: 8px 0 2px 0; font-size: 14px; font-weight: bold;">${title}</p>
        <p style="margin: 0; font-size: 12px; font-weight: bold; color: #065f46;">Reporting Year: ${safeYear}</p>
      </div>
    `;

    let headerRow1 = `<tr><th rowSpan="3" style="border: 1px solid #000; padding: 5px; background-color: #f3f4f6;">Month</th>`;
    let headerRow2 = `<tr>`;
    let headerRow3 = `<tr>`;

    if (sections.generator) {
      headerRow1 += `<th colspan="${generators.length * 3 + 4}" style="border: 1px solid #000; padding: 5px; background-color: #d1fae5; text-align: center; font-weight: bold;">GENERATOR DATA</th>`;
      generators.forEach(g => {
        headerRow2 += `<th colspan="3" style="border: 1px solid #000; padding: 5px; background-color: #d1fae5; text-align: center; font-size: 11px;">${g.name}</th>`;
      });
      headerRow2 += `<th rowSpan="2" style="border: 1px solid #000; padding: 5px; background-color: #d1fae5; text-align: center; font-size: 11px;">Total Diesel</th>`;
      headerRow2 += `<th rowSpan="2" style="border: 1px solid #000; padding: 5px; background-color: #d1fae5; text-align: center; font-size: 11px;">Total Run Hour</th>`;
      headerRow2 += `<th rowSpan="2" style="border: 1px solid #000; padding: 5px; background-color: #d1fae5; text-align: center; font-size: 11px;">Total Elec (kWh)</th>`;
      headerRow2 += `<th rowSpan="2" style="border: 1px solid #000; padding: 5px; background-color: #d1fae5; text-align: center; font-size: 11px;">Intensity (kWh/L)</th>`;
      
      generators.forEach(() => {
        headerRow3 += `<th style="border: 1px solid #000; padding: 5px; background-color: #d1fae5; text-align: center; font-size: 10px;">Diesel (L)</th>`;
        headerRow3 += `<th style="border: 1px solid #000; padding: 5px; background-color: #d1fae5; text-align: center; font-size: 10px;">Run Hour</th>`;
        headerRow3 += `<th style="border: 1px solid #000; padding: 5px; background-color: #d1fae5; text-align: center; font-size: 10px;">Elec (kWh)</th>`;
      });
    }

    if (sections.boiler) {
      const boilerCols = boilers.length * 6 + 3;
      headerRow1 += `<th colspan="${boilerCols}" style="border: 1px solid #000; padding: 5px; background-color: #dbeafe; text-align: center; font-weight: bold;">BOILER DATA</th>`;
      
      boilers.forEach(b => {
        headerRow2 += `<th colspan="6" style="border: 1px solid #000; padding: 5px; background-color: #dbeafe; text-align: center; font-size: 11px;">${b.name}</th>`;
      });
      headerRow2 += `<th rowSpan="2" style="border: 1px solid #000; padding: 5px; background-color: #dbeafe; text-align: center; font-size: 11px;">Total Diesel (L)</th>`;
      headerRow2 += `<th rowSpan="2" style="border: 1px solid #000; padding: 5px; background-color: #dbeafe; text-align: center; font-size: 11px;">Total NG (m³)</th>`;
      headerRow2 += `<th rowSpan="2" style="border: 1px solid #000; padding: 5px; background-color: #dbeafe; text-align: center; font-size: 11px;">Total Steam</th>`;
      
      boilers.forEach(() => {
        headerRow3 += `<th style="border: 1px solid #000; padding: 5px; background-color: #dbeafe; text-align: center; font-size: 10px;">Diesel (L)</th>`;
        headerRow3 += `<th style="border: 1px solid #000; padding: 5px; background-color: #dbeafe; text-align: center; font-size: 10px;">NG (m³)</th>`;
        headerRow3 += `<th style="border: 1px solid #000; padding: 5px; background-color: #dbeafe; text-align: center; font-size: 10px;">Diesel Hour</th>`;
        headerRow3 += `<th style="border: 1px solid #000; padding: 5px; background-color: #dbeafe; text-align: center; font-size: 10px;">NG Hour</th>`;
        headerRow3 += `<th style="border: 1px solid #000; padding: 5px; background-color: #dbeafe; text-align: center; font-size: 10px;">Total Hour</th>`;
        headerRow3 += `<th style="border: 1px solid #000; padding: 5px; background-color: #dbeafe; text-align: center; font-size: 10px;">Steam</th>`;
      });
    }

    if (sections.compressor) {
      const compCols = compressors.length + 3;
      headerRow1 += `<th colspan="${compCols}" style="border: 1px solid #000; padding: 5px; background-color: #fef3c7; text-align: center; font-weight: bold;">COMPRESSOR</th>`;
      
      compressors.forEach(c => {
        headerRow2 += `<th rowSpan="2" style="border: 1px solid #000; padding: 5px; background-color: #fef3c7; text-align: center; font-size: 11px;">${c.name}</th>`;
      });
      headerRow2 += `<th rowSpan="2" style="border: 1px solid #000; padding: 5px; background-color: #fef3c7; text-align: center; font-size: 11px;">Total Elec (kWh)</th>`;
      headerRow2 += `<th rowSpan="2" style="border: 1px solid #000; padding: 5px; background-color: #fef3c7; text-align: center; font-size: 11px;">Run Hour</th>`;
      headerRow2 += `<th rowSpan="2" style="border: 1px solid #000; padding: 5px; background-color: #fef3c7; text-align: center; font-size: 11px;">Total Air</th>`;
    }

    if (sections.remarks) {
      headerRow1 += `<th rowSpan="3" style="border: 1px solid #000; padding: 5px; background-color: #f3f4f6; text-align: center; font-weight: bold;">REMARKS</th>`;
    }

    headerRow1 += `</tr>`;
    headerRow2 += `</tr>`;
    headerRow3 += `</tr>`;
    
    const hasRow3 = sections.generator || sections.boiler;
    const tableHeadersHtml = headerRow1 + headerRow2 + (hasRow3 ? headerRow3 : '');

    let tbody = '';
    MONTHS.forEach(m => {
      const row = data[m] || getEmptyMonth();
      tbody += `<tr><td style="border: 1px solid #000; padding: 5px; font-weight: bold; font-size: 11px;">${m}</td>`;

      if (sections.generator) {
        generators.forEach(g => {
          tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px; background-color: #f9fafb;">${fmt(n(row.genDieselValues?.[g.id]), 2)}</td>`;
          tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(n(row.genRunningHourValues?.[g.id]), 2)}</td>`;
          tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px; background-color: #f9fafb;">${fmt(n(row.genElectricityValues?.[g.id]), 2)}</td>`;
        });
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-size: 11px; background-color: #f3f4f6;">${fmt(getGenDieselTotal(row), 2)}</td>`;
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-size: 11px; background-color: #f3f4f6;">${fmt(getGenRunHourTotal(row), 2)}</td>`;
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-size: 11px; background-color: #f3f4f6;">${fmt(getGenElecTotal(row), 2)}</td>`;
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-size: 11px; background-color: #f3f4f6;">${getGenIntensity(row)}</td>`;
      }

      if (sections.boiler) {
        boilers.forEach(b => {
          tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px; background-color: #f9fafb;">${fmt(n(row.boilerDieselValues?.[b.id]), 2)}</td>`;
          tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(n(row.boilerNgValues?.[b.id]), 2)}</td>`;
          tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(n(row.boilerDieselHourValues?.[b.id]), 2)}</td>`;
          tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(n(row.boilerNgHourValues?.[b.id]), 2)}</td>`;
          tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-size: 11px; background-color: #f3f4f6;">${fmt(getBoilerTotalRunHour(row, b.id), 2)}</td>`;
          tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(n(row.boilerSteamValues?.[b.id]), 2)}</td>`;
        });
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-size: 11px; background-color: #f3f4f6;">${fmt(getBoilerDieselTotal(row), 2)}</td>`;
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-size: 11px; background-color: #f3f4f6;">${fmt(getBoilerNgTotal(row), 2)}</td>`;
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-size: 11px; background-color: #f3f4f6;">${fmt(boilers.reduce((s, b) => s + n(row.boilerSteamValues?.[b.id]), 0), 2)}</td>`;
      }

      if (sections.compressor) {
        compressors.forEach(c => {
          tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(n(row.compElecValues?.[c.id]), 2)}</td>`;
        });
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-size: 11px; background-color: #f3f4f6;">${fmt(getCompElecTotal(row), 2)}</td>`;
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(n(row.compRunningHour), 2)}</td>`;
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(n(row.compAir), 2)}</td>`;
      }

      if (sections.remarks) {
        tbody += `<td style="border: 1px solid #000; padding: 5px; font-size: 11px;">${row.remarks || ''}</td>`;
      }
      tbody += `</tr>`;
    });

    let tfoot = '<tr style="background-color: #f3f4f6; font-weight: bold;"><td style="border: 1px solid #000; padding: 5px; font-size: 11px;">Total</td>';

    if (sections.generator) {
      generators.forEach(g => {
        let sumDiesel = 0, sumHour = 0, sumElec = 0;
        MONTHS.forEach(m => {
          sumDiesel += n(data[m]?.genDieselValues?.[g.id]);
          sumHour += n(data[m]?.genRunningHourValues?.[g.id]);
          sumElec += n(data[m]?.genElectricityValues?.[g.id]);
        });
        tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(sumDiesel, 2)}</td>`;
        tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(sumHour, 2)}</td>`;
        tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(sumElec, 2)}</td>`;
      });
      tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum((m, r) => getGenDieselTotal(r)), 2)}</td>`;
      tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum((m, r) => getGenRunHourTotal(r)), 2)}</td>`;
      tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum((m, r) => getGenElecTotal(r)), 2)}</td>`;
      tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${getYearlyGenIntensity()}</td>`;
    }

    if (sections.boiler) {
      boilers.forEach(b => {
        let sumDiesel = 0, sumNg = 0, sumDieselHour = 0, sumNgHour = 0, sumTotalHour = 0, sumSteam = 0;
        MONTHS.forEach(m => {
          const r = data[m] || getEmptyMonth();
          sumDiesel += n(r.boilerDieselValues?.[b.id]);
          sumNg += n(r.boilerNgValues?.[b.id]);
          sumDieselHour += n(r.boilerDieselHourValues?.[b.id]);
          sumNgHour += n(r.boilerNgHourValues?.[b.id]);
          sumTotalHour += getBoilerTotalRunHour(r, b.id);
          sumSteam += n(r.boilerSteamValues?.[b.id]);
        });
        tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(sumDiesel, 2)}</td>`;
        tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(sumNg, 2)}</td>`;
        tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(sumDieselHour, 2)}</td>`;
        tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(sumNgHour, 2)}</td>`;
        tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(sumTotalHour, 2)}</td>`;
        tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(sumSteam, 2)}</td>`;
      });
      tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum((m, r) => getBoilerDieselTotal(r)), 2)}</td>`;
      tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum((m, r) => getBoilerNgTotal(r)), 2)}</td>`;
      tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum((m, r) => boilers.reduce((s, b) => s + n(r.boilerSteamValues?.[b.id]), 0)), 2)}</td>`;
    }

    if (sections.compressor) {
      compressors.forEach(c => {
        let sum = 0;
        MONTHS.forEach(m => { sum += n(data[m]?.compElecValues?.[c.id]); });
        tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(sum, 2)}</td>`;
      });
      tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum((m, r) => getCompElecTotal(r)), 2)}</td>`;
      tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum((m, r) => n(r.compRunningHour)), 2)}</td>`;
      tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum((m, r) => n(r.compAir)), 2)}</td>`;
    }

    if (sections.remarks) {
      tfoot += `<td style="border: 1px solid #000; padding: 5px; font-size: 11px;">-</td>`;
    }
    tfoot += '</tr>';

    const signatureBlock = isPrint ? `
      <div style="display: flex; justify-content: space-between; margin-top: 70px; page-break-inside: avoid;">
        <div style="width: 30%; text-align: center;">
          <div style="border-top: 1px solid #333; padding-top: 6px; font-size: 11px; font-weight: bold;">Prepared By</div>
        </div>
        <div style="width: 30%; text-align: center;">
          <div style="border-top: 1px solid #333; padding-top: 6px; font-size: 11px; font-weight: bold;">Checked By</div>
        </div>
        <div style="width: 30%; text-align: center;">
          <div style="border-top: 1px solid #333; padding-top: 6px; font-size: 11px; font-weight: bold;">Approved By</div>
        </div>
      </div>
    ` : '';

    return `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <title>Boiler, Generator & Compressor - ${safeUnit} - ${safeYear}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { border-collapse: collapse; width: 100%; font-size: 11px; }
          th, td { border: 1px solid #000; padding: 4px; }
          ${isPrint ? `
          @media print {
            @page { size: A4 landscape; margin: 10mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 0; }
          }
          ` : ''}
        </style>
      </head>
      <body>
        ${letterhead}
        <table>
          <thead>${tableHeadersHtml}</thead>
          <tbody>${tbody}</tbody>
          <tfoot>${tfoot}</tfoot>
        </table>
        ${signatureBlock}
      </body>
      </html>
    `;
  };

  const handleExport = () => {
    const html = generateHTMLTemplate(false);
    const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Boiler_Generator_Compressor_${safeUnit}_${safeYear}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const html = generateHTMLTemplate(true);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } else {
      alert('Please allow pop-ups to print the report.');
    }
  };

  // -------------------------------------------------------------------------
  // Render helpers (presentation only)
  // -------------------------------------------------------------------------
  const G = THEMES.generator;
  const B = THEMES.boiler;
  const C = THEMES.compressor;
  const R = THEMES.remarks;

  const lockedBox = (t: SectionTheme, content: React.ReactNode, withIcon: boolean = false) => (
    <div className={`${LOCKED_BASE} ${t.locked}`}>
      {content}
      {withIcon && <Lock size={10} className="opacity-60 shrink-0" />}
    </div>
  );

  const numInput = (
    t: SectionTheme,
    value: string,
    onChange: (v: string) => void,
  ) => (
    <input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={isViewer}
      className={`${INPUT_BASE} ${t.input}`}
    />
  );

  return (
    <div {...gridHandlers} className="w-full max-w-[95vw] mx-auto p-4 sm:p-6 bg-white rounded-2xl shadow-md border border-slate-200">
      {/* Page header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Boiler, Generator &amp; Compressor</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p className="text-sm text-slate-500">{unitInfo.fullName}</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Reporting Year: {safeYear}
            </span>
            {syncStatus.ngDiesel && syncStatus.elecSolar ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                <CheckCircle2 size={12} /> Live Sync Active (NG/Diesel + Elec)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                <AlertCircle size={12} /> Partial Sync (Check Modules)
              </span>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {!isViewer && (
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
            >
              <Save size={16} /> Save Data ({safeYear})
            </button>
          )}
          {isSaved && (
            <span className="flex items-center gap-1 text-sm text-emerald-700 font-medium ml-2">
              <CheckCircle2 size={16} /> Saved
            </span>
          )}
          <InventorySaveStatus status={status} error={error} gridError={gridError} />

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm ml-2"
          >
            <FileSpreadsheet size={16} /> Download Excel (.xls)
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-semibold shadow-sm transition-colors ml-2"
          >
            <Printer size={16} /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* Section filters */}
      <div className="mb-4 bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-wrap items-center gap-4 text-sm no-print">
        <span className="font-semibold text-slate-700 mr-2">Report Columns / Sections:</span>
        
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={sections.generator} onChange={() => setSections(p => ({...p, generator: !p.generator}))} className="accent-emerald-600 w-4 h-4" />
          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-semibold">Generator Data</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={sections.boiler} onChange={() => setSections(p => ({...p, boiler: !p.boiler}))} className="accent-sky-600 w-4 h-4" />
          <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-900 border border-sky-200 text-xs font-semibold">Boiler Data</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={sections.compressor} onChange={() => setSections(p => ({...p, compressor: !p.compressor}))} className="accent-amber-600 w-4 h-4" />
          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold">Compressor</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={sections.remarks} onChange={() => setSections(p => ({...p, remarks: !p.remarks}))} className="accent-slate-600 w-4 h-4" />
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300 text-xs font-semibold">Remarks</span>
        </label>
      </div>

      {isViewer && (
        <div className="mb-4 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 no-print">
          <AlertCircle size={16} /> You are viewing this data in read-only mode. Contact an admin for edit access.
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border border-slate-300 rounded-xl shadow-sm">
        <table className="w-full text-sm text-left border-separate border-spacing-0">
          <thead>
            {/* Row 1: group headers */}
            <tr>
              <th
                rowSpan={3}
                className="px-2 py-2 sticky left-0 z-30 bg-slate-200 text-slate-800 border-b border-r border-slate-300 w-28 min-w-[7rem] text-center text-xs font-bold"
              >
                Month
              </th>
              
              {sections.generator && (
                <th colSpan={generators.length * 3 + 4} className={`${TH} font-bold text-sm tracking-wide ${G.groupHeader}`}>
                  GENERATOR DATA
                </th>
              )}

              {sections.boiler && (
                <th colSpan={boilers.length * 6 + 3} className={`${TH} font-bold text-sm tracking-wide ${B.groupHeader}`}>
                  BOILER DATA
                </th>
              )}

              {sections.compressor && (
                <th colSpan={compressors.length + 3} className={`${TH} font-bold text-sm tracking-wide ${C.groupHeader}`}>
                  <div className="flex items-center justify-center gap-3">
                    <span>COMPRESSOR</span>
                    {!isViewer && (
                      <button
                        onClick={addCompressor}
                        className="no-print inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white hover:bg-amber-50 text-amber-800 border border-amber-400 text-xs font-semibold shadow-sm transition"
                      >
                        <Plus size={12} /> Add Compressor
                      </button>
                    )}
                  </div>
                </th>
              )}

              {sections.remarks && (
                <th rowSpan={3} className={`${TH} font-bold text-sm tracking-wide min-w-[180px] ${R.groupHeader}`}>
                  REMARKS
                </th>
              )}
            </tr>
            
            {/* Row 2: unit names + total columns */}
            <tr>
              {sections.generator && (
                <>
                  {generators.map(g => (
                    <th key={g.id} colSpan={3} className={`${TH} min-w-[180px] ${G.subHeader}`}>
                      <input
                        type="text"
                        value={g.name}
                        onChange={(e) => setGenerators(prev => prev.map(x => x.id === g.id ? { ...x, name: e.target.value } : x))}
                        disabled={isViewer}
                        className={`${NAME_INPUT_BASE} ${G.nameInput}`}
                      />
                    </th>
                  ))}
                  <th rowSpan={2} className={`${TH} min-w-[100px] ${G.subHeader}`}>Total Diesel</th>
                  <th rowSpan={2} className={`${TH} min-w-[100px] ${G.subHeader}`}>Total Run Hour</th>
                  <th rowSpan={2} className={`${TH} min-w-[110px] ${G.subHeader}`}>Total Elec (kWh)</th>
                  <th rowSpan={2} className={`${TH} min-w-[110px] ${G.subHeader}`}>Intensity (kWh/L)</th>
                </>
              )}

              {sections.boiler && (
                <>
                  {boilers.map(b => (
                    <th key={b.id} colSpan={6} className={`${TH} min-w-[320px] ${B.subHeader}`}>
                      <input
                        type="text"
                        value={b.name}
                        onChange={(e) => setBoilers(prev => prev.map(x => x.id === b.id ? { ...x, name: e.target.value } : x))}
                        disabled={isViewer}
                        className={`${NAME_INPUT_BASE} ${B.nameInput}`}
                      />
                    </th>
                  ))}
                  <th rowSpan={2} className={`${TH} min-w-[100px] ${B.subHeader}`}>Total Diesel (L)</th>
                  <th rowSpan={2} className={`${TH} min-w-[100px] ${B.subHeader}`}>Total NG (m³)</th>
                  <th rowSpan={2} className={`${TH} min-w-[100px] ${B.subHeader}`}>Total Steam</th>
                </>
              )}

              {sections.compressor && (
                <>
                  {compressors.map(c => (
                    <th key={c.id} rowSpan={2} className={`${TH} min-w-[130px] ${C.subHeader}`}>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={c.name}
                          onChange={(e) => updateCompressorName(c.id, e.target.value)}
                          disabled={isViewer}
                          className={`${NAME_INPUT_BASE} ${C.nameInput}`}
                        />
                        {!isViewer && compressors.length > 1 && (
                          <button
                            onClick={() => removeCompressor(c.id)}
                            title="Remove compressor"
                            className="no-print shrink-0 inline-flex items-center justify-center w-5 h-5 rounded bg-white border border-red-300 text-red-500 hover:bg-red-50 hover:text-red-700 transition"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                  <th rowSpan={2} className={`${TH} min-w-[110px] ${C.subHeader}`}>Total Elec (kWh)</th>
                  <th rowSpan={2} className={`${TH} min-w-[100px] ${C.subHeader}`}>Run Hour</th>
                  <th rowSpan={2} className={`${TH} min-w-[100px] ${C.subHeader}`}>Total Air</th>
                </>
              )}
            </tr>
            
            {/* Row 3: sub-column labels */}
            {(sections.generator || sections.boiler) && (
              <tr>
                {sections.generator && (
                  <>
                    {generators.map(g => (
                      <React.Fragment key={`sub-${g.id}`}>
                        <th className={`${TH} text-[10px] ${G.subHeaderSoft}`}>
                          Diesel (L) <Lock size={8} className="inline opacity-60" />
                        </th>
                        <th className={`${TH} text-[10px] ${G.subHeaderSoft}`}>Run Hour</th>
                        <th className={`${TH} text-[10px] ${G.subHeaderSoft}`}>
                          Elec (kWh) <Lock size={8} className="inline opacity-60" />
                        </th>
                      </React.Fragment>
                    ))}
                  </>
                )}
                {sections.boiler && (
                  <>
                    {boilers.map(b => (
                      <React.Fragment key={`sub-${b.id}`}>
                        <th className={`${TH} text-[10px] ${B.subHeaderSoft}`}>
                          Diesel (L) <Lock size={8} className="inline opacity-60" />
                        </th>
                        <th className={`${TH} text-[10px] ${B.subHeaderSoft}`}>NG (m³)</th>
                        <th className={`${TH} text-[10px] ${B.subHeaderSoft}`}>Diesel Hour</th>
                        <th className={`${TH} text-[10px] ${B.subHeaderSoft}`}>NG Hour</th>
                        <th className={`${TH} text-[10px] ${B.subHeaderSoft}`}>
                          Total Hour <Lock size={8} className="inline opacity-60" />
                        </th>
                        <th className={`${TH} text-[10px] ${B.subHeaderSoft}`}>Steam</th>
                      </React.Fragment>
                    ))}
                  </>
                )}
              </tr>
            )}
          </thead>

          <tbody>
            {MONTHS.map((month, idx) => {
              const row = data[month] || getEmptyMonth();
              const monthBg = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';
              return (
                <tr key={month} className="group">
                  <td className={`px-3 py-1.5 font-bold text-slate-800 text-xs sticky left-0 z-20 border-b border-r border-slate-300 ${monthBg}`}>
                    {month}
                  </td>
                  
                  {sections.generator && (
                    <>
                      {generators.map(g => (
                        <React.Fragment key={`row-${month}-${g.id}`}>
                          <td className={`${CELL} ${G.tint}`}>
                            {lockedBox(G, fmt(n(row.genDieselValues?.[g.id]), 2), true)}
                          </td>
                          <td className={`${CELL} ${G.tint}`}>
                            {numInput(G, row.genRunningHourValues?.[g.id] || '', (v) => updateNestedQty(month, 'genRunningHourValues', g.id, v))}
                          </td>
                          <td className={`${CELL} ${G.tint}`}>
                            {lockedBox(G, fmt(n(row.genElectricityValues?.[g.id]), 2), true)}
                          </td>
                        </React.Fragment>
                      ))}
                      <td className={`${CELL} ${G.tintStrong}`}>{lockedBox(G, fmt(getGenDieselTotal(row), 2))}</td>
                      <td className={`${CELL} ${G.tintStrong}`}>{lockedBox(G, fmt(getGenRunHourTotal(row), 2))}</td>
                      <td className={`${CELL} ${G.tintStrong}`}>{lockedBox(G, fmt(getGenElecTotal(row), 2))}</td>
                      <td className={`${CELL} ${G.tintStrong}`}>{lockedBox(G, getGenIntensity(row))}</td>
                    </>
                  )}

                  {sections.boiler && (
                    <>
                      {boilers.map(b => (
                        <React.Fragment key={`row-${month}-${b.id}`}>
                          <td className={`${CELL} ${B.tint}`}>
                            {lockedBox(B, fmt(n(row.boilerDieselValues?.[b.id]), 2), true)}
                          </td>
                          <td className={`${CELL} ${B.tint}`}>
                            {numInput(B, row.boilerNgValues?.[b.id] || '', (v) => updateNestedQty(month, 'boilerNgValues', b.id, v))}
                          </td>
                          <td className={`${CELL} ${B.tint}`}>
                            {numInput(B, row.boilerDieselHourValues?.[b.id] || '', (v) => updateNestedQty(month, 'boilerDieselHourValues', b.id, v))}
                          </td>
                          <td className={`${CELL} ${B.tint}`}>
                            {numInput(B, row.boilerNgHourValues?.[b.id] || '', (v) => updateNestedQty(month, 'boilerNgHourValues', b.id, v))}
                          </td>
                          <td className={`${CELL} ${B.tint}`}>
                            {lockedBox(B, fmt(getBoilerTotalRunHour(row, b.id), 2))}
                          </td>
                          <td className={`${CELL} ${B.tint}`}>
                            {numInput(B, row.boilerSteamValues?.[b.id] || '', (v) => updateNestedQty(month, 'boilerSteamValues', b.id, v))}
                          </td>
                        </React.Fragment>
                      ))}
                      <td className={`${CELL} ${B.tintStrong}`}>{lockedBox(B, fmt(getBoilerDieselTotal(row), 2))}</td>
                      <td className={`${CELL} ${B.tintStrong}`}>{lockedBox(B, fmt(getBoilerNgTotal(row), 2))}</td>
                      <td className={`${CELL} ${B.tintStrong}`}>
                        {lockedBox(B, fmt(boilers.reduce((s, b) => s + n(row.boilerSteamValues?.[b.id]), 0), 2))}
                      </td>
                    </>
                  )}

                  {sections.compressor && (
                    <>
                      {compressors.map(c => (
                        <td key={`row-${month}-${c.id}`} className={`${CELL} ${C.tint}`}>
                          {numInput(C, row.compElecValues?.[c.id] || '', (v) => updateNestedQty(month, 'compElecValues', c.id, v))}
                        </td>
                      ))}
                      <td className={`${CELL} ${C.tintStrong}`}>{lockedBox(C, fmt(getCompElecTotal(row), 2))}</td>
                      <td className={`${CELL} ${C.tint}`}>
                        {numInput(C, row.compRunningHour, (v) => updateMonthField(month, 'compRunningHour', v))}
                      </td>
                      <td className={`${CELL} ${C.tint}`}>
                        {numInput(C, row.compAir, (v) => updateMonthField(month, 'compAir', v))}
                      </td>
                    </>
                  )}

                  {sections.remarks && (
                    <td className={`${CELL} ${R.tint}`}>
                      <input
                        type="text"
                        value={row.remarks}
                        onChange={(e) => updateMonthField(month, 'remarks', e.target.value)}
                        disabled={isViewer}
                        className={`w-full min-w-[160px] border border-slate-300 bg-white rounded px-2 py-1 text-left text-xs text-slate-800 outline-none transition disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed ${R.input}`}
                        placeholder="Notes..."
                      />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr>
              <td className="px-3 py-2 sticky left-0 z-20 bg-slate-300 text-slate-900 text-xs font-bold border-t-2 border-r border-slate-400">
                Total
              </td>
              
              {sections.generator && (
                <>
                  {generators.map(g => {
                    let sumDiesel = 0, sumHour = 0, sumElec = 0;
                    MONTHS.forEach(m => {
                      sumDiesel += n(data[m]?.genDieselValues?.[g.id]);
                      sumHour += n(data[m]?.genRunningHourValues?.[g.id]);
                      sumElec += n(data[m]?.genElectricityValues?.[g.id]);
                    });
                    return (
                      <React.Fragment key={`tot-${g.id}`}>
                        <td className={`px-2 py-2 text-right text-xs font-bold border-t-2 border-r ${G.footer}`}>{fmt(sumDiesel, 2)}</td>
                        <td className={`px-2 py-2 text-right text-xs font-bold border-t-2 border-r ${G.footer}`}>{fmt(sumHour, 2)}</td>
                        <td className={`px-2 py-2 text-right text-xs font-bold border-t-2 border-r ${G.footer}`}>{fmt(sumElec, 2)}</td>
                      </React.Fragment>
                    );
                  })}
                  <td className={`px-2 py-2 text-right text-xs font-bold border-t-2 border-r ${G.footerStrong}`}>{fmt(getYearlySum((m, r) => getGenDieselTotal(r)), 2)}</td>
                  <td className={`px-2 py-2 text-right text-xs font-bold border-t-2 border-r ${G.footerStrong}`}>{fmt(getYearlySum((m, r) => getGenRunHourTotal(r)), 2)}</td>
                  <td className={`px-2 py-2 text-right text-xs font-bold border-t-2 border-r ${G.footerStrong}`}>{fmt(getYearlySum((m, r) => getGenElecTotal(r)), 2)}</td>
                  <td className={`px-2 py-2 text-right text-xs font-bold border-t-2 border-r ${G.footerStrong}`}>{getYearlyGenIntensity()}</td>
                </>
              )}

              {sections.boiler && (
                <>
                  {boilers.map(b => {
                    let sumDiesel = 0, sumNg = 0, sumDieselHour = 0, sumNgHour = 0, sumTotalHour = 0, sumSteam = 0;
                    MONTHS.forEach(m => {
                      const r = data[m] || getEmptyMonth();
                      sumDiesel += n(r.boilerDieselValues?.[b.id]);
                      sumNg += n(r.boilerNgValues?.[b.id]);
                      sumDieselHour += n(r.boilerDieselHourValues?.[b.id]);
                      sumNgHour += n(r.boilerNgHourValues?.[b.id]);
                      sumTotalHour += getBoilerTotalRunHour(r, b.id);
                      sumSteam += n(r.boilerSteamValues?.[b.id]);
                    });
                    return (
                      <React.Fragment key={`tot-${b.id}`}>
                        <td className={`px-2 py-2 text-right text-xs font-bold border-t-2 border-r ${B.footer}`}>{fmt(sumDiesel, 2)}</td>
                        <td className={`px-2 py-2 text-right text-xs font-bold border-t-2 border-r ${B.footer}`}>{fmt(sumNg, 2)}</td>
                        <td className={`px-2 py-2 text-right text-xs font-bold border-t-2 border-r ${B.footer}`}>{fmt(sumDieselHour, 2)}</td>
                        <td className={`px-2 py-2 text-right text-xs font-bold border-t-2 border-r ${B.footer}`}>{fmt(sumNgHour, 2)}</td>
                        <td className={`px-2 py-2 text-right text-xs font-bold border-t-2 border-r ${B.footer}`}>{fmt(sumTotalHour, 2)}</td>
                        <td className={`px-2 py-2 text-right text-xs font-bold border-t-2 border-r ${B.footer}`}>{fmt(sumSteam, 2)}</td>
                      </React.Fragment>
                    );
                  })}
                  <td className={`px-2 py-2 text-right text-xs font-bold border-t-2 border-r ${B.footerStrong}`}>{fmt(getYearlySum((m, r) => getBoilerDieselTotal(r)), 2)}</td>
                  <td className={`px-2 py-2 text-right text-xs font-bold border-t-2 border-r ${B.footerStrong}`}>{fmt(getYearlySum((m, r) => getBoilerNgTotal(r)), 2)}</td>
                  <td className={`px-2 py-2 text-right text-xs font-bold border-t-2 border-r ${B.footerStrong}`}>{fmt(getYearlySum((m, r) => boilers.reduce((s, b) => s + n(r.boilerSteamValues?.[b.id]), 0)), 2)}</td>
                </>
              )}

              {sections.compressor && (
                <>
                  {compressors.map(c => {
                    let sum = 0;
                    MONTHS.forEach(m => { sum += n(data[m]?.compElecValues?.[c.id]); });
                    return (
                      <td key={`tot-${c.id}`} className={`px-2 py-2 text-right text-xs font-bold border-t-2 border-r ${C.footer}`}>
                        {fmt(sum, 2)}
                      </td>
                    );
                  })}
                  <td className={`px-2 py-2 text-right text-xs font-bold border-t-2 border-r ${C.footerStrong}`}>{fmt(getYearlySum((m, r) => getCompElecTotal(r)), 2)}</td>
                  <td className={`px-2 py-2 text-right text-xs font-bold border-t-2 border-r ${C.footerStrong}`}>{fmt(getYearlySum((m, r) => n(r.compRunningHour)), 2)}</td>
                  <td className={`px-2 py-2 text-right text-xs font-bold border-t-2 border-r ${C.footerStrong}`}>{fmt(getYearlySum((m, r) => n(r.compAir)), 2)}</td>
                </>
              )}

              {sections.remarks && (
                <td className={`px-2 py-2 text-center text-xs font-bold border-t-2 ${R.footerStrong}`}>-</td>
              )}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
