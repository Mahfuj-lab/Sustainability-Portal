import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { UNIT_DIRECTORY } from '../utils/unitDirectory';

/* ============================================================================
 * GHG Emission Summary (Scope 1, 2, 3)  —  inv_ghg_emission
 * Epyllion Group Sustainability Portal · GHG Protocol Corporate Standard
 * ========================================================================== */

interface GhgEmissionSummaryFormProps {
  selectedUnit: string;
  selectedYear: number | string;
}

type GhgUnit = 'kg CO₂e' | 'Ton CO₂e';
type ShipUnit = 'pcs' | 'kg';
type Grp = 's1' | 'veh' | 's2' | 'tot' | 'kpi';

interface Factors {
  ngKgCo2PerM3: number;
  dieselKgCo2PerLiter: number;
  cngKgCo2PerM3: number;
  petrolKgCo2PerLiter: number;
  gridElecKgCo2PerKwh: number;
}

interface Raw {
  ng: number;
  dsl: number;
  ref: number;
  refGhgKg: number;
  vCng: number;
  vDsl: number;
  vPet: number;
  elec: number;
  pcs: number;
  kg: number;
}

interface Calc {
  ng: number;
  ghgNg: number;
  dsl: number;
  ghgDsl: number;
  ref: number;
  ghgRef: number;
  vCng: number;
  ghgVCng: number;
  vDsl: number;
  ghgVDsl: number;
  vPet: number;
  ghgVPet: number;
  vTot: number;
  elec: number;
  ghgElec: number;
  s1: number;
  s2: number;
  s12: number;
  ship: number;
  kpi: number;
}

interface Col {
  id: string;
  grp: Grp;
  kind: 'synced' | 'calc';
  dec: number;
  label: (g: string, s: string) => string;
  get: (r: Calc) => number;
}

interface ExportFilters {
  s1: boolean;
  veh: boolean;
  s2: boolean;
  tot: boolean;
  kpi: boolean;
  remarks: boolean;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DEFAULT_FACTORS: Factors = {
  ngKgCo2PerM3: 2.0213,
  dieselKgCo2PerLiter: 2.5123,
  cngKgCo2PerM3: 2.0213,
  petrolKgCo2PerLiter: 2.3147,
  gridElecKgCo2PerKwh: 0.62,
};

const EMPTY_RAW: Raw = {
  ng: 0, dsl: 0, ref: 0, refGhgKg: 0, vCng: 0, vDsl: 0, vPet: 0, elec: 0, pcs: 0, kg: 0,
};

const NUM_KEYS: (keyof Calc)[] = [
  'ng', 'ghgNg', 'dsl', 'ghgDsl', 'ref', 'ghgRef', 'vCng', 'ghgVCng', 'vDsl', 'ghgVDsl',
  'vPet', 'ghgVPet', 'vTot', 'elec', 'ghgElec', 's1', 's2', 's12', 'ship',
];

/* ----------------------------- Colour theme ------------------------------ */
const THEME: Record<Grp, { head: string; sub: string; cell: string; text: string }> = {
  s1: { head: '#7dd3fc', sub: '#bae6fd', cell: '#f0f9ff', text: '#0c4a6e' },
  veh: { head: '#fcd34d', sub: '#fde68a', cell: '#fffbeb', text: '#78350f' },
  s2: { head: '#6ee7b7', sub: '#a7f3d0', cell: '#ecfdf5', text: '#064e3b' },
  tot: { head: '#5eead4', sub: '#99f6e4', cell: '#f0fdfa', text: '#134e4a' },
  kpi: { head: '#d8b4fe', sub: '#e9d5ff', cell: '#faf5ff', text: '#581c87' },
};
const MONTH_BG = '#c7d2fe';
const MONTH_TEXT = '#312e81';
const REMARK_HEAD = '#cbd5e1';
const REMARK_SUB = '#e2e8f0';
const TOTAL_BG = '#e2e8f0';

/* ------------------------------ Column model ----------------------------- */
const COLS: Col[] = [
  { id: 'ng', grp: 's1', kind: 'synced', dec: 2, label: () => 'Total NG (m³)', get: (r) => r.ng },
  { id: 'ghgNg', grp: 's1', kind: 'calc', dec: 2, label: (g) => `GHG from NG (${g})`, get: (r) => r.ghgNg },
  { id: 'dsl', grp: 's1', kind: 'synced', dec: 2, label: () => 'Total Diesel (L)', get: (r) => r.dsl },
  { id: 'ghgDsl', grp: 's1', kind: 'calc', dec: 2, label: (g) => `GHG from Diesel (${g})`, get: (r) => r.ghgDsl },
  { id: 'ref', grp: 's1', kind: 'synced', dec: 2, label: () => 'Total Refrigerant (kg)', get: (r) => r.ref },
  { id: 'ghgRef', grp: 's1', kind: 'synced', dec: 2, label: (g) => `GHG from Refrigerant (${g})`, get: (r) => r.ghgRef },
  { id: 'vCng', grp: 'veh', kind: 'synced', dec: 2, label: () => 'CNG (m³)', get: (r) => r.vCng },
  { id: 'ghgVCng', grp: 'veh', kind: 'calc', dec: 2, label: (g) => `GHG from CNG (${g})`, get: (r) => r.ghgVCng },
  { id: 'vDsl', grp: 'veh', kind: 'synced', dec: 2, label: () => 'Diesel (L)', get: (r) => r.vDsl },
  { id: 'ghgVDsl', grp: 'veh', kind: 'calc', dec: 2, label: (g) => `GHG from Diesel (${g})`, get: (r) => r.ghgVDsl },
  { id: 'vPet', grp: 'veh', kind: 'synced', dec: 2, label: () => 'Octane / Petrol (L)', get: (r) => r.vPet },
  { id: 'ghgVPet', grp: 'veh', kind: 'calc', dec: 2, label: (g) => `GHG from Octane / Petrol (${g})`, get: (r) => r.ghgVPet },
  { id: 'vTot', grp: 'veh', kind: 'calc', dec: 2, label: (g) => `Total Vehicles GHG (${g})`, get: (r) => r.vTot },
  { id: 'elec', grp: 's2', kind: 'synced', dec: 2, label: () => 'Total Purchase Electricity (kWh)', get: (r) => r.elec },
  { id: 'ghgElec', grp: 's2', kind: 'calc', dec: 2, label: (g) => `GHG from Purchase Electricity (${g})`, get: (r) => r.ghgElec },
  { id: 's1', grp: 'tot', kind: 'calc', dec: 2, label: (g) => `Total Scope 1 GHG (${g})`, get: (r) => r.s1 },
  { id: 's2', grp: 'tot', kind: 'calc', dec: 2, label: (g) => `Total Scope 2 GHG (${g})`, get: (r) => r.s2 },
  { id: 's12', grp: 'tot', kind: 'calc', dec: 2, label: (g) => `Total Scope 1 & 2 GHG (${g})`, get: (r) => r.s12 },
  { id: 'ship', grp: 'kpi', kind: 'synced', dec: 2, label: (_g, s) => `Total Shipment Quantity (${s})`, get: (r) => r.ship },
  { id: 'kpi', grp: 'kpi', kind: 'calc', dec: 4, label: (g, s) => `GHG Intensity (${g} / ${s})`, get: (r) => r.kpi },
];

/* ------------------------------- Utilities ------------------------------- */
const norm = (s: string): string => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/,/g, ''));
    return isFinite(n) ? n : 0;
  }
  return 0;
};

const isNumericLike = (v: unknown): boolean => {
  if (typeof v === 'number') return isFinite(v);
  if (typeof v === 'string') {
    const t = v.replace(/,/g, '').trim();
    return t !== '' && isFinite(Number(t));
  }
  return false;
};

/** Flatten a (possibly nested) month record into { normalisedKey: number } */
const flatten = (obj: any, out: Record<string, number> = {}, depth = 0): Record<string, number> => {
  if (!obj || typeof obj !== 'object' || depth > 3) return out;
  Object.keys(obj).forEach((k) => {
    const v = obj[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, out, depth + 1);
    else if (isNumericLike(v)) out[norm(k)] = toNum(v);
  });
  return out;
};

interface Rule {
  inc: string[];
  exc?: string[];
  exact?: string[];
}

/** Tolerant field lookup: exact normalised key first, then token-inclusion match. */
const pick = (m: Record<string, number>, rules: Rule[]): number => {
  const keys = Object.keys(m);
  for (const r of rules) {
    if (r.exact) {
      for (const e of r.exact) if (e in m) return m[e];
    }
    if (r.inc.length > 0) {
      const hit = keys.find(
        (k) => r.inc.every((t) => k.includes(t)) && !(r.exc || []).some((t) => k.includes(t))
      );
      if (hit !== undefined) return m[hit];
    }
  }
  return 0;
};

const loadMonthly = (key: string): Record<string, number>[] => {
  const out: Record<string, number>[] = Array.from({ length: 12 }, () => ({}));
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return out;
    let data: any = JSON.parse(raw);
    if (data && !Array.isArray(data) && typeof data === 'object') {
      const arr = ['rows', 'data', 'months', 'entries', 'monthly']
        .map((k) => data[k])
        .find((v) => Array.isArray(v));
      if (arr) data = arr;
    }
    if (Array.isArray(data)) {
      data.forEach((row: any, i: number) => {
        let idx = i;
        const mv = row && (row.month ?? row.Month);
        if (typeof mv === 'string') {
          const mi = MONTHS.findIndex((m) => mv.toLowerCase().startsWith(m.slice(0, 3).toLowerCase()));
          if (mi >= 0) idx = mi;
        }
        if (idx >= 0 && idx < 12) out[idx] = flatten(row);
      });
    } else if (data && typeof data === 'object') {
      MONTHS.forEach((m, i) => {
        const hit = Object.keys(data).find(
          (k) => k.toLowerCase().startsWith(m.slice(0, 3).toLowerCase()) || k === String(i + 1)
        );
        if (hit) out[i] = flatten(data[hit]);
      });
    }
  } catch {
    /* ignore corrupted storage */
  }
  return out;
};

const loadFactors = (year: number | string): Factors => {
  const f: Factors = { ...DEFAULT_FACTORS };
  try {
    const raw = localStorage.getItem('sustainability_factors_by_year');
    if (raw) {
      const all = JSON.parse(raw);
      const y = all ? all[String(year)] : null;
      if (y && typeof y === 'object') {
        (Object.keys(DEFAULT_FACTORS) as (keyof Factors)[]).forEach((k) => {
          const n = parseFloat(y[k]);
          if (y[k] !== undefined && y[k] !== '' && y[k] !== null && isFinite(n)) f[k] = n;
        });
      }
    }
  } catch {
    /* use defaults */
  }
  return f;
};

const buildRaws = (unit: string, year: number | string): Raw[] => {
  const a = loadMonthly(`ng_diesel_veh_${unit}_${year}`);
  const b = loadMonthly(`refrigerant_ods_${unit}_${year}`);
  const c = loadMonthly(`elec_solar_${unit}_${year}`);
  const d = loadMonthly(`prod_ops_${unit}_${year}`);
  const bad = ['ghg', 'co2', 'emission', 'cost', 'bdt'];
  return MONTHS.map((_, i) => {
    const ma = a[i], mb = b[i], mc = c[i], md = d[i];
    let dsl = pick(ma, [{ inc: ['total', 'diesel'], exc: ['veh', ...bad] }]);
    if (!dsl) {
      dsl =
        pick(ma, [{ inc: ['boiler', 'diesel'], exc: bad }]) +
        pick(ma, [{ inc: ['generator', 'diesel'], exc: bad }]);
    }
    return {
      ng: pick(ma, [
        { inc: ['total', 'ng'], exc: ['cng', 'diesel', 'veh', 'generator', 'boiler', ...bad] },
        { inc: ['natural', 'gas'], exc: bad },
      ]),
      dsl,
      vCng: pick(ma, [{ inc: ['veh', 'cng'], exc: bad }, { inc: ['cng'], exc: [...bad, 'total'] }]),
      vDsl: pick(ma, [{ inc: ['veh', 'diesel'], exc: bad }]),
      vPet: pick(ma, [
        { inc: ['veh', 'petrol'], exc: bad },
        { inc: ['veh', 'octane'], exc: bad },
        { inc: ['petrol'], exc: bad },
        { inc: ['octane'], exc: bad },
      ]),
      ref: pick(mb, [
        { inc: ['total', 'refrigerant'], exc: [...bad, 'gwp'] },
        { inc: ['refrigerant', 'kg'], exc: [...bad, 'gwp'] },
      ]),
      refGhgKg: pick(mb, [
        { inc: ['total', 'ghg'] },
        { inc: ['total', 'co2'] },
        { inc: ['co2e'] },
        { inc: ['total', 'emission'] },
      ]),
      elec: pick(mc, [
        { inc: ['total', 'purchase', 'electricity'], exc: ['solar', ...bad] },
        { inc: ['purchase', 'kwh'], exc: ['solar', ...bad] },
        { inc: ['totalpurchase'], exc: ['solar', ...bad] },
        { inc: ['purchase', 'elec'], exc: ['solar', ...bad] },
      ]),
      pcs: pick(md, [
        { inc: ['total', 'shipment', 'pcs'] },
        { inc: ['shipment', 'pcs'] },
        { inc: ['shipment', 'qty', 'pcs'] },
      ]),
      kg: pick(md, [
        { inc: ['total', 'shipment', 'kg'] },
        { inc: ['shipment', 'kg'] },
        { inc: ['shipment', 'qty', 'kg'] },
      ]),
    };
  });
};

const calcRow = (
  r: Raw, f: Factors, k: number, inclVeh: boolean, shipUnit: ShipUnit
): Calc => {
  const ghgNg = r.ng * f.ngKgCo2PerM3 * k;
  const ghgDsl = r.dsl * f.dieselKgCo2PerLiter * k;
  const ghgRef = r.refGhgKg * k;
  const ghgVCng = r.vCng * f.cngKgCo2PerM3 * k;
  const ghgVDsl = r.vDsl * f.dieselKgCo2PerLiter * k;
  const ghgVPet = r.vPet * f.petrolKgCo2PerLiter * k;
  const vTot = ghgVCng + ghgVDsl + ghgVPet;
  const ghgElec = r.elec * f.gridElecKgCo2PerKwh * k;
  const s1 = ghgNg + ghgDsl + ghgRef + (inclVeh ? vTot : 0);
  const s2 = ghgElec;
  const s12 = s1 + s2;
  const ship = shipUnit === 'pcs' ? r.pcs : r.kg;
  return {
    ng: r.ng, ghgNg, dsl: r.dsl, ghgDsl, ref: r.ref, ghgRef,
    vCng: r.vCng, ghgVCng, vDsl: r.vDsl, ghgVDsl, vPet: r.vPet, ghgVPet, vTot,
    elec: r.elec, ghgElec, s1, s2, s12, ship,
    kpi: ship > 0 ? s12 / ship : 0,
  };
};

const sumCalc = (rows: Calc[]): Calc => {
  const t: Calc = {
    ng: 0, ghgNg: 0, dsl: 0, ghgDsl: 0, ref: 0, ghgRef: 0, vCng: 0, ghgVCng: 0, vDsl: 0,
    ghgVDsl: 0, vPet: 0, ghgVPet: 0, vTot: 0, elec: 0, ghgElec: 0, s1: 0, s2: 0, s12: 0,
    ship: 0, kpi: 0,
  };
  rows.forEach((r) => NUM_KEYS.forEach((key) => { t[key] += r[key]; }));
  t.kpi = t.ship > 0 ? t.s12 / t.ship : 0;
  return t;
};

const fmtScreen = (v: number, dec: number): string =>
  (isFinite(v) ? v : 0).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtRaw = (v: number, dec: number): string => (isFinite(v) ? v : 0).toFixed(dec);

const esc = (s: string): string =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ------------------------------ Header model ----------------------------- */
interface HeaderModel {
  hasVeh: boolean;
  depth: number;
  sections: { label: string; grp: Grp; span: number }[];
  row2: ({ kind: 'col'; col: Col } | { kind: 'veh'; span: number })[];
  row3: Col[];
}

const buildHeader = (cols: Col[]): HeaderModel => {
  const g = (grp: Grp) => cols.filter((c) => c.grp === grp);
  const s1c = g('s1'), vc = g('veh'), s2c = g('s2'), tc = g('tot'), kc = g('kpi');
  const sections: HeaderModel['sections'] = [];
  if (s1c.length + vc.length > 0)
    sections.push({ label: 'GHG SCOPE 1 (DIRECT EMISSIONS)', grp: 's1', span: s1c.length + vc.length });
  if (s2c.length) sections.push({ label: 'GHG SCOPE 2 (INDIRECT EMISSIONS)', grp: 's2', span: s2c.length });
  if (tc.length) sections.push({ label: 'TOTAL SCOPE 1 & 2 GHG', grp: 'tot', span: tc.length });
  if (kc.length) sections.push({ label: 'GHG KPI (INTENSITY)', grp: 'kpi', span: kc.length });
  const row2: HeaderModel['row2'] = [];
  s1c.forEach((col) => row2.push({ kind: 'col', col }));
  if (vc.length) row2.push({ kind: 'veh', span: vc.length });
  [...s2c, ...tc, ...kc].forEach((col) => row2.push({ kind: 'col', col }));
  return { hasVeh: vc.length > 0, depth: vc.length > 0 ? 3 : 2, sections, row2, row3: vc };
};

/* ============================== Component ================================ */
const GhgEmissionSummaryForm: React.FC<GhgEmissionSummaryFormProps> = ({ selectedUnit, selectedYear }) => {
  const [ghgUnit, setGhgUnit] = useState<GhgUnit>('kg CO₂e');
  const [shipUnit, setShipUnit] = useState<ShipUnit>('pcs');
  const [includeVehicles, setIncludeVehicles] = useState<boolean>(true);
  const [filters, setFilters] = useState<ExportFilters>({
    s1: true, veh: true, s2: true, tot: true, kpi: true, remarks: true,
  });
  const [factors, setFactors] = useState<Factors>(DEFAULT_FACTORS);
  const [raws, setRaws] = useState<Raw[]>(() => MONTHS.map(() => ({ ...EMPTY_RAW })));
  const [remarks, setRemarks] = useState<string[]>(() => MONTHS.map(() => ''));
  const [logo, setLogo] = useState<string>(
    typeof window !== 'undefined' ? window.location.origin + '/epyllion-logo.png' : '/epyllion-logo.png'
  );

  const unitInfo: { fullName: string; address: string } = useMemo(() => {
    const info = (UNIT_DIRECTORY as Record<string, any> | undefined)?.[selectedUnit];
    return {
      fullName: (info && info.fullName) || selectedUnit,
      address: (info && info.address) || 'Epyllion Group, Dhaka, Bangladesh',
    };
  }, [selectedUnit]);

  /* ---- Logo → inline Base64 (so it renders in Excel + Print) ---- */
  useEffect(() => {
    let cancelled = false;
    const fallback = window.location.origin + '/epyllion-logo.png';
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 200;
        canvas.height = img.naturalHeight || 200;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('no ctx');
        ctx.drawImage(img, 0, 0);
        const url = canvas.toDataURL('image/png');
        if (!cancelled) setLogo(url);
      } catch {
        if (!cancelled) setLogo(fallback);
      }
    };
    img.onerror = () => { if (!cancelled) setLogo(fallback); };
    img.src = '/epyllion-logo.png';
    return () => { cancelled = true; };
  }, []);

  /* ---- Live cross-module sync ---- */
  const sync = useCallback(() => {
    try {
      setFactors(loadFactors(selectedYear));
      setRaws(buildRaws(selectedUnit, selectedYear));
    } catch {
      setFactors({ ...DEFAULT_FACTORS });
      setRaws(MONTHS.map(() => ({ ...EMPTY_RAW })));
    }
  }, [selectedUnit, selectedYear]);

  useEffect(() => {
    sync();
    const handler = () => sync();
    window.addEventListener('storage', handler);
    window.addEventListener('focus', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('focus', handler);
    };
  }, [sync]);

  /* ---- Remarks persistence ---- */
  const remarksKey = `ghg_summary_remarks_${selectedUnit}_${selectedYear}`;
  useEffect(() => {
    try {
      const raw = localStorage.getItem(remarksKey);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed)) setRemarks(MONTHS.map((_, i) => String(parsed[i] ?? '')));
      else setRemarks(MONTHS.map(() => ''));
    } catch {
      setRemarks(MONTHS.map(() => ''));
    }
  }, [remarksKey]);

  const updateRemark = (i: number, v: string) => {
    setRemarks((prev) => {
      const next = [...prev];
      next[i] = v;
      try { localStorage.setItem(remarksKey, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  /* ---- Calculations ---- */
  const k = ghgUnit === 'Ton CO₂e' ? 0.001 : 1;
  const rows: Calc[] = useMemo(
    () => raws.map((r) => calcRow(r, factors, k, includeVehicles, shipUnit)),
    [raws, factors, k, includeVehicles, shipUnit]
  );
  const total: Calc = useMemo(() => sumCalc(rows), [rows]);

  const toggleFilter = (key: keyof ExportFilters) => setFilters((p) => ({ ...p, [key]: !p[key] }));

  /* ====================== Shared export table builder ===================== */
  const visibleCols = (f: ExportFilters): Col[] =>
    COLS.filter(
      (c) =>
        (c.grp === 's1' && f.s1) || (c.grp === 'veh' && f.veh) ||
        (c.grp === 's2' && f.s2) || (c.grp === 'tot' && f.tot) || (c.grp === 'kpi' && f.kpi)
    );

  const vehBadgeText = includeVehicles ? '✓ Included' : '✗ Excluded';
  const vehBadgeColor = includeVehicles ? '#15803d' : '#b91c1c';

  const buildExportTable = (mode: 'xls' | 'print'): { html: string; totalCols: number } => {
    const cols = visibleCols(filters);
    const hm = buildHeader(cols);
    const showRem = filters.remarks;
    const totalCols = 1 + cols.length + (showRem ? 1 : 0);
    const bd = 'border:1px solid #94a3b8;';
    const thBase = `${bd}padding:4px 6px;font-weight:700;text-align:center;vertical-align:middle;`;
    const g = ghgUnit, s = shipUnit;

    const th = (txt: string, bg: string, color: string, extra = '', attrs = ''): string =>
      `<th ${attrs} style="${thBase}background:${bg};color:${color};${extra}">${txt}</th>`;

    let h = '<table class="data" border="1" cellspacing="0" cellpadding="3" style="border-collapse:collapse;">';
    h += '<thead>';
    // Row 1
    h += '<tr>';
    h += th('Month', MONTH_BG, MONTH_TEXT, '', `rowspan="${hm.depth}"`);
    hm.sections.forEach((sec) => {
      h += th(sec.label, THEME[sec.grp].head, THEME[sec.grp].text, '', `colspan="${sec.span}"`);
    });
    if (showRem) h += th('REMARKS', REMARK_HEAD, '#0f172a', '', `rowspan="${hm.depth}"`);
    h += '</tr>';
    // Row 2
    h += '<tr>';
    hm.row2.forEach((cell) => {
      if (cell.kind === 'col') {
        const t = THEME[cell.col.grp];
        h += th(esc(cell.col.label(g, s)), t.sub, t.text, '', `rowspan="${hm.depth - 1}"`);
      } else {
        const t = THEME.veh;
        h += th(
          `GHG from Vehicles <span style="color:${vehBadgeColor};">[${vehBadgeText}]</span>`,
          t.head, t.text, '', `colspan="${cell.span}"`
        );
      }
    });
    h += '</tr>';
    // Row 3
    if (hm.hasVeh) {
      h += '<tr>';
      hm.row3.forEach((col) => {
        const t = THEME[col.grp];
        h += th(esc(col.label(g, s)), t.sub, t.text);
      });
      h += '</tr>';
    }
    h += '</thead><tbody>';

    const numStyle = (col: Col, bold: boolean, bgOverride?: string): string => {
      const fmt = mode === 'xls' ? `mso-number-format:'0\\.${'0'.repeat(col.dec)}';` : '';
      return `${bd}padding:3px 6px;text-align:right;white-space:nowrap;background:${bgOverride || THEME[col.grp].cell};${bold ? 'font-weight:700;' : ''}${fmt}`;
    };

    rows.forEach((r, i) => {
      h += '<tr>';
      h += `<td style="${bd}padding:3px 6px;background:${MONTH_BG};font-weight:700;white-space:nowrap;color:${MONTH_TEXT};">${MONTHS[i]}</td>`;
      cols.forEach((col) => {
        h += `<td style="${numStyle(col, false)}">${fmtRaw(col.get(r), col.dec)}</td>`;
      });
      if (showRem) h += `<td style="${bd}padding:3px 6px;text-align:left;background:#f8fafc;">${esc(remarks[i] || '')}</td>`;
      h += '</tr>';
    });

    h += '<tr>';
    h += `<td style="${bd}padding:4px 6px;background:${TOTAL_BG};font-weight:700;">Total</td>`;
    cols.forEach((col) => {
      h += `<td style="${numStyle(col, true, TOTAL_BG)}">${fmtRaw(col.get(total), col.dec)}</td>`;
    });
    if (showRem) h += `<td style="${bd}padding:4px 6px;background:${TOTAL_BG};"></td>`;
    h += '</tr>';
    h += '</tbody></table>';
    return { html: h, totalCols };
  };

  const activeSummary = `GHG Unit: ${ghgUnit} | Shipment Unit: ${shipUnit} | Vehicles Fuel in Scope 1: ${
    includeVehicles ? 'Included' : 'Excluded'
  }`;
  const reportTitle = 'GHG Emission Summary (Scope 1, 2, 3)';

  /* ============================ Download Excel ============================ */
  const handleDownloadExcel = () => {
    try {
      const { html: table, totalCols: N } = buildExportTable('xls');
      const left = Math.min(2, N);
      const rest = Math.max(1, N - left);
      const third = Math.max(1, Math.floor(N / 3));
      const sigCell = (label: string, span: number) =>
        `<td colspan="${span}" style="border-top:1px solid #000000;text-align:center;font-weight:700;">${label}</td>`;
      const gap = (span: number) => `<td colspan="${span}"></td>`;

      let h = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
      h += '<head><meta charset="utf-8" />';
      h += `<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>GHG Summary ${esc(String(selectedYear))}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->`;
      h += '</head><body>';
      h += '<table border="0" cellspacing="0" cellpadding="2">';
      h += `<tr><td colspan="${left}" rowspan="5" style="vertical-align:middle;"><img src="${logo}" width="90" height="90" alt="Epyllion Group" /></td>`;
      h += `<td colspan="${rest}" style="font-size:20pt;font-weight:700;color:#0f172a;">EPYLLION GROUP</td></tr>`;
      h += `<tr><td colspan="${rest}" style="font-size:13pt;font-weight:700;">${esc(unitInfo.fullName)}</td></tr>`;
      h += `<tr><td colspan="${rest}" style="font-size:10pt;color:#475569;">${esc(unitInfo.address)}</td></tr>`;
      h += `<tr><td colspan="${rest}" style="font-size:12pt;font-weight:700;color:#134e4a;">${esc(reportTitle)} — Reporting Year: ${esc(String(selectedYear))}</td></tr>`;
      h += `<tr><td colspan="${rest}" style="font-size:9pt;color:#475569;">${esc(activeSummary)}</td></tr>`;
      h += `<tr><td colspan="${N}"></td></tr>`;
      h += '</table>';
      h += table;
      h += '<table border="0" cellspacing="0" cellpadding="2">';
      h += `<tr style="height:60px;"><td colspan="${N}"></td></tr>`;
      h += `<tr>${sigCell('Prepared By', third)}${gap(1)}${sigCell('Checked By', third)}${gap(1)}${sigCell('Approved By', Math.max(1, N - 2 * third - 2))}</tr>`;
      h += '</table>';
      h += '</body></html>';

      const blob = new Blob(['\ufeff' + h], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GHG_Emission_Summary_${selectedUnit}_${selectedYear}.xls`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Excel export failed', err);
      alert('Excel export failed. Please try again.');
    }
  };

  /* ============================ Print / Save PDF ========================== */
  const handlePrint = () => {
    try {
      const { html: table } = buildExportTable('print');
      const w = window.open('', '_blank');
      if (!w) {
        alert('Pop-up blocked. Please allow pop-ups for this site to print / save as PDF.');
        return;
      }
      const sig = (label: string) =>
        `<div class="sig"><div class="sig-line">${label}</div></div>`;
      const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(reportTitle)} ${esc(String(selectedYear))}</title>
<style>
  @page { size: A4 landscape; margin: 0mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #ffffff; font-family: Arial, Helvetica, sans-serif; color: #0f172a; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .print-sheet { padding: 10mm 12mm; }
  .letterhead { display: flex; align-items: center; gap: 14px; border-bottom: 2px solid #0f766e; padding-bottom: 8px; margin-bottom: 8px; }
  .letterhead img { width: 64px; height: 64px; object-fit: contain; }
  .lh-text h1 { margin: 0; font-size: 20px; letter-spacing: 1px; }
  .lh-text .unit { font-size: 12px; font-weight: 700; margin-top: 2px; }
  .lh-text .addr { font-size: 10px; color: #475569; margin-top: 1px; }
  .title-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 6px; }
  .title-row .t { font-size: 13px; font-weight: 700; color: #134e4a; }
  .title-row .m { font-size: 9px; color: #475569; text-align: right; }
  table.data { width: 100%; border-collapse: collapse; font-size: 7px; }
  table.data th, table.data td { border: 1px solid #94a3b8; padding: 2px 3px; }
  table.data th { text-align: center; vertical-align: middle; }
  table.data td { white-space: nowrap; }
  .sigs { display: flex; justify-content: space-between; margin-top: 70px; padding: 0 20px; }
  .sig { width: 22%; text-align: center; }
  .sig-line { border-top: 1px solid #0f172a; padding-top: 4px; font-size: 10px; font-weight: 700; }
</style>
</head>
<body>
<div class="print-sheet">
  <div class="letterhead">
    <img src="${logo}" alt="Epyllion Group" />
    <div class="lh-text">
      <h1>EPYLLION GROUP</h1>
      <div class="unit">${esc(unitInfo.fullName)}</div>
      <div class="addr">${esc(unitInfo.address)}</div>
    </div>
  </div>
  <div class="title-row">
    <div class="t">${esc(reportTitle)} — Reporting Year: ${esc(String(selectedYear))}</div>
    <div class="m">${esc(activeSummary)}</div>
  </div>
  ${table}
  <div class="sigs">${sig('Prepared By')}${sig('Checked By')}${sig('Approved By')}</div>
</div>
</body>
</html>`;
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => { try { w.print(); } catch { /* ignore */ } }, 600);
    } catch (err) {
      console.error('Print failed', err);
      alert('Print failed. Please try again.');
    }
  };

  /* ============================== Screen render ============================ */
  const screenHeader = buildHeader(COLS);
  const g = ghgUnit, s = shipUnit;
  const cellBase = 'px-2 py-1.5 text-[12px] border-b border-r border-slate-300';
  const headBase = 'px-2 py-2 text-[11px] font-bold text-center border-b border-r border-slate-300 align-middle';

  const VehBadge = (
    <span
      className={`ml-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
        includeVehicles ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}
    >
      {vehBadgeText}
    </span>
  );

  const FilterBox: React.FC<{ id: keyof ExportFilters; label: string }> = ({ id, label }) => (
    <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
      <input
        type="checkbox"
        className="h-3.5 w-3.5 accent-teal-600"
        checked={filters[id]}
        onChange={() => toggleFilter(id)}
      />
      {label}
    </label>
  );

  return (
    <div className="w-full space-y-4">
      {/* ------------------------- Title / meta ------------------------- */}
      <div className="rounded-xl border border-teal-200 bg-gradient-to-r from-teal-50 via-sky-50 to-indigo-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800">GHG Emission Summary (Scope 1, 2, 3)</h2>
            <p className="text-xs text-slate-600">
              {unitInfo.fullName} · Reporting Year {selectedYear} · GHG Protocol Corporate Standard
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDownloadExcel}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              Download Excel (.xls)
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              Print / Save PDF
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------- Control bar -------------------------- */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">GHG Unit</label>
            <select
              value={ghgUnit}
              onChange={(e) => setGhgUnit(e.target.value as GhgUnit)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-800"
            >
              <option value="kg CO₂e">kg CO₂e</option>
              <option value="Ton CO₂e">Ton CO₂e</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">Shipment Unit</label>
            <select
              value={shipUnit}
              onChange={(e) => setShipUnit(e.target.value as ShipUnit)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-800"
            >
              <option value="pcs">pcs</option>
              <option value="kg">kg</option>
            </select>
          </div>
          <label className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 accent-emerald-600"
              checked={includeVehicles}
              onChange={(e) => setIncludeVehicles(e.target.checked)}
            />
            Include Vehicles Fuel in Scope 1 GHG
            {VehBadge}
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-3">
          <span className="text-[11px] font-bold text-slate-600">Export &amp; Print:</span>
          <FilterBox id="s1" label="Scope 1 (NG, Diesel & Refrigerant)" />
          <FilterBox id="veh" label="Vehicles Fuel Sub-Section (Scope 1)" />
          <FilterBox id="s2" label="Scope 2 (Purchase Electricity)" />
          <FilterBox id="tot" label="Total Scope 1 & 2 Summary" />
          <FilterBox id="kpi" label="GHG KPI (Intensity)" />
          <FilterBox id="remarks" label="Remarks" />
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-600">
          <span className="font-bold">Emission factors ({selectedYear}):</span>
          <span className="rounded bg-sky-50 px-2 py-0.5">NG {factors.ngKgCo2PerM3} kg/m³</span>
          <span className="rounded bg-sky-50 px-2 py-0.5">Diesel {factors.dieselKgCo2PerLiter} kg/L</span>
          <span className="rounded bg-amber-50 px-2 py-0.5">CNG {factors.cngKgCo2PerM3} kg/m³</span>
          <span className="rounded bg-amber-50 px-2 py-0.5">Petrol {factors.petrolKgCo2PerLiter} kg/L</span>
          <span className="rounded bg-emerald-50 px-2 py-0.5">Grid {factors.gridElecKgCo2PerKwh} kg/kWh</span>
          <span className="rounded bg-slate-100 px-2 py-0.5">Refrigerant GHG: synced from Refrigerant module</span>
        </div>
      </div>

      {/* ---------------------------- Table ---------------------------- */}
      <div className="max-h-[72vh] overflow-auto rounded-xl border border-slate-300 bg-white shadow-sm">
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th
                rowSpan={screenHeader.depth}
                className={`${headBase} sticky left-0 z-30 min-w-[110px]`}
                style={{ background: MONTH_BG, color: MONTH_TEXT }}
              >
                Month
              </th>
              {screenHeader.sections.map((sec) => (
                <th
                  key={sec.label}
                  colSpan={sec.span}
                  className={headBase}
                  style={{ background: THEME[sec.grp].head, color: THEME[sec.grp].text }}
                >
                  {sec.label}
                </th>
              ))}
              <th
                rowSpan={screenHeader.depth}
                className={`${headBase} min-w-[220px]`}
                style={{ background: REMARK_HEAD, color: '#0f172a' }}
              >
                REMARKS
              </th>
            </tr>
            <tr>
              {screenHeader.row2.map((cell, idx) =>
                cell.kind === 'col' ? (
                  <th
                    key={`r2-${cell.col.id}`}
                    rowSpan={screenHeader.depth - 1}
                    className={`${headBase} min-w-[112px]`}
                    style={{ background: THEME[cell.col.grp].sub, color: THEME[cell.col.grp].text }}
                  >
                    {cell.col.label(g, s)}
                  </th>
                ) : (
                  <th
                    key={`r2-veh-${idx}`}
                    colSpan={cell.span}
                    className={headBase}
                    style={{ background: THEME.veh.head, color: THEME.veh.text }}
                  >
                    GHG from Vehicles
                    {VehBadge}
                  </th>
                )
              )}
            </tr>
            <tr>
              {screenHeader.row3.map((col) => (
                <th
                  key={`r3-${col.id}`}
                  className={`${headBase} min-w-[112px]`}
                  style={{ background: THEME[col.grp].sub, color: THEME[col.grp].text }}
                >
                  {col.label(g, s)}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((r, i) => (
              <tr key={MONTHS[i]}>
                <td
                  className={`${cellBase} sticky left-0 z-10 font-semibold whitespace-nowrap`}
                  style={{ background: MONTH_BG, color: MONTH_TEXT }}
                >
                  {MONTHS[i]}
                </td>
                {COLS.map((col) => {
                  const dimmed = col.grp === 'veh' && !includeVehicles && col.id === 'vTot';
                  return (
                    <td
                      key={col.id}
                      title={col.kind === 'synced' ? 'Auto-synced · locked' : 'Auto-calculated · locked'}
                      className={`${cellBase} text-right whitespace-nowrap cursor-not-allowed select-text ${
                        col.id === 's12' || col.id === 'kpi' ? 'font-semibold' : ''
                      } ${dimmed ? 'line-through opacity-60' : ''}`}
                      style={{ background: THEME[col.grp].cell, color: '#0f172a' }}
                    >
                      {fmtScreen(col.get(r), col.dec)}
                    </td>
                  );
                })}
                <td className={`${cellBase} bg-slate-50`}>
                  <input
                    type="text"
                    value={remarks[i] || ''}
                    onChange={(e) => updateRemark(i, e.target.value)}
                    placeholder="Add note…"
                    className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 focus:border-teal-500 focus:outline-none"
                  />
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr>
              <td
                className={`${cellBase} sticky bottom-0 left-0 z-20 font-bold`}
                style={{ background: TOTAL_BG, color: '#0f172a' }}
              >
                Total
              </td>
              {COLS.map((col) => (
                <td
                  key={`t-${col.id}`}
                  className={`${cellBase} sticky bottom-0 z-10 text-right font-bold whitespace-nowrap cursor-not-allowed`}
                  style={{ background: TOTAL_BG, color: '#0f172a' }}
                >
                  {fmtScreen(col.get(total), col.dec)}
                </td>
              ))}
              <td
                className={`${cellBase} sticky bottom-0 z-10`}
                style={{ background: TOTAL_BG }}
              />
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-[11px] text-slate-500">
        All activity data and emissions are auto-synced from Natural Gas / Diesel / Vehicles, Refrigerant &amp; ODS,
        Electricity &amp; Solar and Production Operations modules and are locked. Only Remarks are editable.
      </p>
    </div>
  );
};

export { GhgEmissionSummaryForm };
export default GhgEmissionSummaryForm;
