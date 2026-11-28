import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { UNIT_DIRECTORY } from '../utils/unitDirectory';
import type { InventoryRestGet, InventoryRestSet } from '../utils/inventoryDataEntry';
import {
  InventorySaveStatus,
  normalizeNumericInput,
  useHybridAutoSave,
  useInventoryGrid,
} from '../utils/inventoryDataEntry';

/* -------------------------------------------------------------------------- */
/*  Types & constants                                                          */
/* -------------------------------------------------------------------------- */

interface RefrigerantOdsFormProps {
  selectedUnit: string;
  selectedYear: number | string;
  userRole?: string;
  restGet?: InventoryRestGet;
  restSet?: InventoryRestSet;
}

interface RefrigerantDef {
  name: string;
  gwp: number;
  custom: boolean;
}

interface CustomRef {
  name: string;
  gwp: number;
}

interface MonthRow {
  values: Record<string, string>;
  remarks: string;
}

interface StoredData {
  customRefs: CustomRef[];
  rows: MonthRow[];
}

type ColKind = 'month' | 'kg' | 'ghg' | 'totalKg' | 'totalGhg' | 'remarks';

interface Col {
  id: string;
  kind: ColKind;
  label: string;
  refName?: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DEFAULT_GWP: Record<string, number> = {
  'R-22': 1810,
  'R-407c': 1774,
  'R-410A': 2088,
  'R-134a': 1430,
  'R-32': 675,
};

const DEFAULT_REFRIGERANTS: string[] = ['R-22', 'R-407c', 'R-410A', 'R-134a', 'R-32'];

const DECIMAL_REGEX = /^\d*(\.\d{0,2})?$/;

/* Section styling (static class strings so Tailwind can detect them) */
const STYLE: Record<
  ColKind,
  { th: string; cell: string; focus: string; hex: { bg: string; cell: string; text: string; border: string } }
> = {
  month: {
    th: 'bg-slate-200 text-slate-800 border-slate-300',
    cell: 'bg-slate-100 text-slate-800',
    focus: 'focus:ring-slate-400 focus:border-slate-400',
    hex: { bg: '#e2e8f0', cell: '#f1f5f9', text: '#1e293b', border: '#cbd5e1' },
  },
  kg: {
    th: 'bg-sky-100 text-sky-900 border-sky-200',
    cell: 'bg-sky-50/60',
    focus: 'focus:ring-sky-400 focus:border-sky-400',
    hex: { bg: '#e0f2fe', cell: '#f0f9ff', text: '#0c4a6e', border: '#bae6fd' },
  },
  ghg: {
    th: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    cell: 'bg-emerald-50 text-emerald-900',
    focus: 'focus:ring-emerald-400 focus:border-emerald-400',
    hex: { bg: '#d1fae5', cell: '#ecfdf5', text: '#064e3b', border: '#a7f3d0' },
  },
  totalKg: {
    th: 'bg-indigo-100 text-indigo-900 border-indigo-200',
    cell: 'bg-indigo-50 text-indigo-900',
    focus: 'focus:ring-indigo-400 focus:border-indigo-400',
    hex: { bg: '#e0e7ff', cell: '#eef2ff', text: '#312e81', border: '#c7d2fe' },
  },
  totalGhg: {
    th: 'bg-amber-100 text-amber-900 border-amber-200',
    cell: 'bg-amber-50 text-amber-900',
    focus: 'focus:ring-amber-400 focus:border-amber-400',
    hex: { bg: '#fef3c7', cell: '#fffbeb', text: '#78350f', border: '#fde68a' },
  },
  remarks: {
    th: 'bg-rose-100 text-rose-900 border-rose-200',
    cell: 'bg-rose-50/60',
    focus: 'focus:ring-rose-400 focus:border-rose-400',
    hex: { bg: '#ffe4e6', cell: '#fff1f2', text: '#881337', border: '#fecdd3' },
  },
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const emptyRows = (): MonthRow[] => MONTHS.map(() => ({ values: {}, remarks: '' }));

const toNum = (v: string | undefined): number => {
  if (!v) return 0;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const fmt = (n: number): string => (Number.isFinite(n) ? n : 0).toFixed(2);

const esc = (s: string): string =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const toPositive = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Flatten any nested settings object into { normalizedName: number } */
const collectFactors = (obj: unknown, out: Record<string, number>, depth: number): void => {
  if (!obj || typeof obj !== 'object' || depth > 3) return;
  Object.entries(obj as Record<string, unknown>).forEach(([key, val]) => {
    const direct = toPositive(val);
    if (direct !== null) {
      out[norm(key)] = direct;
      return;
    }
    if (val && typeof val === 'object') {
      const rec = val as Record<string, unknown>;
      const inner = toPositive(rec.gwp) ?? toPositive(rec.value) ?? toPositive(rec.factor);
      if (inner !== null) {
        out[norm(key)] = inner;
        return;
      }
      collectFactors(val, out, depth + 1);
    }
  });
};

const readYearFactors = (year: number | string): Record<string, number> => {
  const out: Record<string, number> = {};
  try {
    if (typeof window === 'undefined') return out;
    const raw = window.localStorage.getItem('sustainability_factors_by_year');
    if (!raw) return out;
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      const forYear = (parsed as Record<string, unknown>)[String(year)];
      collectFactors(forYear, out, 0);
    }
  } catch {
    /* ignore corrupt settings */
  }
  return out;
};

const resolveDefaultGwp = (name: string, factors: Record<string, number>): number => {
  const k = norm(name);
  return factors[k] ?? factors['gwp' + k] ?? factors[k + 'gwp'] ?? DEFAULT_GWP[name];
};

interface UnitInfo {
  fullName: string;
  address: string;
}

const resolveUnit = (selectedUnit: string): UnitInfo => {
  const fallback: UnitInfo = { fullName: selectedUnit, address: 'Epyllion Group, Dhaka, Bangladesh' };
  try {
    const dir: unknown = UNIT_DIRECTORY;
    let found: Record<string, unknown> | undefined;
    if (Array.isArray(dir)) {
      found = (dir as Record<string, unknown>[]).find((u) => {
        if (!u || typeof u !== 'object') return false;
        return ['id', 'key', 'code', 'name', 'unit', 'shortName', 'fullName', 'label', 'value'].some(
          (f) => u[f] !== undefined && String(u[f]) === selectedUnit,
        );
      });
    } else if (dir && typeof dir === 'object') {
      const hit = (dir as Record<string, unknown>)[selectedUnit];
      if (hit && typeof hit === 'object') found = hit as Record<string, unknown>;
    }
    if (found) {
      const fullName = typeof found.fullName === 'string' && found.fullName ? found.fullName : fallback.fullName;
      const address = typeof found.address === 'string' && found.address ? found.address : fallback.address;
      return { fullName, address };
    }
  } catch {
    /* fall through */
  }
  return fallback;
};

const loadStored = (key: string): StoredData => {
  const base: StoredData = { customRefs: [], rows: emptyRows() };
  try {
    if (typeof window === 'undefined') return base;
    const raw = window.localStorage.getItem(key);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<StoredData>;
    const customRefs = Array.isArray(parsed.customRefs)
      ? parsed.customRefs.filter(
          (c): c is CustomRef => !!c && typeof c.name === 'string' && typeof c.gwp === 'number' && Number.isFinite(c.gwp),
        )
      : [];
    const rows = emptyRows().map((blank, i) => {
      const src = Array.isArray(parsed.rows) ? parsed.rows[i] : undefined;
      if (!src || typeof src !== 'object') return blank;
      const values: Record<string, string> = {};
      if (src.values && typeof src.values === 'object') {
        Object.entries(src.values).forEach(([k, v]) => {
          if (typeof v === 'string') values[k] = v;
        });
      }
      return { values, remarks: typeof src.remarks === 'string' ? src.remarks : '' };
    });
    return { customRefs, rows };
  } catch {
    return base;
  }
};

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

const RefrigerantOdsForm: React.FC<RefrigerantOdsFormProps> = ({ selectedUnit, selectedYear, userRole, restGet, restSet }) => {
  const isViewer = userRole === 'viewer';
  const storageKey = `refrigerant_ods_${selectedUnit}_${selectedYear}`;
  const logoUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/epyllion-logo.png` : '/epyllion-logo.png';

  const unitInfo = useMemo(() => resolveUnit(selectedUnit), [selectedUnit]);

  const [customRefs, setCustomRefs] = useState<CustomRef[]>([]);
  const [rows, setRows] = useState<MonthRow[]>(emptyRows());
  const [loadedKey, setLoadedKey] = useState<string>('');
  const [factors, setFactors] = useState<Record<string, number>>({});
  const { gridHandlers, gridError, reportGridError } = useInventoryGrid();
  const { status, error, saveNow } = useHybridAutoSave({
    unit: selectedUnit,
    year: selectedYear,
    moduleId: 'refrigerant_ods',
    storageKey,
    payload: { customRefs, rows },
    restGet,
    restSet,
    enabled: !isViewer,
    ready: loadedKey === storageKey,
  });

  const [newName, setNewName] = useState('');
  const [newGwp, setNewGwp] = useState('');
  const [addError, setAddError] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const [includeKg, setIncludeKg] = useState(true);
  const [includeGhg, setIncludeGhg] = useState(true);
  const [includeRemarks, setIncludeRemarks] = useState(true);

  /* ---- Load data when unit / year changes ---- */
  useEffect(() => {
    const data = loadStored(storageKey);
    setCustomRefs(data.customRefs);
    setRows(data.rows);
    setLoadedKey(storageKey);
  }, [storageKey]);

  /* ---- Persist data (only after the current key has finished loading) ---- */
  useEffect(() => {
    if (loadedKey !== storageKey) return;
    try {
      const payload: StoredData = { customRefs, rows };
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      /* storage unavailable */
    }
  }, [customRefs, rows, loadedKey, storageKey]);

  /* ---- Year-wise GWP factors from Settings ---- */
  useEffect(() => {
    setFactors(readYearFactors(selectedYear));
    const onStorage = () => setFactors(readYearFactors(selectedYear));
    if (typeof window === 'undefined') return undefined;
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [selectedYear]);

  /* ---- Active refrigerants ---- */
  const refrigerants: RefrigerantDef[] = useMemo(() => {
    const defaults: RefrigerantDef[] = DEFAULT_REFRIGERANTS.map((name) => ({
      name,
      gwp: resolveDefaultGwp(name, factors),
      custom: false,
    }));
    const customs: RefrigerantDef[] = customRefs.map((c) => ({ name: c.name, gwp: c.gwp, custom: true }));
    return [...defaults, ...customs];
  }, [factors, customRefs]);

  /* ---- Column model ---- */
  const columns: Col[] = useMemo(() => {
    const cols: Col[] = [{ id: 'month', kind: 'month', label: 'Month' }];
    refrigerants.forEach((r) => {
      cols.push({ id: `kg:${r.name}`, kind: 'kg', label: `${r.name} (kg)`, refName: r.name });
      cols.push({ id: `ghg:${r.name}`, kind: 'ghg', label: `GHG from ${r.name} (kg CO₂e)`, refName: r.name });
    });
    cols.push({ id: 'totalKg', kind: 'totalKg', label: 'Total Refrigerant (kg)' });
    cols.push({ id: 'totalGhg', kind: 'totalGhg', label: 'Total GHG Emission (kg CO₂e)' });
    cols.push({ id: 'remarks', kind: 'remarks', label: 'Remarks' });
    return cols;
  }, [refrigerants]);

  /* ---- Calculations ---- */
  const gwpByName = useMemo(() => {
    const m: Record<string, number> = {};
    refrigerants.forEach((r) => {
      m[r.name] = r.gwp;
    });
    return m;
  }, [refrigerants]);

  const calc = useMemo(() => {
    return rows.map((row) => {
      const kg: Record<string, number> = {};
      const ghg: Record<string, number> = {};
      let totalKg = 0;
      let totalGhg = 0;
      refrigerants.forEach((r) => {
        const amount = toNum(row.values[r.name]);
        const emission = amount * (gwpByName[r.name] || 0);
        kg[r.name] = amount;
        ghg[r.name] = emission;
        totalKg += amount;
        totalGhg += emission;
      });
      return { kg, ghg, totalKg, totalGhg };
    });
  }, [rows, refrigerants, gwpByName]);

  const totals = useMemo(() => {
    const kg: Record<string, number> = {};
    const ghg: Record<string, number> = {};
    let totalKg = 0;
    let totalGhg = 0;
    refrigerants.forEach((r) => {
      kg[r.name] = calc.reduce((s, c) => s + (c.kg[r.name] || 0), 0);
      ghg[r.name] = calc.reduce((s, c) => s + (c.ghg[r.name] || 0), 0);
    });
    calc.forEach((c) => {
      totalKg += c.totalKg;
      totalGhg += c.totalGhg;
    });
    return { kg, ghg, totalKg, totalGhg };
  }, [calc, refrigerants]);

  /* ---- Handlers ---- */
  const handleKgChange = useCallback((monthIndex: number, refName: string, value: string) => {
    if (isViewer) return;
    const normalized = normalizeNumericInput(value);
    if (normalized === null) {
      reportGridError(value.trim().startsWith('-') ? 'Negative value not allowed' : 'Invalid text pasted in numeric cell');
      return;
    }
    setRows((prev) =>
      prev.map((row, i) => (i === monthIndex ? { ...row, values: { ...row.values, [refName]: normalized } } : row)),
    );
  }, [isViewer, reportGridError]);

  const handleRemarksChange = useCallback((monthIndex: number, value: string) => {
    if (isViewer) return;
    setRows((prev) => prev.map((row, i) => (i === monthIndex ? { ...row, remarks: value } : row)));
  }, [isViewer]);

  const handleAddRefrigerant = () => {
    if (isViewer) return;
    const name = newName.trim();
    const gwp = parseFloat(newGwp);
    if (!name) {
      setAddError('Enter a refrigerant name, for example R-404A.');
      return;
    }
    if (refrigerants.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
      setAddError(`${name} is already in the table.`);
      return;
    }
    if (!Number.isFinite(gwp) || gwp <= 0) {
      setAddError('Enter a GWP factor greater than 0.');
      return;
    }
    setCustomRefs((prev) => [...prev, { name, gwp }]);
    setNewName('');
    setNewGwp('');
    setAddError('');
    setShowAdd(false);
  };

  const handleRemoveRefrigerant = (name: string) => {
    if (isViewer) return;
    setCustomRefs((prev) => prev.filter((c) => c.name !== name));
    setRows((prev) =>
      prev.map((row) => {
        const values = { ...row.values };
        delete values[name];
        return { ...row, values };
      }),
    );
  };

  /* ---- Cell text (shared by screen totals, Excel and Print) ---- */
  const cellText = (col: Col, mi: number): string => {
    const c = calc[mi];
    if (!c) return '';
    switch (col.kind) {
      case 'month':
        return MONTHS[mi];
      case 'kg':
        return col.refName ? fmt(c.kg[col.refName] || 0) : '';
      case 'ghg':
        return col.refName ? fmt(c.ghg[col.refName] || 0) : '';
      case 'totalKg':
        return fmt(c.totalKg);
      case 'totalGhg':
        return fmt(c.totalGhg);
      case 'remarks':
        return rows[mi]?.remarks || '';
      default:
        return '';
    }
  };

  const totalText = (col: Col): string => {
    switch (col.kind) {
      case 'month':
        return 'Total';
      case 'kg':
        return col.refName ? fmt(totals.kg[col.refName] || 0) : '';
      case 'ghg':
        return col.refName ? fmt(totals.ghg[col.refName] || 0) : '';
      case 'totalKg':
        return fmt(totals.totalKg);
      case 'totalGhg':
        return fmt(totals.totalGhg);
      default:
        return '';
    }
  };

  const exportColumns = (): Col[] =>
    columns.filter((c) => {
      if (c.kind === 'month') return true;
      if (c.kind === 'kg' || c.kind === 'totalKg') return includeKg;
      if (c.kind === 'ghg' || c.kind === 'totalGhg') return includeGhg;
      if (c.kind === 'remarks') return includeRemarks;
      return true;
    });

  const buildReportHtml = (): string | null => {
    const cols = exportColumns();
    if (cols.filter((c) => c.kind !== 'month' && c.kind !== 'remarks').length === 0) {
      return null;
    }
    const span = cols.length;
    const head = cols
      .map((c) => {
        const h = STYLE[c.kind].hex;
        return `<th style="background:${h.bg};color:${h.text};border:1px solid #94a3b8;padding:6px 5px;font-size:10px;font-weight:700;text-align:center;vertical-align:middle;">${esc(c.label)}</th>`;
      })
      .join('');
    const body = MONTHS.map((_, mi) => {
      const tds = cols
        .map((c) => {
          const h = STYLE[c.kind].hex;
          const align = c.kind === 'month' || c.kind === 'remarks' ? 'left' : 'right';
          const weight = c.kind === 'month' ? 'font-weight:600;' : '';
          return `<td style="background:${h.cell};border:1px solid #cbd5e1;padding:5px;font-size:10px;text-align:${align};${weight}">${esc(cellText(c, mi))}</td>`;
        })
        .join('');
      return `<tr>${tds}</tr>`;
    }).join('');
    const foot = cols
      .map((c) => {
        const h = STYLE[c.kind].hex;
        const align = c.kind === 'month' || c.kind === 'remarks' ? 'left' : 'right';
        return `<td style="background:${h.bg};color:${h.text};border:1px solid #94a3b8;padding:6px 5px;font-size:10px;font-weight:700;text-align:${align};">${esc(totalText(c))}</td>`;
      })
      .join('');

    return `
      <table style="width:100%;border-collapse:collapse;margin-bottom:6px;">
        <tr>
          <td colspan="${span}" style="text-align:center;padding:4px 0;">
            <img src="${esc(logoUrl)}" alt="Epyllion Group" height="60" style="height:60px;" />
          </td>
        </tr>
        <tr><td colspan="${span}" style="text-align:center;font-size:20px;font-weight:800;letter-spacing:1px;">EPYLLION GROUP</td></tr>
        <tr><td colspan="${span}" style="text-align:center;font-size:14px;font-weight:700;">${esc(unitInfo.fullName)}</td></tr>
        <tr><td colspan="${span}" style="text-align:center;font-size:11px;color:#475569;">${esc(unitInfo.address)}</td></tr>
        <tr><td colspan="${span}" style="text-align:center;font-size:12px;font-weight:700;padding:6px 0 8px;">Refrigerant &amp; ODS Inventory &mdash; Reporting Year: ${esc(String(selectedYear))}</td></tr>
      </table>
      <table style="width:100%;border-collapse:collapse;table-layout:auto;">
        <thead><tr>${head}</tr></thead>
        <tbody>${body}<tr>${foot}</tr></tbody>
      </table>
      <table style="width:100%;border-collapse:collapse;margin-top:70px;">
        <tr>
          <td style="width:33%;text-align:center;font-size:11px;"><div style="border-top:1px solid #0f172a;width:70%;margin:0 auto;padding-top:4px;">Prepared By</div></td>
          <td style="width:33%;text-align:center;font-size:11px;"><div style="border-top:1px solid #0f172a;width:70%;margin:0 auto;padding-top:4px;">Checked By</div></td>
          <td style="width:33%;text-align:center;font-size:11px;"><div style="border-top:1px solid #0f172a;width:70%;margin:0 auto;padding-top:4px;">Approved By</div></td>
        </tr>
      </table>`;
  };

  const handleDownloadExcel = () => {
    const inner = buildReportHtml();
    if (!inner) {
      window.alert('Select at least one of Refrigerant Quantities or GHG Emissions to export.');
      return;
    }
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8" /><title>Refrigerant ODS</title>
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Refrigerant ODS</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
</head><body style="font-family:Arial,Helvetica,sans-serif;">${inner}</body></html>`;
    try {
      const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Refrigerant_ODS_${selectedUnit}_${selectedYear}.xls`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      window.alert('Could not create the Excel file in this browser.');
    }
  };

  const handlePrint = () => {
    const inner = buildReportHtml();
    if (!inner) {
      window.alert('Select at least one of Refrigerant Quantities or GHG Emissions to print.');
      return;
    }
    const win = window.open('', '_blank');
    if (!win) {
      window.alert('The print window was blocked. Allow pop-ups for this site and try again.');
      return;
    }
    win.document.open();
    win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<title>Refrigerant ODS - ${esc(selectedUnit)} - ${esc(String(selectedYear))}</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; color: #0f172a; }
  body { padding: 4mm; }
  table { width: 100%; }
  th, td { word-break: break-word; overflow-wrap: anywhere; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style></head>
<body>${inner}
<script>
  window.onload = function () {
    var img = document.images && document.images[0];
    var go = function () { setTimeout(function () { window.focus(); window.print(); }, 300); };
    if (img && !img.complete) { img.onload = go; img.onerror = go; } else { go(); }
  };
</script>
</body></html>`);
    win.document.close();
  };

  /* ---------------------------------------------------------------------- */
  /*  Render                                                                 */
  /* ---------------------------------------------------------------------- */

  const inputBase =
    'w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 shadow-sm outline-none transition focus:ring-2';

  return (
    <div {...gridHandlers} className="space-y-4 p-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Refrigerant &amp; ODS</h2>
          <p className="text-sm text-slate-500">
            {unitInfo.fullName} · Reporting Year {selectedYear}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isViewer && (
            <button
              type="button"
              onClick={() => { void saveNow(); }}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              Save Data
            </button>
          )}
          <button
            type="button"
            onClick={handleDownloadExcel}
            className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-100"
          >
            Download Excel (.xls)
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-800 shadow-sm transition hover:bg-indigo-100"
          >
            Print / Save PDF
          </button>
        </div>
        <InventorySaveStatus status={status} error={error} gridError={gridError} />
      </div>

      {/* GWP status badge */}
      <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
        <p className="mb-2 text-sm font-semibold text-sky-900">Active GWP factors for {selectedYear} (read-only)</p>
        <div className="flex flex-wrap gap-2">
          {refrigerants.map((r) => (
            <span
              key={r.name}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${
                r.custom
                  ? 'border-violet-200 bg-violet-100 text-violet-900'
                  : 'border-sky-200 bg-white text-sky-900'
              }`}
            >
              {r.name}: {r.gwp}
              {r.custom && !isViewer && (
                <button
                  type="button"
                  aria-label={`Remove ${r.name}`}
                  title={`Remove ${r.name}`}
                  onClick={() => handleRemoveRefrigerant(r.name)}
                  className="ml-1 rounded-full px-1.5 text-sm leading-none text-violet-700 transition hover:bg-violet-200"
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Add refrigerant */}
      <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3">
        {!showAdd && !isViewer ? (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="rounded-lg border border-violet-300 bg-white px-3 py-2 text-sm font-semibold text-violet-800 shadow-sm transition hover:bg-violet-100"
          >
            + Add Refrigerant
          </button>
        ) : showAdd && !isViewer ? (
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm text-violet-900">
              <span className="mb-1 block font-semibold">Refrigerant name</span>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="R-404A"
                className={`${inputBase} w-40 focus:ring-violet-400 focus:border-violet-400`}
              />
            </label>
            <label className="text-sm text-violet-900">
              <span className="mb-1 block font-semibold">GWP factor</span>
              <input
                type="text"
                inputMode="decimal"
                value={newGwp}
                onChange={(e) => {
                  if (DECIMAL_REGEX.test(e.target.value)) setNewGwp(e.target.value);
                }}
                placeholder="3922"
                className={`${inputBase} w-32 focus:ring-violet-400 focus:border-violet-400`}
              />
            </label>
            <button
              type="button"
              onClick={handleAddRefrigerant}
              className="rounded-lg border border-violet-400 bg-violet-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
            >
              Add to table
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAdd(false);
                setAddError('');
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
            >
              Cancel
            </button>
            {addError && <p className="w-full text-sm font-medium text-rose-700">{addError}</p>}
          </div>
        ) : null}
      </div>

      {/* Export filter */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <span className="text-sm font-semibold text-slate-700">Include in Excel and Print:</span>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-sky-900">
          <input
            type="checkbox"
            checked={includeKg}
            onChange={(e) => setIncludeKg(e.target.checked)}
            className="h-4 w-4 accent-sky-600"
          />
          Include Refrigerant Quantities (kg)
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-emerald-900">
          <input
            type="checkbox"
            checked={includeGhg}
            onChange={(e) => setIncludeGhg(e.target.checked)}
            className="h-4 w-4 accent-emerald-600"
          />
          Include GHG Emissions (kg CO₂e)
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-rose-900">
          <input
            type="checkbox"
            checked={includeRemarks}
            onChange={(e) => setIncludeRemarks(e.target.checked)}
            className="h-4 w-4 accent-rose-600"
          />
          Include Remarks
        </label>
      </div>

      {/* Table */}
      <div className="max-h-[70vh] overflow-auto rounded-xl border border-slate-300 bg-white shadow-sm">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              {columns.map((col) => {
                const s = STYLE[col.kind];
                const isMonth = col.kind === 'month';
                return (
                  <th
                    key={col.id}
                    className={`sticky top-0 border-b border-r px-3 py-2 text-center text-xs font-bold ${s.th} ${
                      isMonth ? 'left-0 z-30 min-w-[110px]' : 'z-20 min-w-[130px]'
                    } ${col.kind === 'remarks' ? 'min-w-[200px]' : ''}`}
                  >
                    {col.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {MONTHS.map((month, mi) => (
              <tr key={month}>
                {columns.map((col) => {
                  const s = STYLE[col.kind];
                  const base = `border-b border-r border-slate-200 px-2 py-1.5 ${s.cell}`;
                  if (col.kind === 'month') {
                    return (
                      <td key={col.id} className={`sticky left-0 z-10 px-3 py-1.5 font-semibold border-b border-r border-slate-300 ${s.cell}`}>
                        {month}
                      </td>
                    );
                  }
                  if (col.kind === 'kg' && col.refName) {
                    const refName = col.refName;
                    return (
                      <td key={col.id} className={base}>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={rows[mi]?.values[refName] ?? ''}
                          disabled={isViewer}
                          onChange={(e) => handleKgChange(mi, refName, e.target.value)}
                          placeholder="0.00"
                          className={`${inputBase} text-right ${s.focus}`}
                        />
                      </td>
                    );
                  }
                  if (col.kind === 'remarks') {
                    return (
                      <td key={col.id} className={base}>
                        <input
                          type="text"
                          value={rows[mi]?.remarks ?? ''}
                          disabled={isViewer}
                          onChange={(e) => handleRemarksChange(mi, e.target.value)}
                          placeholder="Add a note"
                          className={`${inputBase} ${s.focus}`}
                        />
                      </td>
                    );
                  }
                  /* Locked, auto-calculated cells (no input element) */
                  return (
                    <td
                      key={col.id}
                      title="Auto-calculated"
                      className={`${base} cursor-not-allowed text-right font-medium tabular-nums`}
                    >
                      {cellText(col, mi)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              {columns.map((col) => {
                const s = STYLE[col.kind];
                const isMonth = col.kind === 'month';
                return (
                  <td
                    key={col.id}
                    className={`sticky bottom-0 border-r border-t-2 border-slate-400 px-3 py-2 font-bold tabular-nums ${s.th} ${
                      isMonth ? 'left-0 z-30 text-left' : 'z-20'
                    } ${col.kind === 'remarks' || col.kind === 'month' ? '' : 'text-right'}`}
                  >
                    {totalText(col)}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export { RefrigerantOdsForm };
export default RefrigerantOdsForm;
