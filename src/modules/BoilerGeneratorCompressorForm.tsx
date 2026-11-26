import React, { useState, useEffect } from 'react';
import { Save, Plus, X, Printer, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { UNIT_DIRECTORY } from '../utils/unitDirectory';

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

const isValidNumber = (val: string): boolean => {
  if (val === '') return true;
  return /^\d*(\.\d{0,2})?$/.test(val);
};

export default function BoilerGeneratorCompressorForm({
  selectedUnit,
  selectedYear,
  userRole,
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

  const [sections, setSections] = useState({
    generator: true,
    boiler: true,
    compressor: true,
    remarks: true,
  });

  useEffect(() => {
    // Load cross-module data & own data
    let loadedGenerators: MeterItem[] = [];
    let loadedBoilers: MeterItem[] = [];

    try {
      const storedNgDiesel = localStorage.getItem(ngDieselKey);
      if (storedNgDiesel) {
        const parsed = JSON.parse(storedNgDiesel);
        if (parsed && Array.isArray(parsed.generators) && parsed.generators.length > 0) {
          loadedGenerators = parsed.generators.map((g: any) => ({ id: g.id, name: g.name || 'Generator' }));
        }
        if (parsed && Array.isArray(parsed.boilers) && parsed.boilers.length > 0) {
          loadedBoilers = parsed.boilers.map((b: any) => ({ id: b.id, name: b.name || 'Boiler' }));
        }
        setSyncStatus(prev => ({ ...prev, ngDiesel: true }));
      }
    } catch (e) {
      console.error('Failed to load NG/Diesel sync data', e);
    }

    let loadedElecSolar: any = null;
    try {
      const storedElec = localStorage.getItem(elecSolarKey);
      if (storedElec) {
        loadedElecSolar = JSON.parse(storedElec);
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
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        
        if (parsed && Array.isArray(parsed.compressors) && parsed.compressors.length > 0) {
          setCompressors(parsed.compressors);
        } else {
          setCompressors([{ id: 'c1', name: 'Compressor 1' }, { id: 'c2', name: 'Compressor 2' }]);
        }

        if (parsed && parsed.data && typeof parsed.data === 'object') {
          const validatedData: FormData = {};
          MONTHS.forEach(m => {
            const rawMonth = parsed.data[m];
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

    // Auto-fill from cross modules
    const initialData: FormData = {};
    MONTHS.forEach(m => { initialData[m] = getEmptyMonth(); });
    
    // We need to prefill based on cross module data if available
    // We'll do this in a separate effect or just during initial load to avoid overriding user edits
    // Better to sync once on load
    if (loadedGenerators.length > 0 && loadedBoilers.length > 0) {
      try {
        const stored = localStorage.getItem(storageKey);
        const parsedOwn = stored ? JSON.parse(stored) : null;
        
        MONTHS.forEach(m => {
          const ownMonth = parsedOwn?.data?.[m] || {};
          
          loadedGenerators.forEach(g => {
            const ngDieselRow = parsedOwn ? null : null; // placeholder
            // Find in ngDiesel
            let genDiesel = '';
            let genElec = '';
            if (storedNgDiesel) {
              const nd = JSON.parse(storedNgDiesel);
              if (nd.data?.[m]?.genDieselValues?.[g.id]) {
                genDiesel = nd.data[m].genDieselValues[g.id];
              }
            }
            if (loadedElecSolar) {
              if (loadedElecSolar.data?.[m]?.generators?.[g.id]) {
                genElec = loadedElecSolar.data[m].generators[g.id];
              }
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
            if (storedNgDiesel) {
              const nd = JSON.parse(storedNgDiesel);
              if (nd.data?.[m]?.boilerDieselValues?.[b.id]) {
                bDiesel = nd.data[m].boilerDieselValues[b.id];
              }
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
          
          // compressors
          if (ownMonth.compElecValues) {
            initialData[m].compElecValues = { ...ownMonth.compElecValues };
          }
        });
        
        setData(initialData);
      } catch (e) {
        console.error('Failed to merge cross-module data', e);
      }
    }

  }, [storageKey, ngDieselKey, elecSolarKey]);

  const handleSave = () => {
    if (isViewer) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ compressors, data }));
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (e) {
      alert('Failed to save data.');
    }
  };

  const updateMonthField = (month: string, field: keyof MonthData, value: string) => {
    if (isViewer) return;
    if (typeof value === 'string' && !isValidNumber(value) && field !== 'remarks') return;
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
    if (!isValidNumber(value)) return;

    setData(prev => {
      const prevMonth = prev[month] || getEmptyMonth();
      return {
        ...prev,
        [month]: {
          ...prevMonth,
          [section]: {
            ...(prevMonth[section] || {}),
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

    // Build headers with appropriate colspans
    let row1 = `<tr><th rowSpan="2" style="border: 1px solid #000; padding: 5px; background-color: #f3f4f6;">Month</th>`;
    let row2 = `<tr>`;

    if (sections.generator) {
      // Each generator: diesel, running hour, electricity = 3 cols per generator
      // Plus totals: diesel total, run hour total, elec total, intensity = 4 cols
      const genCols = generators.length * 3 + 4;
      row1 += `<th colspan="${genCols}" style="border: 1px solid #000; padding: 5px; background-color: #d1fae5; text-align: center; font-weight: bold;">GENERATOR DATA</th>`;
      
      generators.forEach(g => {
        row2 += `<th colspan="3" style="border: 1px solid #000; padding: 5px; background-color: #d1fae5; text-align: center; font-size: 11px;">${g.name}</th>`;
      });
      row2 += `<th rowSpan="2" style="border: 1px solid #000; padding: 5px; background-color: #d1fae5; text-align: center; font-size: 11px;">Total Diesel</th>`;
      row2 += `<th rowSpan="2" style="border: 1px solid #000; padding: 5px; background-color: #d1fae5; text-align: center; font-size: 11px;">Total Run Hour</th>`;
      row2 += `<th rowSpan="2" style="border: 1px solid #000; padding: 5px; background-color: #d1fae5; text-align: center; font-size: 11px;">Total Elec (kWh)</th>`;
      row2 += `<th rowSpan="2" style="border: 1px solid #000; padding: 5px; background-color: #d1fae5; text-align: center; font-size: 11px;">Intensity (kWh/L)</th>`;
      
      // Second row for generator: diesel, run hour, elec
      // We need to add the second row's generator columns
      // Actually row2 is the sub-headers for generator columns, but we need 3 sub-cols per generator
      // So we need a row3 for that
    }

    // Let's redo the header structure with 3 rows for generator and boiler, 2 rows for compressor
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
      // Each boiler: diesel, ng, diesel hour, ng hour, total hour, steam = 6 cols
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
      // Each compressor: electricity = 1 col per compressor + 3 totals
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
    
    // If no generator/boiler sections, we don't need row3
    const hasRow3 = sections.generator || sections.boiler;
    const tableHeadersHtml = headerRow1 + headerRow2 + (hasRow3 ? headerRow3 : '');

    let tbody = '';
    MONTHS.forEach(m => {
      const row = data[m] || getEmptyMonth();
      tbody += `<tr><td style="border: 1px solid #000; padding: 5px; font-weight: bold; font-size: 11px;">${m}</td>`;

      if (sections.generator) {
        generators.forEach(g => {
          tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(n(row.genDieselValues?.[g.id]), 2)}</td>`;
          tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(n(row.genRunningHourValues?.[g.id]), 2)}</td>`;
          tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(n(row.genElectricityValues?.[g.id]), 2)}</td>`;
        });
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-size: 11px;">${fmt(getGenDieselTotal(row), 2)}</td>`;
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-size: 11px;">${fmt(getGenRunHourTotal(row), 2)}</td>`;
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-size: 11px;">${fmt(getGenElecTotal(row), 2)}</td>`;
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-size: 11px;">${getGenIntensity(row)}</td>`;
      }

      if (sections.boiler) {
        boilers.forEach(b => {
          tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(n(row.boilerDieselValues?.[b.id]), 2)}</td>`;
          tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(n(row.boilerNgValues?.[b.id]), 2)}</td>`;
          tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(n(row.boilerDieselHourValues?.[b.id]), 2)}</td>`;
          tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(n(row.boilerNgHourValues?.[b.id]), 2)}</td>`;
          tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-size: 11px;">${fmt(getBoilerTotalRunHour(row, b.id), 2)}</td>`;
          tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(n(row.boilerSteamValues?.[b.id]), 2)}</td>`;
        });
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-size: 11px;">${fmt(getBoilerDieselTotal(row), 2)}</td>`;
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-size: 11px;">${fmt(getBoilerNgTotal(row), 2)}</td>`;
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-size: 11px;">${fmt(boilers.reduce((s, b) => s + n(row.boilerSteamValues?.[b.id]), 0), 2)}</td>`;
      }

      if (sections.compressor) {
        compressors.forEach(c => {
          tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(n(row.compElecValues?.[c.id]), 2)}</td>`;
        });
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-size: 11px;">${fmt(getCompElecTotal(row), 2)}</td>`;
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

  return (
    <div className="w-full max-w-[95vw] mx-auto p-4 sm:p-6 bg-white rounded-xl shadow-sm">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Boiler, Generator &amp; Compressor</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p className="text-sm text-slate-500">{unitInfo.fullName}</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Reporting Year: {safeYear}
            </span>
            {syncStatus.ngDiesel && syncStatus.elecSolar ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
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

      <div className="mb-4 bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-wrap items-center gap-4 text-sm no-print">
        <span className="font-semibold text-slate-700 mr-2">Report Columns / Sections:</span>
        
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={sections.generator} onChange={() => setSections(p => ({...p, generator: !p.generator}))} className="accent-emerald-600 w-4 h-4" />
          <span>Generator Data</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={sections.boiler} onChange={() => setSections(p => ({...p, boiler: !p.boiler}))} className="accent-blue-600 w-4 h-4" />
          <span>Boiler Data</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={sections.compressor} onChange={() => setSections(p => ({...p, compressor: !p.compressor}))} className="accent-amber-600 w-4 h-4" />
          <span>Compressor</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={sections.remarks} onChange={() => setSections(p => ({...p, remarks: !p.remarks}))} className="accent-gray-600 w-4 h-4" />
          <span>Remarks</span>
        </label>
      </div>

      {isViewer && (
        <div className="mb-4 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 no-print">
          <AlertCircle size={16} /> You are viewing this data in read-only mode. Contact an admin for edit access.
        </div>
      )}

      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600 font-semibold">
            <tr>
              <th rowSpan={3} className="px-2 py-2 sticky left-0 bg-slate-50 z-20 border-r border-slate-200 w-24 text-center">Month</th>
              
              {sections.generator && (
                <th colSpan={generators.length * 3 + 4} className="px-2 py-2 bg-emerald-100 text-emerald-900 border-r border-slate-200 text-center font-bold uppercase tracking-wider">
                  Generator Data
                </th>
              )}

              {sections.boiler && (
                <th colSpan={boilers.length * 6 + 3} className="px-2 py-2 bg-blue-100 text-blue-900 border-r border-slate-200 text-center font-bold uppercase tracking-wider">
                  Boiler Data
                </th>
              )}

              {sections.compressor && (
                <th colSpan={compressors.length + 3} className="px-2 py-2 bg-amber-100 text-amber-900 border-r border-slate-200 text-center font-bold uppercase tracking-wider">
                  Compressor
                </th>
              )}

              {sections.remarks && (
                <th rowSpan={3} className="px-2 py-2 bg-gray-100 text-gray-900 text-center font-bold uppercase tracking-wider">
                  Remarks
                </th>
              )}
            </tr>
            
            <tr>
              {sections.generator && (
                <>
                  {generators.map(g => (
                    <th key={g.id} colSpan={3} className="px-2 py-1 text-center bg-emerald-50 min-w-[150px]">
                      <div className="flex flex-col items-center gap-1">
                        <input
                          type="text"
                          value={g.name}
                          onChange={(e) => setGenerators(prev => prev.map(x => x.id === g.id ? { ...x, name: e.target.value } : x))}
                          disabled={isViewer}
                          className="w-full text-xs px-1 py-0.5 border border-slate-300 rounded text-center focus:outline-none focus:border-emerald-500 disabled:bg-transparent disabled:border-transparent"
                        />
                      </div>
                    </th>
                  ))}
                  <th rowSpan={2} className="px-2 py-2 text-center whitespace-nowrap bg-emerald-50/50 border-l border-slate-200">Total Diesel</th>
                  <th rowSpan={2} className="px-2 py-2 text-center whitespace-nowrap bg-emerald-50/50">Total Run Hour</th>
                  <th rowSpan={2} className="px-2 py-2 text-center whitespace-nowrap bg-emerald-50/50">Total Elec (kWh)</th>
                  <th rowSpan={2} className="px-2 py-2 text-center whitespace-nowrap bg-emerald-50/50">Intensity (kWh/L)</th>
                </>
              )}

              {sections.boiler && (
                <>
                  {boilers.map(b => (
                    <th key={b.id} colSpan={6} className="px-2 py-1 text-center bg-blue-50 min-w-[250px]">
                      <div className="flex flex-col items-center gap-1">
                        <input
                          type="text"
                          value={b.name}
                          onChange={(e) => setBoilers(prev => prev.map(x => x.id === b.id ? { ...x, name: e.target.value } : x))}
                          disabled={isViewer}
                          className="w-full text-xs px-1 py-0.5 border border-slate-300 rounded text-center focus:outline-none focus:border-blue-500 disabled:bg-transparent disabled:border-transparent"
                        />
                      </div>
                    </th>
                  ))}
                  <th rowSpan={2} className="px-2 py-2 text-center whitespace-nowrap bg-blue-50/50 border-l border-slate-200">Total Diesel (L)</th>
                  <th rowSpan={2} className="px-2 py-2 text-center whitespace-nowrap bg-blue-50/50">Total NG (m³)</th>
                  <th rowSpan={2} className="px-2 py-2 text-center whitespace-nowrap bg-blue-50/50">Total Steam</th>
                </>
              )}

              {sections.compressor && (
                <>
                  {compressors.map(c => (
                    <th key={c.id} rowSpan={2} className="px-2 py-1 text-center bg-amber-50 min-w-[120px]">
                      <div className="flex flex-col items-center gap-1">
                        <input
                          type="text"
                          value={c.name}
                          onChange={(e) => updateCompressorName(c.id, e.target.value)}
                          disabled={isViewer}
                          className="w-full text-xs px-1 py-0.5 border border-slate-300 rounded text-center focus:outline-none focus:border-amber-500 disabled:bg-transparent disabled:border-transparent"
                        />
                        {!isViewer && compressors.length > 1 && (
                          <button onClick={() => removeCompressor(c.id)} className="text-red-500 hover:text-red-700 no-print">
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                  <th rowSpan={2} className="px-2 py-2 text-center whitespace-nowrap bg-amber-50/50 border-l border-slate-200">Total Elec (kWh)</th>
                  <th rowSpan={2} className="px-2 py-2 text-center whitespace-nowrap bg-amber-50/50">Run Hour</th>
                  <th rowSpan={2} className="px-2 py-2 text-center whitespace-nowrap bg-amber-50/50">Total Air</th>
                </>
              )}
            </tr>
            
            {(sections.generator || sections.boiler) && (
              <tr>
                {sections.generator && (
                  <>
                    {generators.map(g => (
                      <React.Fragment key={`sub-${g.id}`}>
                        <th className="px-1 py-1 text-center text-[10px] bg-emerald-50/30 border-l border-slate-200">Diesel (L)</th>
                        <th className="px-1 py-1 text-center text-[10px] bg-emerald-50/30">Run Hour</th>
                        <th className="px-1 py-1 text-center text-[10px] bg-emerald-50/30">Elec (kWh)</th>
                      </React.Fragment>
                    ))}
                  </>
                )}
                {sections.boiler && (
                  <>
                    {boilers.map(b => (
                      <React.Fragment key={`sub-${b.id}`}>
                        <th className="px-1 py-1 text-center text-[10px] bg-blue-50/30 border-l border-slate-200">Diesel (L)</th>
                        <th className="px-1 py-1 text-center text-[10px] bg-blue-50/30">NG (m³)</th>
                        <th className="px-1 py-1 text-center text-[10px] bg-blue-50/30">Diesel Hour</th>
                        <th className="px-1 py-1 text-center text-[10px] bg-blue-50/30">NG Hour</th>
                        <th className="px-1 py-1 text-center text-[10px] bg-blue-50/30">Total Hour</th>
                        <th className="px-1 py-1 text-center text-[10px] bg-blue-50/30">Steam</th>
                      </React.Fragment>
                    ))}
                  </>
                )}
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {MONTHS.map((month, idx) => {
              const row = data[month] || getEmptyMonth();
              return (
                <tr key={month} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="px-2 py-1 font-semibold text-slate-700 sticky left-0 bg-inherit z-10 border-r border-slate-200">{month}</td>
                  
                  {sections.generator && (
                    <>
                      {generators.map(g => (
                        <React.Fragment key={`row-${month}-${g.id}`}>
                          <td className="px-1 py-1 border-l border-slate-200">
                            <input type="text" inputMode="decimal" value={row.genDieselValues?.[g.id] || ''} onChange={(e) => updateNestedQty(month, 'genDieselValues', g.id, e.target.value)} disabled={isViewer} className="w-16 px-1 py-1 text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" />
                          </td>
                          <td className="px-1 py-1">
                            <input type="text" inputMode="decimal" value={row.genRunningHourValues?.[g.id] || ''} onChange={(e) => updateNestedQty(month, 'genRunningHourValues', g.id, e.target.value)} disabled={isViewer} className="w-16 px-1 py-1 text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" />
                          </td>
                          <td className="px-1 py-1">
                            <input type="text" inputMode="decimal" value={row.genElectricityValues?.[g.id] || ''} onChange={(e) => updateNestedQty(month, 'genElectricityValues', g.id, e.target.value)} disabled={isViewer} className="w-16 px-1 py-1 text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" />
                          </td>
                        </React.Fragment>
                      ))}
                      <td className="px-2 py-1 text-right font-bold text-emerald-700 bg-emerald-50/30 border-l border-slate-200">{fmt(getGenDieselTotal(row), 2)}</td>
                      <td className="px-2 py-1 text-right font-bold text-emerald-700 bg-emerald-50/30">{fmt(getGenRunHourTotal(row), 2)}</td>
                      <td className="px-2 py-1 text-right font-bold text-emerald-700 bg-emerald-50/30">{fmt(getGenElecTotal(row), 2)}</td>
                      <td className="px-2 py-1 text-right font-bold text-emerald-700 bg-emerald-50/30">{getGenIntensity(row)}</td>
                    </>
                  )}

                  {sections.boiler && (
                    <>
                      {boilers.map(b => (
                        <React.Fragment key={`row-${month}-${b.id}`}>
                          <td className="px-1 py-1 border-l border-slate-200">
                            <input type="text" inputMode="decimal" value={row.boilerDieselValues?.[b.id] || ''} onChange={(e) => updateNestedQty(month, 'boilerDieselValues', b.id, e.target.value)} disabled={isViewer} className="w-16 px-1 py-1 text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" />
                          </td>
                          <td className="px-1 py-1">
                            <input type="text" inputMode="decimal" value={row.boilerNgValues?.[b.id] || ''} onChange={(e) => updateNestedQty(month, 'boilerNgValues', b.id, e.target.value)} disabled={isViewer} className="w-16 px-1 py-1 text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" />
                          </td>
                          <td className="px-1 py-1">
                            <input type="text" inputMode="decimal" value={row.boilerDieselHourValues?.[b.id] || ''} onChange={(e) => updateNestedQty(month, 'boilerDieselHourValues', b.id, e.target.value)} disabled={isViewer} className="w-16 px-1 py-1 text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" />
                          </td>
                          <td className="px-1 py-1">
                            <input type="text" inputMode="decimal" value={row.boilerNgHourValues?.[b.id] || ''} onChange={(e) => updateNestedQty(month, 'boilerNgHourValues', b.id, e.target.value)} disabled={isViewer} className="w-16 px-1 py-1 text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" />
                          </td>
                          <td className="px-1 py-1 text-right font-bold text-blue-700 bg-blue-50/30">{fmt(getBoilerTotalRunHour(row, b.id), 2)}</td>
                          <td className="px-1 py-1">
                            <input type="text" inputMode="decimal" value={row.boilerSteamValues?.[b.id] || ''} onChange={(e) => updateNestedQty(month, 'boilerSteamValues', b.id, e.target.value)} disabled={isViewer} className="w-16 px-1 py-1 text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" />
                          </td>
                        </React.Fragment>
                      ))}
                      <td className="px-2 py-1 text-right font-bold text-blue-700 bg-blue-50/30 border-l border-slate-200">{fmt(getBoilerDieselTotal(row), 2)}</td>
                      <td className="px-2 py-1 text-right font-bold text-blue-700 bg-blue-50/30">{fmt(getBoilerNgTotal(row), 2)}</td>
                      <td className="px-2 py-1 text-right font-bold text-blue-700 bg-blue-50/30">{fmt(boilers.reduce((s, b) => s + n(row.boilerSteamValues?.[b.id]), 0), 2)}</td>
                    </>
                  )}

                  {sections.compressor && (
                    <>
                      {compressors.map(c => (
                        <td key={`row-${month}-${c.id}`} className="px-1 py-1">
                          <input type="text" inputMode="decimal" value={row.compElecValues?.[c.id] || ''} onChange={(e) => updateNestedQty(month, 'compElecValues', c.id, e.target.value)} disabled={isViewer} className="w-20 px-2 py-1 text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" />
                        </td>
                      ))}
                      <td className="px-2 py-1 text-right font-bold text-amber-700 bg-amber-50/30 border-l border-slate-200">{fmt(getCompElecTotal(row), 2)}</td>
                      <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.compRunningHour} onChange={(e) => updateMonthField(month, 'compRunningHour', e.target.value)} disabled={isViewer} className="w-20 px-2 py-1 text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" /></td>
                      <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.compAir} onChange={(e) => updateMonthField(month, 'compAir', e.target.value)} disabled={isViewer} className="w-20 px-2 py-1 text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" /></td>
                    </>
                  )}

                  {sections.remarks && (
                    <td className="px-1 py-1">
                      <input type="text" value={row.remarks} onChange={(e) => updateMonthField(month, 'remarks', e.target.value)} disabled={isViewer} className="w-full min-w-[120px] px-2 py-1 border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" placeholder="Notes..." />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-xs">
            <tr>
              <td className="px-2 py-2 sticky left-0 bg-slate-100 z-10 border-r border-slate-300">Total</td>
              
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
                        <td className="px-1 py-2 text-right border-l border-slate-200 text-emerald-800">{fmt(sumDiesel, 2)}</td>
                        <td className="px-1 py-2 text-right text-emerald-800">{fmt(sumHour, 2)}</td>
                        <td className="px-1 py-2 text-right text-emerald-800">{fmt(sumElec, 2)}</td>
                      </React.Fragment>
                    );
                  })}
                  <td className="px-2 py-2 text-right text-emerald-800 bg-emerald-100/50 border-l border-slate-200">{fmt(getYearlySum((m, r) => getGenDieselTotal(r)), 2)}</td>
                  <td className="px-2 py-2 text-right text-emerald-800 bg-emerald-100/50">{fmt(getYearlySum((m, r) => getGenRunHourTotal(r)), 2)}</td>
                  <td className="px-2 py-2 text-right text-emerald-800 bg-emerald-100/50">{fmt(getYearlySum((m, r) => getGenElecTotal(r)), 2)}</td>
                  <td className="px-2 py-2 text-right text-emerald-800 bg-emerald-100/50">{getYearlyGenIntensity()}</td>
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
                        <td className="px-1 py-2 text-right border-l border-slate-200 text-blue-800">{fmt(sumDiesel, 2)}</td>
                        <td className="px-1 py-2 text-right text-blue-800">{fmt(sumNg, 2)}</td>
                        <td className="px-1 py-2 text-right text-blue-800">{fmt(sumDieselHour, 2)}</td>
                        <td className="px-1 py-2 text-right text-blue-800">{fmt(sumNgHour, 2)}</td>
                        <td className="px-1 py-2 text-right text-blue-800">{fmt(sumTotalHour, 2)}</td>
                        <td className="px-1 py-2 text-right text-blue-800">{fmt(sumSteam, 2)}</td>
                      </React.Fragment>
                    );
                  })}
                  <td className="px-2 py-2 text-right text-blue-800 bg-blue-100/50 border-l border-slate-200">{fmt(getYearlySum((m, r) => getBoilerDieselTotal(r)), 2)}</td>
                  <td className="px-2 py-2 text-right text-blue-800 bg-blue-100/50">{fmt(getYearlySum((m, r) => getBoilerNgTotal(r)), 2)}</td>
                  <td className="px-2 py-2 text-right text-blue-800 bg-blue-100/50">{fmt(getYearlySum((m, r) => boilers.reduce((s, b) => s + n(r.boilerSteamValues?.[b.id]), 0)), 2)}</td>
                </>
              )}

              {sections.compressor && (
                <>
                  {compressors.map(c => {
                    let sum = 0;
                    MONTHS.forEach(m => { sum += n(data[m]?.compElecValues?.[c.id]); });
                    return <td key={`tot-${c.id}`} className="px-2 py-2 text-right text-amber-800">{fmt(sum, 2)}</td>;
                  })}
                  <td className="px-2 py-2 text-right text-amber-800 bg-amber-100/50 border-l border-slate-200">{fmt(getYearlySum((m, r) => getCompElecTotal(r)), 2)}</td>
                  <td className="px-2 py-2 text-right text-amber-800 bg-amber-100/50">{fmt(getYearlySum((m, r) => n(r.compRunningHour)), 2)}</td>
                  <td className="px-2 py-2 text-right text-amber-800 bg-amber-100/50">{fmt(getYearlySum((m, r) => n(r.compAir)), 2)}</td>
                </>
              )}

              {sections.remarks && (
                <td className="px-2 py-2 text-right text-slate-400">-</td>
              )}
            </tr>
          </tfoot>
        </table>
      </div>

      {!isViewer && sections.compressor && (
        <div className="mt-4 flex flex-wrap gap-3 no-print">
          <button onClick={addCompressor} className="flex items-center gap-2 px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-sm font-semibold transition-colors">
            <Plus size={16} /> Add Compressor
          </button>
        </div>
      )}
    </div>
  );
}
