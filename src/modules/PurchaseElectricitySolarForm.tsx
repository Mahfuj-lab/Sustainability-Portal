import React, { useState, useEffect } from 'react';
import { Save, Plus, X, Printer, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { UNIT_DIRECTORY } from '../utils/unitDirectory';
import {
  InventorySaveStatus,
  normalizeNumericInput,
  useHybridAutoSave,
  useInventoryGrid,
} from '../utils/inventoryDataEntry';

export interface PurchaseElectricitySolarFormProps {
  selectedUnit: string;
  selectedYear: string;
  userRole?: string;
  [key: string]: any;
}

interface Meter {
  id: string;
  name: string;
}

interface MonthData {
  offPeak: Record<string, string>;
  peak: Record<string, string>;
  flat: Record<string, string>;
  totalTK: string;
  purchaseDomestic: string;
  purchaseProduction: string;
  solar: Record<string, string>;
  generators: Record<string, string>;
  remarks: string;
}

type FormData = Record<string, MonthData>;

type SectionKey = 'meters' | 'totalPurchase' | 'includeTK' | 'solar' | 'generated' | 'remarks';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/* ------------------------------------------------------------------ */
/*  Section color themes (full class strings so Tailwind can see them) */
/* ------------------------------------------------------------------ */
interface Theme {
  band: string;        // main section header band
  sub: string;         // sub-header cells (meter names, column titles)
  micro: string;       // third-level header cells (Off Peak / Peak / Flat)
  tint: string;        // editable column background tint
  locked: string;      // read-only auto-calculated cell
  lockedStrong: string; // read-only main total cell
  foot: string;        // bottom Total row cell
  border: string;      // section border color
  focus: string;       // input focus style
  addBtn: string;      // inline add button
}

const THEMES: Record<'amber' | 'emerald' | 'sky' | 'orange' | 'slate', Theme> = {
  amber: {
    band: 'bg-amber-200 text-amber-950',
    sub: 'bg-amber-100 text-amber-900',
    micro: 'bg-amber-50 text-amber-800',
    tint: 'bg-amber-50/70',
    locked: 'bg-amber-100 text-amber-950',
    lockedStrong: 'bg-amber-200 text-amber-950',
    foot: 'bg-amber-200 text-amber-950',
    border: 'border-amber-300',
    focus: 'focus:border-amber-600 focus:ring-2 focus:ring-amber-200',
    addBtn: 'bg-white text-amber-800 border-amber-400 hover:bg-amber-50',
  },
  emerald: {
    band: 'bg-emerald-200 text-emerald-950',
    sub: 'bg-emerald-100 text-emerald-900',
    micro: 'bg-emerald-50 text-emerald-800',
    tint: 'bg-emerald-50/70',
    locked: 'bg-emerald-100 text-emerald-950',
    lockedStrong: 'bg-emerald-200 text-emerald-950',
    foot: 'bg-emerald-200 text-emerald-950',
    border: 'border-emerald-300',
    focus: 'focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200',
    addBtn: 'bg-white text-emerald-800 border-emerald-400 hover:bg-emerald-50',
  },
  sky: {
    band: 'bg-sky-200 text-sky-950',
    sub: 'bg-sky-100 text-sky-900',
    micro: 'bg-sky-50 text-sky-800',
    tint: 'bg-sky-50/70',
    locked: 'bg-sky-100 text-sky-950',
    lockedStrong: 'bg-sky-200 text-sky-950',
    foot: 'bg-sky-200 text-sky-950',
    border: 'border-sky-300',
    focus: 'focus:border-sky-600 focus:ring-2 focus:ring-sky-200',
    addBtn: 'bg-white text-sky-800 border-sky-400 hover:bg-sky-50',
  },
  orange: {
    band: 'bg-orange-200 text-orange-950',
    sub: 'bg-orange-100 text-orange-900',
    micro: 'bg-orange-50 text-orange-800',
    tint: 'bg-orange-50/70',
    locked: 'bg-orange-100 text-orange-950',
    lockedStrong: 'bg-orange-200 text-orange-950',
    foot: 'bg-orange-200 text-orange-950',
    border: 'border-orange-300',
    focus: 'focus:border-orange-600 focus:ring-2 focus:ring-orange-200',
    addBtn: 'bg-white text-orange-800 border-orange-400 hover:bg-orange-50',
  },
  slate: {
    band: 'bg-slate-200 text-slate-800',
    sub: 'bg-slate-100 text-slate-700',
    micro: 'bg-slate-50 text-slate-700',
    tint: 'bg-slate-50',
    locked: 'bg-slate-100 text-slate-800',
    lockedStrong: 'bg-slate-200 text-slate-800',
    foot: 'bg-slate-200 text-slate-800',
    border: 'border-slate-300',
    focus: 'focus:border-slate-500 focus:ring-2 focus:ring-slate-200',
    addBtn: 'bg-white text-slate-700 border-slate-400 hover:bg-slate-50',
  },
};

const INPUT_BASE =
  'border border-slate-300 bg-white rounded px-2 py-1 text-right outline-none transition text-xs ' +
  'disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed';

interface CellInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  theme: Theme;
  width?: string;
  align?: 'right' | 'left';
  placeholder?: string;
}

const CellInput: React.FC<CellInputProps> = ({
  value,
  onChange,
  disabled,
  theme,
  width = 'w-20',
  align = 'right',
  placeholder,
}) => (
  <input
    type="text"
    inputMode={align === 'right' ? 'decimal' : undefined}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    placeholder={placeholder}
    className={`${INPUT_BASE} ${theme.focus} ${width} ${align === 'left' ? 'text-left' : ''}`}
  />
);

interface NameInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  theme: Theme;
}

const NameInput: React.FC<NameInputProps> = ({ value, onChange, disabled, theme }) => (
  <input
    type="text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    className={`w-full min-w-[80px] border border-slate-300 bg-white rounded px-2 py-1 text-center text-xs font-semibold text-slate-800 outline-none transition disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed ${theme.focus}`}
  />
);

const n = (val: any): number => {
  const num = parseFloat(val);
  return isNaN(num) ? 0 : num;
};

const fmt = (val: number): string => {
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getEmptyMonth = (): MonthData => ({
  offPeak: {},
  peak: {},
  flat: {},
  totalTK: '',
  purchaseDomestic: '',
  purchaseProduction: '',
  solar: {},
  generators: {},
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

/* ------------------------------------------------------------------ */
/*  Export / print HTML helpers (markup identical to previous version) */
/* ------------------------------------------------------------------ */
const bandTh = (bg: string, text: string, colspan?: number, rowspan?: number) =>
  `<th${colspan ? ` colspan="${colspan}"` : ''}${rowspan ? ` rowSpan="${rowspan}"` : ''} style="border: 1px solid #000; padding: 5px; background-color: ${bg}; text-align: center; font-weight: bold;">${text}</th>`;

const subTh = (bg: string, text: string, colspan?: number, rowspan?: number) =>
  `<th${colspan ? ` colspan="${colspan}"` : ''}${rowspan ? ` rowSpan="${rowspan}"` : ''} style="border: 1px solid #000; padding: 5px; background-color: ${bg}; text-align: center; font-size: 11px;">${text}</th>`;

const microTh = (bg: string, text: string) =>
  `<th style="border: 1px solid #000; padding: 3px; background-color: ${bg}; font-size: 10px;">${text}</th>`;

const tdR = (val: string, bold: boolean = false) =>
  `<td style="border: 1px solid #000; padding: 5px; text-align: right; ${bold ? 'font-weight: bold; ' : ''}font-size: 11px;">${val}</td>`;

export default function PurchaseElectricitySolarForm({
  selectedUnit,
  selectedYear,
  userRole,
  restGet,
  restSet,
}: PurchaseElectricitySolarFormProps) {
  const isViewer = userRole === 'viewer';
  const safeUnit = selectedUnit || 'UNKNOWN';
  const safeYear = selectedYear || '2025';
  const storageKey = `elec_solar_${safeUnit}_${safeYear}`;
  const unitInfo = getUnitInfo(safeUnit);

  const [meters, setMeters] = useState<Meter[]>([
    { id: 'm1', name: 'Meter 1' },
    { id: 'm2', name: 'Meter 2' },
  ]);

  const [solarMeters, setSolarMeters] = useState<Meter[]>([
    { id: 's1', name: 'Solar Meter 1' },
    { id: 's2', name: 'Solar Meter 2' },
  ]);

  const [generators, setGenerators] = useState<Meter[]>([
    { id: 'g1', name: 'Generator 1' },
    { id: 'g2', name: 'Generator 2' },
  ]);

  const [data, setData] = useState<FormData>({});
  const [isSaved, setIsSaved] = useState(false);
  const [loadedKey, setLoadedKey] = useState('');
  const { gridHandlers, gridError, reportGridError } = useInventoryGrid();
  const { status, error, saveNow } = useHybridAutoSave({
    unit: safeUnit,
    year: safeYear,
    moduleId: 'elec_solar',
    storageKey,
    payload: { meters, solarMeters, generators, data },
    restGet,
    restSet,
    enabled: !isViewer,
    ready: loadedKey === storageKey,
  });

  const [sections, setSections] = useState<Record<SectionKey, boolean>>({
    meters: true,
    totalPurchase: true,
    includeTK: true,
    solar: true,
    generated: true,
    remarks: true,
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);

        if (parsed && Array.isArray(parsed.meters) && parsed.meters.length > 0) setMeters(parsed.meters);
        else setMeters([{ id: 'm1', name: 'Meter 1' }, { id: 'm2', name: 'Meter 2' }]);

        if (parsed && Array.isArray(parsed.solarMeters) && parsed.solarMeters.length > 0) setSolarMeters(parsed.solarMeters);
        else setSolarMeters([{ id: 's1', name: 'Solar Meter 1' }, { id: 's2', name: 'Solar Meter 2' }]);

        if (parsed && Array.isArray(parsed.generators) && parsed.generators.length > 0) setGenerators(parsed.generators);
        else setGenerators([{ id: 'g1', name: 'Generator 1' }, { id: 'g2', name: 'Generator 2' }]);

        if (parsed && parsed.data && typeof parsed.data === 'object') {
          const validatedData: FormData = {};
          MONTHS.forEach(m => {
            const rawMonth = parsed.data[m];
            validatedData[m] = rawMonth && typeof rawMonth === 'object'
              ? {
                  offPeak: rawMonth.offPeak || {},
                  peak: rawMonth.peak || {},
                  flat: rawMonth.flat || {},
                  totalTK: rawMonth.totalTK || '',
                  purchaseDomestic: rawMonth.purchaseDomestic || '',
                  purchaseProduction: rawMonth.purchaseProduction || '',
                  solar: rawMonth.solar || {},
                  generators: rawMonth.generators || {},
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
      console.error('Failed to load local storage', e);
      const initialData: FormData = {};
      MONTHS.forEach(m => { initialData[m] = getEmptyMonth(); });
      setData(initialData);
    }
    setLoadedKey(storageKey);
  }, [storageKey]);

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
    if (['totalTK', 'purchaseDomestic', 'purchaseProduction'].includes(field)) {
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

  const updateNestedQty = (month: string, section: 'offPeak' | 'peak' | 'flat' | 'solar' | 'generators', id: string, value: string) => {
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
            ...(prevMonth[section] || {}),
            [id]: value,
          },
        },
      };
    });
  };

  const updateMeterName = (type: 'meters' | 'solarMeters' | 'generators', id: string, name: string) => {
    if (isViewer) return;
    const setter = type === 'meters' ? setMeters : type === 'solarMeters' ? setSolarMeters : setGenerators;
    setter(prev => prev.map(m => (m.id === id ? { ...m, name } : m)));
  };

  const addMeter = (type: 'meters' | 'solarMeters' | 'generators') => {
    if (isViewer) return;
    const newId = `${type.charAt(0)}${Date.now()}`;
    const setter = type === 'meters' ? setMeters : type === 'solarMeters' ? setSolarMeters : setGenerators;
    const defaultName = type === 'meters' ? 'New Meter' : type === 'solarMeters' ? 'New Solar Meter' : 'New Generator';
    setter(prev => [...prev, { id: newId, name: defaultName }]);
  };

  const removeMeter = (type: 'meters' | 'solarMeters' | 'generators', id: string) => {
    if (isViewer) return;
    const setter = type === 'meters' ? setMeters : type === 'solarMeters' ? setSolarMeters : setGenerators;
    setter(prev => prev.filter(m => m.id !== id));
  };

  const getPurchaseTotal = (row: MonthData) => {
    return meters.reduce((sum, m) => sum + n(row.offPeak?.[m.id]) + n(row.peak?.[m.id]) + n(row.flat?.[m.id]), 0);
  };

  const getSolarTotal = (row: MonthData) => {
    return solarMeters.reduce((sum, m) => sum + n(row.solar?.[m.id]), 0);
  };

  const getGeneratedTotal = (row: MonthData) => {
    return generators.reduce((sum, m) => sum + n(row.generators?.[m.id]), 0);
  };

  const getSolarAllocation = (row: MonthData, type: 'domestic' | 'production') => {
    const totalPurchaseAlloc = n(row.purchaseDomestic) + n(row.purchaseProduction);
    const solarTotal = getSolarTotal(row);
    if (totalPurchaseAlloc > 0) {
      const ratio = type === 'domestic' ? n(row.purchaseDomestic) / totalPurchaseAlloc : n(row.purchaseProduction) / totalPurchaseAlloc;
      return solarTotal * ratio;
    }
    return 0;
  };

  const getGeneratedAllocation = (row: MonthData, type: 'domestic' | 'production') => {
    const totalPurchaseAlloc = n(row.purchaseDomestic) + n(row.purchaseProduction);
    const genTotal = getGeneratedTotal(row);
    if (totalPurchaseAlloc > 0) {
      const ratio = type === 'domestic' ? n(row.purchaseDomestic) / totalPurchaseAlloc : n(row.purchaseProduction) / totalPurchaseAlloc;
      return genTotal * ratio;
    }
    return 0;
  };

  const getYearlySum = (section: 'purchaseTotal' | 'totalTK' | 'purchaseDomestic' | 'purchaseProduction' | 'solarTotal' | 'solarDomestic' | 'solarProduction' | 'genTotal' | 'genDomestic' | 'genProduction') => {
    return MONTHS.reduce((sum, m) => {
      const row = data[m] || getEmptyMonth();
      if (section === 'purchaseTotal') return sum + getPurchaseTotal(row);
      if (section === 'totalTK') return sum + n(row.totalTK);
      if (section === 'purchaseDomestic') return sum + n(row.purchaseDomestic);
      if (section === 'purchaseProduction') return sum + n(row.purchaseProduction);
      if (section === 'solarTotal') return sum + getSolarTotal(row);
      if (section === 'solarDomestic') return sum + getSolarAllocation(row, 'domestic');
      if (section === 'solarProduction') return sum + getSolarAllocation(row, 'production');
      if (section === 'genTotal') return sum + getGeneratedTotal(row);
      if (section === 'genDomestic') return sum + getGeneratedAllocation(row, 'domestic');
      if (section === 'genProduction') return sum + getGeneratedAllocation(row, 'production');
      return sum;
    }, 0);
  };

  const getMeterYearlyTotal = (meterId: string, subCol: 'offPeak' | 'peak' | 'flat') => {
    return MONTHS.reduce((sum, m) => sum + n(data[m]?.[subCol]?.[meterId]), 0);
  };

  const getSolarMeterYearlyTotal = (meterId: string) => {
    return MONTHS.reduce((sum, m) => sum + n(data[m]?.solar?.[meterId]), 0);
  };

  const getGenMeterYearlyTotal = (meterId: string) => {
    return MONTHS.reduce((sum, m) => sum + n(data[m]?.generators?.[meterId]), 0);
  };

  /* ---------------------------------------------------------------- */
  /*  Excel export / print HTML (unchanged output)                     */
  /* ---------------------------------------------------------------- */
  const generateHTMLTemplate = (isPrint: boolean = false) => {
    const title = `Purchase Electricity & Solar Report`;
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

    const monthRowSpan = sections.meters ? 3 : 2;
    const subRowSpan = sections.meters ? 2 : 1;

    // Row 1: section titles
    let row1 = `<tr><th style="border: 1px solid #000; padding: 5px; background-color: #f3f4f6;" rowSpan="${monthRowSpan}">Month</th>`;
    if (sections.meters) {
      row1 += bandTh('#fef3c7', 'PURCHASE ELECTRICITY - METER READINGS (KWH)', meters.length * 3);
    }
    if (sections.totalPurchase) {
      const tkCols = sections.includeTK ? 1 : 0;
      row1 += bandTh('#d1fae5', 'TOTAL PURCHASE ELECTRICITY (KWH)', 3 + tkCols);
    }
    if (sections.solar) {
      row1 += bandTh('#dbeafe', 'SOLAR ELECTRICITY (KWH)', solarMeters.length + 3);
    }
    if (sections.generated) {
      row1 += bandTh('#ffedd5', 'GENERATED ELECTRICITY (KWH)', generators.length + 3);
    }
    if (sections.remarks) {
      row1 += bandTh('#f3f4f6', 'REMARKS', undefined, monthRowSpan);
    }
    row1 += '</tr>';

    // Row 2: meter names and standalone column titles
    let row2 = '<tr>';
    if (sections.meters) {
      meters.forEach(m => {
        row2 += subTh('#fef3c7', m.name, 3);
      });
    }
    if (sections.totalPurchase) {
      row2 += subTh('#d1fae5', 'Total Purchase', undefined, subRowSpan);
      if (sections.includeTK) {
        row2 += subTh('#d1fae5', 'Total TK (BDT)', undefined, subRowSpan);
      }
      row2 += subTh('#d1fae5', 'Domestic Use', undefined, subRowSpan);
      row2 += subTh('#d1fae5', 'Production Use', undefined, subRowSpan);
    }
    if (sections.solar) {
      solarMeters.forEach(m => {
        row2 += subTh('#dbeafe', m.name, undefined, subRowSpan);
      });
      row2 += subTh('#dbeafe', 'Total Solar', undefined, subRowSpan);
      row2 += subTh('#dbeafe', 'Domestic Use (Auto)', undefined, subRowSpan);
      row2 += subTh('#dbeafe', 'Production Use (Auto)', undefined, subRowSpan);
    }
    if (sections.generated) {
      generators.forEach(m => {
        row2 += subTh('#ffedd5', m.name, undefined, subRowSpan);
      });
      row2 += subTh('#ffedd5', 'Total Generated', undefined, subRowSpan);
      row2 += subTh('#ffedd5', 'Domestic Use (Auto)', undefined, subRowSpan);
      row2 += subTh('#ffedd5', 'Production Use (Auto)', undefined, subRowSpan);
    }
    row2 += '</tr>';

    // Row 3: Off Peak / Peak / Flat Rate under each meter
    let row3 = '<tr>';
    if (sections.meters) {
      meters.forEach(() => {
        row3 += microTh('#fef3c7', 'Off Peak') + microTh('#fef3c7', 'Peak') + microTh('#fef3c7', 'Flat Rate');
      });
    }
    row3 += '</tr>';

    const tableHeadersHtml = row1 + row2 + (sections.meters ? row3 : '');

    let tbody = '';
    MONTHS.forEach(m => {
      const row = data[m] || getEmptyMonth();
      tbody += `<tr><td style="border: 1px solid #000; padding: 5px; font-weight: bold; font-size: 11px;">${m}</td>`;

      if (sections.meters) {
        meters.forEach(meter => {
          tbody += tdR(row.offPeak?.[meter.id] || '');
          tbody += tdR(row.peak?.[meter.id] || '');
          tbody += tdR(row.flat?.[meter.id] || '');
        });
      }

      if (sections.totalPurchase) {
        tbody += tdR(fmt(getPurchaseTotal(row)), true);
        if (sections.includeTK) {
          tbody += tdR(row.totalTK || '');
        }
        tbody += tdR(row.purchaseDomestic || '');
        tbody += tdR(row.purchaseProduction || '');
      }

      if (sections.solar) {
        solarMeters.forEach(meter => {
          tbody += tdR(row.solar?.[meter.id] || '');
        });
        tbody += tdR(fmt(getSolarTotal(row)), true);
        tbody += tdR(fmt(getSolarAllocation(row, 'domestic')));
        tbody += tdR(fmt(getSolarAllocation(row, 'production')));
      }

      if (sections.generated) {
        generators.forEach(meter => {
          tbody += tdR(row.generators?.[meter.id] || '');
        });
        tbody += tdR(fmt(getGeneratedTotal(row)), true);
        tbody += tdR(fmt(getGeneratedAllocation(row, 'domestic')));
        tbody += tdR(fmt(getGeneratedAllocation(row, 'production')));
      }

      if (sections.remarks) {
        tbody += `<td style="border: 1px solid #000; padding: 5px; font-size: 11px;">${row.remarks || ''}</td>`;
      }
      tbody += `</tr>`;
    });

    let tfoot = '<tr style="background-color: #f3f4f6; font-weight: bold;"><td style="border: 1px solid #000; padding: 5px; font-size: 11px;">Total</td>';

    if (sections.meters) {
      meters.forEach(meter => {
        tfoot += tdR(fmt(getMeterYearlyTotal(meter.id, 'offPeak')));
        tfoot += tdR(fmt(getMeterYearlyTotal(meter.id, 'peak')));
        tfoot += tdR(fmt(getMeterYearlyTotal(meter.id, 'flat')));
      });
    }

    if (sections.totalPurchase) {
      tfoot += tdR(fmt(getYearlySum('purchaseTotal')));
      if (sections.includeTK) {
        tfoot += tdR(fmt(getYearlySum('totalTK')));
      }
      tfoot += tdR(fmt(getYearlySum('purchaseDomestic')));
      tfoot += tdR(fmt(getYearlySum('purchaseProduction')));
    }

    if (sections.solar) {
      solarMeters.forEach(meter => {
        tfoot += tdR(fmt(getSolarMeterYearlyTotal(meter.id)));
      });
      tfoot += tdR(fmt(getYearlySum('solarTotal')));
      tfoot += tdR(fmt(getYearlySum('solarDomestic')));
      tfoot += tdR(fmt(getYearlySum('solarProduction')));
    }

    if (sections.generated) {
      generators.forEach(meter => {
        tfoot += tdR(fmt(getGenMeterYearlyTotal(meter.id)));
      });
      tfoot += tdR(fmt(getYearlySum('genTotal')));
      tfoot += tdR(fmt(getYearlySum('genDomestic')));
      tfoot += tdR(fmt(getYearlySum('genProduction')));
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
        <title>Purchase Electricity & Solar - ${safeUnit} - ${safeYear}</title>
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
    link.download = `Purchase_Electricity_Solar_${safeUnit}_${safeYear}.xls`;
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

  const toggleSection = (key: SectionKey) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  /* ---------------------------------------------------------------- */
  /*  On-screen UI                                                     */
  /* ---------------------------------------------------------------- */
  const monthRowSpan = sections.meters ? 3 : 2;
  const subRowSpan = sections.meters ? 2 : 1;

  const A = THEMES.amber;
  const E = THEMES.emerald;
  const S = THEMES.sky;
  const O = THEMES.orange;
  const L = THEMES.slate;

  const bandBase = 'px-3 py-2 text-center font-bold uppercase tracking-wide text-xs border-b border-r';
  const subBase = 'px-2 py-2 text-center whitespace-nowrap text-xs font-semibold border-b border-r';

  const renderAddButton = (type: 'meters' | 'solarMeters' | 'generators', label: string, theme: Theme) => {
    if (isViewer) return null;
    return (
      <button
        type="button"
        onClick={() => addMeter(type)}
        className={`no-print inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-semibold normal-case tracking-normal shadow-sm transition ${theme.addBtn}`}
      >
        <Plus size={12} /> {label}
      </button>
    );
  };

  const renderRemoveButton = (type: 'meters' | 'solarMeters' | 'generators', id: string, count: number) => {
    if (isViewer || count <= 1) return null;
    return (
      <button
        type="button"
        onClick={() => removeMeter(type, id)}
        title="Remove"
        className="no-print shrink-0 inline-flex items-center justify-center w-5 h-5 rounded bg-white border border-red-200 text-red-500 hover:bg-red-50 hover:text-red-700 transition"
      >
        <X size={12} />
      </button>
    );
  };

  return (
    <div {...gridHandlers} className="w-full max-w-[95vw] mx-auto p-4 sm:p-6 bg-white rounded-xl shadow-sm border border-slate-200">
      {/* Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Purchase Electricity &amp; Solar</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-slate-500">{unitInfo.fullName}</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Reporting Year: {safeYear}
            </span>
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
      <div className="mb-4 bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm no-print">
        <span className="font-semibold text-slate-700 mr-2">Report Columns / Sections to Export &amp; Print:</span>

        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={sections.meters} onChange={() => toggleSection('meters')} className="accent-amber-600 w-4 h-4" />
          <span>Meter Readings (Purchase)</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={sections.totalPurchase} onChange={() => toggleSection('totalPurchase')} className="accent-emerald-600 w-4 h-4" />
          <span>Total Purchase (kWh)</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={sections.includeTK} onChange={() => toggleSection('includeTK')} disabled={!sections.totalPurchase} className="accent-emerald-600 w-4 h-4 disabled:opacity-50" />
          <span className={!sections.totalPurchase ? 'text-slate-400' : ''}>Include Total TK (BDT)</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={sections.solar} onChange={() => toggleSection('solar')} className="accent-sky-600 w-4 h-4" />
          <span>Solar Electricity (kWh)</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={sections.generated} onChange={() => toggleSection('generated')} className="accent-orange-600 w-4 h-4" />
          <span>Generated Electricity (kWh)</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={sections.remarks} onChange={() => toggleSection('remarks')} className="accent-slate-600 w-4 h-4" />
          <span>Remarks</span>
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
            {/* Row 1 — section bands */}
            <tr>
              <th
                className={`sticky left-0 z-30 w-28 min-w-[112px] px-2 py-2 text-center text-xs font-bold border-b border-r border-slate-300 ${L.band}`}
                rowSpan={monthRowSpan}
              >
                Month
              </th>

              {sections.meters && (
                <th colSpan={meters.length * 3} className={`${bandBase} ${A.band} ${A.border}`}>
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <span>Purchase Electricity - Meter Readings (kWh)</span>
                    {renderAddButton('meters', 'Add Meter', A)}
                  </div>
                </th>
              )}

              {sections.totalPurchase && (
                <th colSpan={3 + (sections.includeTK ? 1 : 0)} className={`${bandBase} ${E.band} ${E.border}`}>
                  Total Purchase Electricity (kWh)
                </th>
              )}

              {sections.solar && (
                <th colSpan={solarMeters.length + 3} className={`${bandBase} ${S.band} ${S.border}`}>
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <span>Solar Electricity (kWh)</span>
                    {renderAddButton('solarMeters', 'Add Solar Meter', S)}
                  </div>
                </th>
              )}

              {sections.generated && (
                <th colSpan={generators.length + 3} className={`${bandBase} ${O.band} ${O.border}`}>
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <span>Generated Electricity (kWh)</span>
                    {renderAddButton('generators', 'Add Generator', O)}
                  </div>
                </th>
              )}

              {sections.remarks && (
                <th className={`${bandBase} border-r-0 ${L.band} ${L.border}`} rowSpan={monthRowSpan}>
                  Remarks
                </th>
              )}
            </tr>

            {/* Row 2 — meter names / column titles */}
            <tr>
              {sections.meters && (
                <>
                  {meters.map((m) => (
                    <th key={m.id} colSpan={3} className={`px-2 py-2 min-w-[150px] border-b border-r ${A.sub} ${A.border}`}>
                      <div className="flex items-center gap-1.5">
                        <NameInput
                          value={m.name}
                          onChange={(v) => updateMeterName('meters', m.id, v)}
                          disabled={isViewer}
                          theme={A}
                        />
                        {renderRemoveButton('meters', m.id, meters.length)}
                      </div>
                    </th>
                  ))}
                </>
              )}

              {sections.totalPurchase && (
                <>
                  <th rowSpan={subRowSpan} className={`${subBase} ${E.sub} ${E.border}`}>Total Purchase</th>
                  {sections.includeTK && (
                    <th rowSpan={subRowSpan} className={`${subBase} ${E.sub} ${E.border}`}>Total TK (BDT)</th>
                  )}
                  <th rowSpan={subRowSpan} className={`${subBase} ${E.sub} ${E.border}`}>Domestic Use</th>
                  <th rowSpan={subRowSpan} className={`${subBase} ${E.sub} ${E.border}`}>Production Use</th>
                </>
              )}

              {sections.solar && (
                <>
                  {solarMeters.map((m) => (
                    <th key={m.id} rowSpan={subRowSpan} className={`px-2 py-2 min-w-[130px] border-b border-r ${S.sub} ${S.border}`}>
                      <div className="flex items-center gap-1.5">
                        <NameInput
                          value={m.name}
                          onChange={(v) => updateMeterName('solarMeters', m.id, v)}
                          disabled={isViewer}
                          theme={S}
                        />
                        {renderRemoveButton('solarMeters', m.id, solarMeters.length)}
                      </div>
                    </th>
                  ))}
                  <th rowSpan={subRowSpan} className={`${subBase} ${S.sub} ${S.border}`}>Total Solar</th>
                  <th rowSpan={subRowSpan} className={`${subBase} ${S.sub} ${S.border}`}>Domestic Use (Auto)</th>
                  <th rowSpan={subRowSpan} className={`${subBase} ${S.sub} ${S.border}`}>Production Use (Auto)</th>
                </>
              )}

              {sections.generated && (
                <>
                  {generators.map((m) => (
                    <th key={m.id} rowSpan={subRowSpan} className={`px-2 py-2 min-w-[130px] border-b border-r ${O.sub} ${O.border}`}>
                      <div className="flex items-center gap-1.5">
                        <NameInput
                          value={m.name}
                          onChange={(v) => updateMeterName('generators', m.id, v)}
                          disabled={isViewer}
                          theme={O}
                        />
                        {renderRemoveButton('generators', m.id, generators.length)}
                      </div>
                    </th>
                  ))}
                  <th rowSpan={subRowSpan} className={`${subBase} ${O.sub} ${O.border}`}>Total Generated</th>
                  <th rowSpan={subRowSpan} className={`${subBase} ${O.sub} ${O.border}`}>Domestic Use (Auto)</th>
                  <th rowSpan={subRowSpan} className={`${subBase} ${O.sub} ${O.border}`}>Production Use (Auto)</th>
                </>
              )}
            </tr>

            {/* Row 3 — Off Peak / Peak / Flat Rate */}
            {sections.meters && (
              <tr>
                {meters.map((m) => (
                  <React.Fragment key={`sub-${m.id}`}>
                    <th className={`px-1 py-1 text-center text-[10px] font-semibold border-b border-r ${A.micro} ${A.border}`}>Off Peak</th>
                    <th className={`px-1 py-1 text-center text-[10px] font-semibold border-b border-r ${A.micro} ${A.border}`}>Peak</th>
                    <th className={`px-1 py-1 text-center text-[10px] font-semibold border-b border-r ${A.micro} ${A.border}`}>Flat Rate</th>
                  </React.Fragment>
                ))}
              </tr>
            )}
          </thead>

          <tbody>
            {MONTHS.map((month) => {
              const row = data[month] || getEmptyMonth();
              return (
                <tr key={month}>
                  <td className="sticky left-0 z-10 px-3 py-1.5 font-semibold text-slate-800 bg-slate-100 border-b border-r border-slate-300 whitespace-nowrap">
                    {month}
                  </td>

                  {sections.meters && (
                    <>
                      {meters.map(m => (
                        <React.Fragment key={`row-${month}-${m.id}`}>
                          <td className={`px-1.5 py-1.5 border-b border-r ${A.tint} ${A.border}`}>
                            <CellInput width="w-20" theme={A} disabled={isViewer} value={row.offPeak?.[m.id] || ''} onChange={(v) => updateNestedQty(month, 'offPeak', m.id, v)} />
                          </td>
                          <td className={`px-1.5 py-1.5 border-b border-r ${A.tint} ${A.border}`}>
                            <CellInput width="w-20" theme={A} disabled={isViewer} value={row.peak?.[m.id] || ''} onChange={(v) => updateNestedQty(month, 'peak', m.id, v)} />
                          </td>
                          <td className={`px-1.5 py-1.5 border-b border-r ${A.tint} ${A.border}`}>
                            <CellInput width="w-20" theme={A} disabled={isViewer} value={row.flat?.[m.id] || ''} onChange={(v) => updateNestedQty(month, 'flat', m.id, v)} />
                          </td>
                        </React.Fragment>
                      ))}
                    </>
                  )}

                  {sections.totalPurchase && (
                    <>
                      <td title="Auto-calculated" className={`px-3 py-1.5 text-right font-bold border-b border-r ${E.lockedStrong} ${E.border}`}>
                        {fmt(getPurchaseTotal(row))}
                      </td>
                      {sections.includeTK && (
                        <td className={`px-1.5 py-1.5 border-b border-r ${E.tint} ${E.border}`}>
                          <CellInput width="w-24" theme={E} disabled={isViewer} value={row.totalTK} onChange={(v) => updateMonthField(month, 'totalTK', v)} />
                        </td>
                      )}
                      <td className={`px-1.5 py-1.5 border-b border-r ${E.tint} ${E.border}`}>
                        <CellInput width="w-24" theme={E} disabled={isViewer} value={row.purchaseDomestic} onChange={(v) => updateMonthField(month, 'purchaseDomestic', v)} />
                      </td>
                      <td className={`px-1.5 py-1.5 border-b border-r ${E.tint} ${E.border}`}>
                        <CellInput width="w-24" theme={E} disabled={isViewer} value={row.purchaseProduction} onChange={(v) => updateMonthField(month, 'purchaseProduction', v)} />
                      </td>
                    </>
                  )}

                  {sections.solar && (
                    <>
                      {solarMeters.map(m => (
                        <td key={`row-${month}-${m.id}`} className={`px-1.5 py-1.5 border-b border-r ${S.tint} ${S.border}`}>
                          <CellInput width="w-24" theme={S} disabled={isViewer} value={row.solar?.[m.id] || ''} onChange={(v) => updateNestedQty(month, 'solar', m.id, v)} />
                        </td>
                      ))}
                      <td title="Auto-calculated" className={`px-3 py-1.5 text-right font-bold border-b border-r ${S.lockedStrong} ${S.border}`}>
                        {fmt(getSolarTotal(row))}
                      </td>
                      <td title="Auto-calculated from Domestic/Production ratio" className={`px-3 py-1.5 text-right font-bold border-b border-r ${S.locked} ${S.border}`}>
                        {fmt(getSolarAllocation(row, 'domestic'))}
                      </td>
                      <td title="Auto-calculated from Domestic/Production ratio" className={`px-3 py-1.5 text-right font-bold border-b border-r ${S.locked} ${S.border}`}>
                        {fmt(getSolarAllocation(row, 'production'))}
                      </td>
                    </>
                  )}

                  {sections.generated && (
                    <>
                      {generators.map(m => (
                        <td key={`row-${month}-${m.id}`} className={`px-1.5 py-1.5 border-b border-r ${O.tint} ${O.border}`}>
                          <CellInput width="w-24" theme={O} disabled={isViewer} value={row.generators?.[m.id] || ''} onChange={(v) => updateNestedQty(month, 'generators', m.id, v)} />
                        </td>
                      ))}
                      <td title="Auto-calculated" className={`px-3 py-1.5 text-right font-bold border-b border-r ${O.lockedStrong} ${O.border}`}>
                        {fmt(getGeneratedTotal(row))}
                      </td>
                      <td title="Auto-calculated from Domestic/Production ratio" className={`px-3 py-1.5 text-right font-bold border-b border-r ${O.locked} ${O.border}`}>
                        {fmt(getGeneratedAllocation(row, 'domestic'))}
                      </td>
                      <td title="Auto-calculated from Domestic/Production ratio" className={`px-3 py-1.5 text-right font-bold border-b border-r ${O.locked} ${O.border}`}>
                        {fmt(getGeneratedAllocation(row, 'production'))}
                      </td>
                    </>
                  )}

                  {sections.remarks && (
                    <td className={`px-1.5 py-1.5 border-b ${L.tint} ${L.border}`}>
                      <CellInput
                        width="w-full min-w-[160px]"
                        align="left"
                        theme={L}
                        disabled={isViewer}
                        value={row.remarks}
                        onChange={(v) => updateMonthField(month, 'remarks', v)}
                        placeholder="Notes..."
                      />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr className="font-bold text-xs">
              <td className="sticky left-0 z-10 px-3 py-2.5 bg-slate-300 text-slate-900 border-t-2 border-r border-slate-500">
                Total
              </td>

              {sections.meters && (
                <>
                  {meters.map(m => (
                    <React.Fragment key={`tot-${m.id}`}>
                      <td className={`px-3 py-2.5 text-right border-t-2 border-r border-t-amber-500 ${A.foot} ${A.border}`}>{fmt(getMeterYearlyTotal(m.id, 'offPeak'))}</td>
                      <td className={`px-3 py-2.5 text-right border-t-2 border-r border-t-amber-500 ${A.foot} ${A.border}`}>{fmt(getMeterYearlyTotal(m.id, 'peak'))}</td>
                      <td className={`px-3 py-2.5 text-right border-t-2 border-r border-t-amber-500 ${A.foot} ${A.border}`}>{fmt(getMeterYearlyTotal(m.id, 'flat'))}</td>
                    </React.Fragment>
                  ))}
                </>
              )}

              {sections.totalPurchase && (
                <>
                  <td className={`px-3 py-2.5 text-right border-t-2 border-r border-t-emerald-500 ${E.foot} ${E.border}`}>{fmt(getYearlySum('purchaseTotal'))}</td>
                  {sections.includeTK && (
                    <td className={`px-3 py-2.5 text-right border-t-2 border-r border-t-emerald-500 ${E.foot} ${E.border}`}>{fmt(getYearlySum('totalTK'))}</td>
                  )}
                  <td className={`px-3 py-2.5 text-right border-t-2 border-r border-t-emerald-500 ${E.foot} ${E.border}`}>{fmt(getYearlySum('purchaseDomestic'))}</td>
                  <td className={`px-3 py-2.5 text-right border-t-2 border-r border-t-emerald-500 ${E.foot} ${E.border}`}>{fmt(getYearlySum('purchaseProduction'))}</td>
                </>
              )}

              {sections.solar && (
                <>
                  {solarMeters.map(m => (
                    <td key={`tot-${m.id}`} className={`px-3 py-2.5 text-right border-t-2 border-r border-t-sky-500 ${S.foot} ${S.border}`}>{fmt(getSolarMeterYearlyTotal(m.id))}</td>
                  ))}
                  <td className={`px-3 py-2.5 text-right border-t-2 border-r border-t-sky-500 ${S.foot} ${S.border}`}>{fmt(getYearlySum('solarTotal'))}</td>
                  <td className={`px-3 py-2.5 text-right border-t-2 border-r border-t-sky-500 ${S.foot} ${S.border}`}>{fmt(getYearlySum('solarDomestic'))}</td>
                  <td className={`px-3 py-2.5 text-right border-t-2 border-r border-t-sky-500 ${S.foot} ${S.border}`}>{fmt(getYearlySum('solarProduction'))}</td>
                </>
              )}

              {sections.generated && (
                <>
                  {generators.map(m => (
                    <td key={`tot-${m.id}`} className={`px-3 py-2.5 text-right border-t-2 border-r border-t-orange-500 ${O.foot} ${O.border}`}>{fmt(getGenMeterYearlyTotal(m.id))}</td>
                  ))}
                  <td className={`px-3 py-2.5 text-right border-t-2 border-r border-t-orange-500 ${O.foot} ${O.border}`}>{fmt(getYearlySum('genTotal'))}</td>
                  <td className={`px-3 py-2.5 text-right border-t-2 border-r border-t-orange-500 ${O.foot} ${O.border}`}>{fmt(getYearlySum('genDomestic'))}</td>
                  <td className={`px-3 py-2.5 text-right border-t-2 border-r border-t-orange-500 ${O.foot} ${O.border}`}>{fmt(getYearlySum('genProduction'))}</td>
                </>
              )}

              {sections.remarks && (
                <td className={`px-3 py-2.5 text-center border-t-2 border-t-slate-500 ${L.foot}`}>-</td>
              )}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
