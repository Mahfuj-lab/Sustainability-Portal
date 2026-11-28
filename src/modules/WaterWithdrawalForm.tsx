// src/modules/WaterWithdrawalForm.tsx
import React, { useEffect, useMemo, useState } from 'react';
import type { InventoryRestGet, InventoryRestSet } from '../utils/inventoryDataEntry';
import {
  InventorySaveStatus,
  normalizeNumericInput,
  useHybridAutoSave,
  useInventoryGrid,
} from '../utils/inventoryDataEntry';

/* =========================================================================
   TYPES
   ========================================================================= */
type MeterKey = 'municipal' | 'ground' | 'reuse';
type GroupKey = 'municipal' | 'ground' | 'total' | 'reuse' | 'rain' | 'discharge';
type ScalarField =
  | 'mDomestic'
  | 'mProduction'
  | 'gDomestic'
  | 'gProduction'
  | 'condensate'
  | 'rainCollect'
  | 'rainUse'
  | 'boiler';
type DiagramMode = 'all' | 'core' | 'custom';

interface MonthEntry {
  municipal: string[];
  mDomestic: string;
  mProduction: string;
  ground: string[];
  gDomestic: string;
  gProduction: string;
  reuse: string[];
  condensate: string;
  rainCollect: string;
  rainUse: string;
  boiler: string;
  remarks: string;
}

interface MeterNames {
  municipal: string[];
  ground: string[];
  reuse: string[];
}

interface FormData {
  names: MeterNames;
  months: MonthEntry[];
}

interface Calc {
  totMun: number;
  totGnd: number;
  grand: number;
  totDom: number;
  totProd: number;
  totReuse: number;
  domLoss: number;
  discharge: number;
}

interface Col {
  id: string;
  label: string;
  sub?: string;
  kind: 'input' | 'calc';
  meter?: { key: MeterKey; idx: number };
  num: (m: MonthEntry, c: Calc) => number;
  raw?: (m: MonthEntry) => string;
  set?: (m: MonthEntry, v: string) => MonthEntry;
}

interface GroupDef {
  key: GroupKey;
  title: string;
  cols: Col[];
  addKey?: MeterKey;
  addLabel?: string;
}

interface Agg {
  municipal: number[];
  ground: number[];
  reuse: number[];
  mDomestic: number;
  mProduction: number;
  gDomestic: number;
  gProduction: number;
  condensate: number;
  rainCollect: number;
  rainUse: number;
  boiler: number;
  count: number;
  first: number;
  last: number;
}

interface Theme {
  head: string;
  cell: string;
  lock: string;
  text: string;
  border: string;
}

export interface WaterWithdrawalFormProps {
  selectedUnit?: string;
  selectedYear?: number | string;
  companyName?: string;
  userRole?: string;
  restGet?: InventoryRestGet;
  restSet?: InventoryRestSet;
}

/* =========================================================================
   CONSTANTS & HELPERS
   ========================================================================= */
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const GROUP_KEYS: GroupKey[] = ['municipal', 'ground', 'total', 'reuse', 'rain', 'discharge'];

const GROUP_LABELS: Record<GroupKey, string> = {
  municipal: 'Municipal Water',
  ground: 'Ground Water',
  total: 'Total Water Extraction',
  reuse: 'Water Reuse',
  rain: 'Rainwater Harvesting',
  discharge: 'Water Discharge',
};

const THEMES: Record<GroupKey, Theme> = {
  municipal: { head: '#FEF3C7', cell: '#FFFBEB', lock: '#FDE9A8', text: '#92400E', border: '#F6C453' },
  ground: { head: '#E0F2FE', cell: '#F0F9FF', lock: '#CDE9FB', text: '#075985', border: '#7CC4EE' },
  total: { head: '#D1FAE5', cell: '#ECFDF5', lock: '#BFEBD6', text: '#065F46', border: '#6EDBA8' },
  reuse: { head: '#CCFBF1', cell: '#F0FDFA', lock: '#B5EFE7', text: '#115E59', border: '#5ED6C6' },
  rain: { head: '#E0E7FF', cell: '#EEF2FF', lock: '#D2D9FB', text: '#3730A3', border: '#A5B4FC' },
  discharge: { head: '#FFE4E6', cell: '#FFF1F2', lock: '#FDD0D6', text: '#9F1239', border: '#FDA4AF' },
};

const toNum = (s: string | undefined): number => {
  const v = parseFloat(s === undefined ? '' : s);
  return Number.isFinite(v) ? v : 0;
};
const sumArr = (a: number[]): number => a.reduce((x, y) => x + y, 0);
const fix2 = (n: number): string => (Number.isFinite(n) ? n : 0).toFixed(2);
const fmt = (n: number): string =>
  (Number.isFinite(n) ? n : 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const esc = (s: string): string =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const str = (v: unknown): string => {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return '';
};

const emptyMonth = (nM: number, nG: number, nR: number): MonthEntry => ({
  municipal: new Array<string>(nM).fill(''),
  mDomestic: '',
  mProduction: '',
  ground: new Array<string>(nG).fill(''),
  gDomestic: '',
  gProduction: '',
  reuse: new Array<string>(nR).fill(''),
  condensate: '',
  rainCollect: '',
  rainUse: '',
  boiler: '',
  remarks: '',
});

const makeDefault = (): FormData => ({
  names: {
    municipal: ['Meter 1', 'Meter 2'],
    ground: ['Meter 1', 'Meter 2'],
    reuse: ['Meter 1 (m³)', 'Meter 2 (m³)'],
  },
  months: MONTHS.map(() => emptyMonth(2, 2, 2)),
});

const readStrArr = (v: unknown, len: number): string[] => {
  const a = Array.isArray(v) ? (v as unknown[]) : [];
  const out: string[] = [];
  for (let i = 0; i < len; i++) out.push(str(a[i]));
  return out;
};

const readNames = (v: unknown, fallback: (i: number) => string): string[] => {
  const a = Array.isArray(v) ? (v as unknown[]) : [];
  const len = Math.max(1, Math.min(a.length === 0 ? 2 : a.length, 30));
  const out: string[] = [];
  for (let i = 0; i < len; i++) {
    const s = str(a[i]);
    out.push(s.trim() === '' ? fallback(i) : s);
  }
  return out;
};

const normalize = (raw: unknown): FormData => {
  try {
    const obj: Record<string, unknown> =
      raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    const nr: Record<string, unknown> =
      obj.names && typeof obj.names === 'object' ? (obj.names as Record<string, unknown>) : {};
    const names: MeterNames = {
      municipal: readNames(nr.municipal, (i) => `Meter ${i + 1}`),
      ground: readNames(nr.ground, (i) => `Meter ${i + 1}`),
      reuse: readNames(nr.reuse, (i) => `Meter ${i + 1} (m³)`),
    };
    const mr: unknown[] = Array.isArray(obj.months) ? (obj.months as unknown[]) : [];
    const months: MonthEntry[] = [];
    for (let i = 0; i < 12; i++) {
      const item = mr[i];
      const rec: Record<string, unknown> =
        item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
      months.push({
        municipal: readStrArr(rec.municipal, names.municipal.length),
        mDomestic: str(rec.mDomestic),
        mProduction: str(rec.mProduction),
        ground: readStrArr(rec.ground, names.ground.length),
        gDomestic: str(rec.gDomestic),
        gProduction: str(rec.gProduction),
        reuse: readStrArr(rec.reuse, names.reuse.length),
        condensate: str(rec.condensate),
        rainCollect: str(rec.rainCollect),
        rainUse: str(rec.rainUse),
        boiler: str(rec.boiler),
        remarks: str(rec.remarks),
      });
    }
    return { names, months };
  } catch (e) {
    return makeDefault();
  }
};

const loadData = (key: string): FormData => {
  try {
    if (typeof window === 'undefined') return makeDefault();
    const raw = window.localStorage.getItem(key);
    if (!raw) return makeDefault();
    return normalize(JSON.parse(raw));
  } catch (e) {
    return makeDefault();
  }
};

const SCALARS: ScalarField[] = [
  'mDomestic',
  'mProduction',
  'gDomestic',
  'gProduction',
  'condensate',
  'rainCollect',
  'rainUse',
  'boiler',
];

const hasData = (m: MonthEntry): boolean =>
  m.municipal.some((v) => v !== '') ||
  m.ground.some((v) => v !== '') ||
  m.reuse.some((v) => v !== '') ||
  SCALARS.some((f) => m[f] !== '');

const calcMonth = (m: MonthEntry): Calc => {
  const totMun = sumArr(m.municipal.map(toNum));
  const totGnd = sumArr(m.ground.map(toNum));
  const totDom = toNum(m.mDomestic) + toNum(m.gDomestic);
  const totProd = toNum(m.mProduction) + toNum(m.gProduction);
  const totReuse = sumArr(m.reuse.map(toNum)) + toNum(m.condensate);
  const domLoss = totDom * 0.1;
  const discharge = totDom - domLoss + toNum(m.boiler);
  return { totMun, totGnd, grand: totMun + totGnd, totDom, totProd, totReuse, domLoss, discharge };
};

/* ---------- Column / group definitions (single source of truth) ---------- */
const buildGroups = (names: MeterNames): GroupDef[] => {
  const meterCols = (key: MeterKey): Col[] =>
    names[key].map((nm, i) => ({
      id: `${key}-${i}`,
      label: nm,
      kind: 'input' as const,
      meter: { key, idx: i },
      raw: (m: MonthEntry) => (m[key][i] === undefined ? '' : m[key][i]),
      set: (m: MonthEntry, v: string) =>
        ({ ...m, [key]: m[key].map((x, k) => (k === i ? v : x)) } as MonthEntry),
      num: (m: MonthEntry) => toNum(m[key][i]),
    }));

  const inp = (id: string, label: string, field: ScalarField): Col => ({
    id,
    label,
    kind: 'input',
    raw: (m) => m[field],
    set: (m, v) => ({ ...m, [field]: v } as MonthEntry),
    num: (m) => toNum(m[field]),
  });

  const calc = (id: string, label: string, fn: (c: Calc) => number, sub?: string): Col => ({
    id,
    label,
    sub,
    kind: 'calc',
    num: (_m, c) => fn(c),
  });

  return [
    {
      key: 'municipal',
      title: 'MUNICIPAL WATER (m³)',
      addKey: 'municipal',
      addLabel: '+ Add Municipal Meter',
      cols: [
        ...meterCols('municipal'),
        calc('totMun', 'Total Municipal (m³)', (c) => c.totMun),
        inp('mDom', 'Domestic (m³)', 'mDomestic'),
        inp('mProd', 'Production (m³)', 'mProduction'),
      ],
    },
    {
      key: 'ground',
      title: 'GROUND WATER (m³)',
      addKey: 'ground',
      addLabel: '+ Add Ground Water Meter',
      cols: [
        ...meterCols('ground'),
        calc('totGnd', 'Total Ground Water (m³)', (c) => c.totGnd),
        inp('gDom', 'Domestic (m³)', 'gDomestic'),
        inp('gProd', 'Production (m³)', 'gProduction'),
      ],
    },
    {
      key: 'total',
      title: 'TOTAL WATER EXTRACTION (m³)',
      cols: [
        calc('grand', 'Grand Total (m³)', (c) => c.grand),
        calc('totDom', 'Total Domestic (m³)', (c) => c.totDom),
        calc('totProd', 'Total Production (m³)', (c) => c.totProd),
      ],
    },
    {
      key: 'reuse',
      title: 'WATER REUSE (m³)',
      addKey: 'reuse',
      addLabel: '+ Add Reuse Meter',
      cols: [
        ...meterCols('reuse'),
        inp('cond', 'Condensate Recovery (m³)', 'condensate'),
        calc('totReuse', 'Total Reuse (m³)', (c) => c.totReuse),
      ],
    },
    {
      key: 'rain',
      title: 'RAINWATER HARVESTING (m³)',
      cols: [inp('rainC', 'Collect (m³)', 'rainCollect'), inp('rainU', 'Use (m³)', 'rainUse')],
    },
    {
      key: 'discharge',
      title: 'WATER DISCHARGE (m³)',
      cols: [
        calc('domLoss', 'Domestic Water Loss (m³)', (c) => c.domLoss, '(Total Domestic Water - 10%)'),
        inp('boiler', 'Boiler Blowdown Water (m³)', 'boiler'),
        calc(
          'discharge',
          'Total Discharge Water (m³)',
          (c) => c.discharge,
          '(Discharge = Domestic Water - 10% of Domestic + Boiler Blowdown)'
        ),
      ],
    },
  ];
};

/* ---------- Aggregation for the diagram ---------- */
const aggregate = (d: FormData): Agg => {
  const agg: Agg = {
    municipal: new Array<number>(d.names.municipal.length).fill(0),
    ground: new Array<number>(d.names.ground.length).fill(0),
    reuse: new Array<number>(d.names.reuse.length).fill(0),
    mDomestic: 0,
    mProduction: 0,
    gDomestic: 0,
    gProduction: 0,
    condensate: 0,
    rainCollect: 0,
    rainUse: 0,
    boiler: 0,
    count: 0,
    first: -1,
    last: -1,
  };
  d.months.forEach((m, i) => {
    if (!hasData(m)) return;
    agg.count += 1;
    if (agg.first < 0) agg.first = i;
    agg.last = i;
    m.municipal.forEach((v, j) => {
      if (j < agg.municipal.length) agg.municipal[j] += toNum(v);
    });
    m.ground.forEach((v, j) => {
      if (j < agg.ground.length) agg.ground[j] += toNum(v);
    });
    m.reuse.forEach((v, j) => {
      if (j < agg.reuse.length) agg.reuse[j] += toNum(v);
    });
    agg.mDomestic += toNum(m.mDomestic);
    agg.mProduction += toNum(m.mProduction);
    agg.gDomestic += toNum(m.gDomestic);
    agg.gProduction += toNum(m.gProduction);
    agg.condensate += toNum(m.condensate);
    agg.rainCollect += toNum(m.rainCollect);
    agg.rainUse += toNum(m.rainUse);
    agg.boiler += toNum(m.boiler);
  });
  return agg;
};

const periodText = (agg: Agg, year: string): string => {
  if (agg.count === 0) return `Aggregated Period: No data entered ${year} (m³)`;
  if (agg.first === agg.last) return `Aggregated Period: ${SHORT[agg.first]} ${year} (m³)`;
  return `Aggregated Period: ${SHORT[agg.first]} – ${SHORT[agg.last]} ${year} (m³)`;
};

/* =========================================================================
   WATER BALANCE DIAGRAM (SVG STRING - shared by screen & print)
   ========================================================================= */
const PIPE_COLORS: Record<string, string> = {
  mun: '#2563EB',
  gnd: '#0891B2',
  dom: '#1D4ED8',
  rain: '#16A34A',
  reuse: '#0D9488',
  loss: '#DC2626',
  blow: '#D97706',
  ww: '#2563EB',
};

interface DiagramLine {
  t: string;
  s?: number;
  b?: boolean;
  c?: string;
}

const buildDiagramSvg = (
  agg: Agg,
  names: MeterNames,
  opts: { rain: boolean; reuse: boolean },
  animated: boolean,
  label: string
): string => {
  const nM = names.municipal.length;
  const nG = names.ground.length;
  const totMun = sumArr(agg.municipal);
  const totGnd = sumArr(agg.ground);
  const totDom = agg.mDomestic + agg.gDomestic;
  const totProd = agg.mProduction + agg.gProduction;
  const loss = totDom * 0.1;
  const ww = totDom - loss;
  const discharge = ww + agg.boiler;
  const totReuse = sumArr(agg.reuse) + agg.condensate;
  const altSources = (opts.rain ? agg.rainUse : 0) + (opts.reuse ? totReuse : 0);

  const W = 1280;
  const STEP = 60;
  const BH = 46;
  const bm = nM * STEP - 14;
  const bg = nG * STEP - 14;
  const yM = Math.max(bm / 2 + 60, 165);
  const mTop = yM - bm / 2;
  const yG = Math.max(mTop + bm + 40 + bg / 2, yM + 190);
  const gTop = yG - bg / 2;
  const anyExtra = opts.rain || opts.reuse;
  const nodesEnd = yG + 107 + (opts.rain ? 70 : 0) + (opts.reuse ? 70 : 0);
  const H = Math.max(anyExtra ? nodesEnd + 20 : yG + 120, gTop + bg + 30);

  const boxes: string[] = [];
  const pipes: string[] = [];
  const labels: string[] = [];

  const box = (
    x: number,
    y: number,
    w: number,
    h: number,
    fill: string,
    stroke: string,
    lines: DiagramLine[],
    dashed?: boolean
  ): void => {
    const gap = 4;
    const total = lines.reduce((a, l) => a + (l.s === undefined ? 11 : l.s) + gap, 0) - gap;
    let cy = y + (h - total) / 2;
    let out = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="1.5"${
      dashed ? ' stroke-dasharray="5 4"' : ''
    }/>`;
    lines.forEach((l) => {
      const s = l.s === undefined ? 11 : l.s;
      const max = Math.max(4, Math.floor((w - 12) / (s * 0.5)));
      const t = l.t.length > max ? l.t.slice(0, max - 1) + '…' : l.t;
      out += `<text x="${x + w / 2}" y="${(cy + s * 0.85).toFixed(1)}" text-anchor="middle" font-size="${s}" font-weight="${
        l.b ? 700 : 400
      }" fill="${l.c || '#1F2937'}">${esc(t)}</text>`;
      cy += s + gap;
    });
    boxes.push(out);
  };

  const pipe = (d: string, key: string, isLoss?: boolean): void => {
    const col = PIPE_COLORS[key] || '#2563EB';
    pipes.push(
      `<path d="${d}" fill="none" stroke="${col}" stroke-opacity="0.16" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>` +
        `<path d="${d}" fill="none" stroke="${col}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" class="${
          isLoss ? 'wb-loss' : 'wb-flow'
        }" marker-end="url(#wb-ar-${key})"/>`
    );
  };

  const lbl = (x: number, y: number, t: string, size: number, bold: boolean, anchor: string, fill: string): void => {
    labels.push(
      `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" font-weight="${
        bold ? 700 : 400
      }" fill="${fill}" class="wb-halo">${esc(t)}</text>`
    );
  };

  /* ----- Left stage: meters -> reservoirs ----- */
  names.municipal.forEach((nm, i) => {
    const y = mTop + i * STEP;
    const cy = y + BH / 2;
    box(20, y, 150, BH, '#EFF6FF', '#2563EB', [
      { t: nm, s: 11, b: true, c: '#1E40AF' },
      { t: `${fmt(agg.municipal[i] || 0)} m³`, s: 12 },
    ]);
    const endY = yM + (i - (nM - 1) / 2) * 8;
    pipe(`M170 ${cy} C 205 ${cy}, 205 ${endY}, 240 ${endY}`, 'mun');
  });
  names.ground.forEach((nm, i) => {
    const y = gTop + i * STEP;
    const cy = y + BH / 2;
    box(20, y, 150, BH, '#ECFEFF', '#0891B2', [
      { t: nm, s: 11, b: true, c: '#155E75' },
      { t: `${fmt(agg.ground[i] || 0)} m³`, s: 12 },
    ]);
    const endY = yG + (i - (nG - 1) / 2) * 8;
    pipe(`M170 ${cy} C 205 ${cy}, 205 ${endY}, 240 ${endY}`, 'gnd');
  });

  box(240, yM - 50, 180, 100, '#DBEAFE', '#2563EB', [
    { t: 'Municipal Water Reservoir', s: 11, b: true, c: '#1E3A8A' },
    { t: 'Total Municipal (m³)', s: 10 },
    { t: fmt(totMun), s: 15, b: true, c: '#1E40AF' },
  ]);
  box(240, yG - 55, 180, 110, '#CFFAFE', '#0891B2', [
    { t: 'Ground Water Reservoir', s: 11, b: true, c: '#164E63' },
    { t: 'Total Ground Water (m³)', s: 10 },
    { t: fmt(totGnd), s: 15, b: true, c: '#0E7490' },
  ]);

  /* ----- Middle stage ----- */
  box(520, yM - 50, 180, 100, '#E0F2FE', '#1D4ED8', [
    { t: 'Domestic Use', s: 12, b: true, c: '#1E3A8A' },
    { t: 'Total Domestic Use (m³)', s: 10 },
    { t: fmt(totDom), s: 15, b: true, c: '#1D4ED8' },
    { t: `Mun ${fmt(agg.mDomestic)} + Gnd ${fmt(agg.gDomestic)}`, s: 9, c: '#475569' },
  ]);

  // Municipal -> Domestic (100% direct)
  pipe(`M420 ${yM} H520`, 'mun');
  lbl(470, yM - 10, 'Municipal Domestic', 9, false, 'middle', '#1E40AF');
  lbl(470, yM + 20, `${fmt(agg.mDomestic)} m³`, 10, true, 'middle', '#1E40AF');

  // Ground -> Domestic (pipe 2)
  pipe(`M420 ${yG - 25} H620 V${yM + 50}`, 'gnd');
  lbl(520, yG - 50, 'Ground Water Total - Boiler Water', 10, false, 'middle', '#155E75');
  lbl(520, yG - 36, `${fmt(agg.gDomestic)} m³`, 11, true, 'middle', '#155E75');

  // Ground -> Boiler sub-meter -> Production (pipe 1)
  pipe(`M420 ${yG + 25} H520`, 'gnd');
  box(520, yG + 1, 180, 48, '#FFFBEB', '#D97706', [
    { t: 'Boiler Water Sub-Meter', s: 10, b: true, c: '#92400E' },
    { t: `${fmt(agg.gProduction)} m³`, s: 12 },
  ]);
  pipe(`M700 ${yG + 25} H800`, 'gnd');

  box(800, yG - 25, 170, 100, '#FEF3C7', '#D97706', [
    { t: 'Production / Boiler Use', s: 11, b: true, c: '#92400E' },
    { t: 'Total Production (m³)', s: 10 },
    { t: fmt(totProd), s: 15, b: true, c: '#B45309' },
    ...(altSources > 0
      ? [{ t: `+ Alt. sources: ${fmt(altSources)}`, s: 9, c: '#475569' } as DiagramLine]
      : []),
  ]);

  // Municipal production (only drawn when data exists, keeps the balance honest)
  if (agg.mProduction > 0) {
    pipe(`M330 ${yM + 50} V${yM + 105} H885 V${yG - 25}`, 'mun');
    lbl(345, yM + 98, `Municipal Production: ${fmt(agg.mProduction)} m³`, 9, false, 'start', '#1E40AF');
  }

  /* ----- Rainwater & Reuse ----- */
  let slotY = yG + 107;
  if (opts.rain) {
    box(520, slotY, 180, 56, '#DCFCE7', '#16A34A', [
      { t: 'Rainwater Use', s: 11, b: true, c: '#166534' },
      { t: `${fmt(agg.rainUse)} m³`, s: 12 },
      { t: `Collected: ${fmt(agg.rainCollect)} m³`, s: 9, c: '#475569' },
    ]);
    pipe(`M700 ${slotY + 28} H850 V${yG + 75}`, 'rain');
    slotY += 70;
  }
  if (opts.reuse) {
    box(520, slotY, 180, 56, '#CCFBF1', '#0D9488', [
      { t: 'Total Reuse + Condensate', s: 11, b: true, c: '#115E59' },
      { t: `${fmt(totReuse)} m³`, s: 12 },
      { t: `Reuse ${fmt(sumArr(agg.reuse))} + Cond. ${fmt(agg.condensate)}`, s: 9, c: '#475569' },
    ]);
    pipe(`M700 ${slotY + 28} H920 V${yG + 75}`, 'reuse');
  }

  /* ----- Right stage: loss, wastewater, discharge ----- */
  // Branch A: 10% loss (dashed)
  pipe(`M700 ${yM - 20} H750 V${yM - 80} H800`, 'loss', true);
  box(
    800,
    yM - 110,
    200,
    60,
    '#FEE2E2',
    '#DC2626',
    [
      { t: '10% Domestic Loss (m³)', s: 11, b: true, c: '#991B1B' },
      { t: fmt(loss), s: 14, b: true, c: '#B91C1C' },
    ],
    true
  );

  // Branch B: 90% wastewater
  pipe(`M700 ${yM + 20} H800`, 'ww');
  box(800, yM - 10, 200, 60, '#DBEAFE', '#2563EB', [
    { t: '90% Domestic Wastewater (m³)', s: 11, b: true, c: '#1E3A8A' },
    { t: fmt(ww), s: 14, b: true, c: '#1D4ED8' },
  ]);
  pipe(`M1000 ${yM + 20} H1150 V${yM + 90}`, 'ww');

  // Boiler blowdown to discharge
  pipe(`M970 ${yG + 25} H1050`, 'blow');
  lbl(1010, yG + 12, 'Boiler Blowdown', 9, false, 'middle', '#92400E');
  lbl(1010, yG + 48, `${fmt(agg.boiler)} m³`, 10, true, 'middle', '#92400E');

  box(1050, yM + 90, 200, yG - yM - 30, '#EDE9FE', '#7C3AED', [
    { t: 'Final Discharge Point', s: 12, b: true, c: '#4C1D95' },
    { t: `90% Dom. Wastewater: ${fmt(ww)}`, s: 10 },
    { t: `Boiler Blowdown: ${fmt(agg.boiler)}`, s: 10 },
    { t: 'Total Discharge Water (m³)', s: 11, b: true, c: '#4C1D95' },
    { t: fmt(discharge), s: 17, b: true, c: '#6D28D9' },
  ]);

  /* ----- Defs, style, title ----- */
  let markers = '';
  Object.keys(PIPE_COLORS).forEach((k) => {
    markers += `<marker id="wb-ar-${k}" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="11" markerHeight="11" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="${PIPE_COLORS[k]}"/></marker>`;
  });

  const style =
    `<style>` +
    `.wb-svg{font-family:Arial,Helvetica,sans-serif}` +
    `.wb-svg .wb-flow{stroke-dasharray:10 8}` +
    `.wb-svg .wb-loss{stroke-dasharray:6 5}` +
    `.wb-svg .wb-halo{paint-order:stroke;stroke:#fff;stroke-width:3px;stroke-linejoin:round}` +
    (animated
      ? `.wb-svg .wb-flow{animation:wbflow 0.9s linear infinite}.wb-svg .wb-loss{animation:wbflow 1.2s linear infinite}` +
        `@keyframes wbflow{to{stroke-dashoffset:-18}}` +
        `@media (prefers-reduced-motion: reduce){.wb-svg .wb-flow,.wb-svg .wb-loss{animation:none}}`
      : '') +
    `</style>`;

  return (
    `<svg class="wb-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Water Balance Diagram">` +
    `<defs>${markers}</defs>${style}` +
    `<rect x="0" y="0" width="${W}" height="${H}" fill="#FFFFFF"/>` +
    `<text x="20" y="28" font-size="14" font-weight="700" fill="#111827">${esc(label)}</text>` +
    boxes.join('') +
    pipes.join('') +
    labels.join('') +
    `</svg>`
  );
};

/* =========================================================================
   STATIC TABLE (Excel + Print) - built from the same column definitions
   ========================================================================= */
const buildStaticTable = (
  d: FormData,
  selected: Record<GroupKey, boolean>
): { html: string; cols: number } => {
  const groups = buildGroups(d.names).filter((g) => selected[g.key]);
  const calcs = d.months.map(calcMonth);
  const base = 'border:1px solid #777;padding:3px 4px;';

  let r1 = `<tr><th rowspan="2" style="${base}background:#E5E7EB;text-align:left">Month</th>`;
  let r2 = '<tr>';
  let colCount = 2;
  groups.forEach((g) => {
    const t = THEMES[g.key];
    colCount += g.cols.length;
    r1 += `<th colspan="${g.cols.length}" style="${base}background:${t.head};color:${t.text};text-align:center">${esc(g.title)}</th>`;
    g.cols.forEach((c) => {
      r2 += `<th style="${base}background:${t.head};color:${t.text};text-align:center">${esc(c.label)}${
        c.sub ? `<br/><span style="font-weight:normal">${esc(c.sub)}</span>` : ''
      }</th>`;
    });
  });
  r1 += `<th rowspan="2" style="${base}background:#E5E7EB;text-align:center">REMARKS</th></tr>`;
  r2 += '</tr>';

  let body = '';
  d.months.forEach((m, mi) => {
    body += `<tr><td style="${base}background:#F3F4F6;text-align:left;font-weight:bold">${MONTHS[mi]}</td>`;
    groups.forEach((g) => {
      const t = THEMES[g.key];
      g.cols.forEach((c) => {
        let v = '';
        if (c.kind === 'calc') v = fix2(c.num(m, calcs[mi]));
        else {
          const rv = c.raw ? c.raw(m) : '';
          v = rv === '' ? '' : fix2(toNum(rv));
        }
        body += `<td style="${base}background:${c.kind === 'calc' ? t.lock : t.cell};text-align:right">${v}</td>`;
      });
    });
    body += `<td style="${base}text-align:left">${esc(m.remarks)}</td></tr>`;
  });

  let tot = `<tr><td style="${base}background:#E5E7EB;font-weight:bold;text-align:left">Total</td>`;
  groups.forEach((g) => {
    const t = THEMES[g.key];
    g.cols.forEach((c) => {
      const s = sumArr(d.months.map((m, mi) => c.num(m, calcs[mi])));
      tot += `<td style="${base}background:${t.head};color:${t.text};font-weight:bold;text-align:right">${fix2(s)}</td>`;
    });
  });
  tot += `<td style="${base}background:#E5E7EB"></td></tr>`;

  return {
    html: `<table class="rt" style="border-collapse:collapse"><thead>${r1}${r2}</thead><tbody>${body}${tot}</tbody></table>`,
    cols: colCount,
  };
};

const letterheadHtml = (company: string, unit: string, year: string, title: string): string => {
  const printed = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  return (
    `<div class="lh"><div><div class="co">${esc(company)}</div>` +
    `<div class="tt">${esc(title)}</div></div>` +
    `<div class="mt">Unit: <b>${esc(unit)}</b><br/>Year: <b>${esc(year)}</b><br/>Printed: ${esc(printed)}</div></div>`
  );
};

/* =========================================================================
   COMPONENT
   ========================================================================= */
const CSS = `
.wwf-root{font-family:Inter,Segoe UI,Arial,sans-serif;color:#1f2937;display:flex;flex-direction:column;gap:16px}
.wwf-card{background:#fff;border:1px solid #d1d5db;border-radius:10px;padding:14px}
.wwf-bar{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center}
.wwf-title{font-size:18px;font-weight:700;margin:0}
.wwf-btn{border:1px solid #94a3b8;background:#f8fafc;color:#0f172a;border-radius:6px;padding:6px 12px;font-size:13px;font-weight:600;cursor:pointer}
.wwf-btn:hover{background:#e2e8f0}
.wwf-btn:focus-visible,.wwf-in:focus-visible,.wwf-name:focus-visible,.wwf-sel:focus-visible{outline:2px solid #2563eb;outline-offset:1px}
.wwf-btn-primary{background:#0f766e;border-color:#0f766e;color:#fff}
.wwf-btn-primary:hover{background:#115e59}
.wwf-chk{display:inline-flex;gap:5px;align-items:center;font-size:13px;cursor:pointer}
.wwf-scroll{overflow:auto;border:1px solid #d1d5db;border-radius:8px;max-height:75vh;background:#fff}
.wwf-table{border-collapse:separate;border-spacing:0;font-size:12px;min-width:100%}
.wwf-table th,.wwf-table td{border-right:1px solid #d6d3d1;border-bottom:1px solid #d6d3d1;padding:4px 6px;white-space:nowrap;vertical-align:middle}
.wwf-table th{text-align:center;font-weight:700}
.wwf-month{position:sticky;left:0;z-index:2;background:#f3f4f6;min-width:100px;text-align:left!important;font-weight:600}
.wwf-table thead .wwf-month{z-index:4;background:#e5e7eb}
.wwf-in{width:92px;text-align:right;padding:3px 5px;border:1px solid #cbd5e1;border-radius:4px;background:#fff;font-variant-numeric:tabular-nums;font-size:12px}
.wwf-name{width:96px;padding:2px 4px;border:1px solid #cbd5e1;border-radius:4px;background:#fff;font-size:11px;font-weight:700;text-align:center}
.wwf-lock{text-align:right;font-variant-numeric:tabular-nums;font-weight:600;color:#374151;cursor:not-allowed}
.wwf-rem{width:200px;text-align:left;padding:3px 5px;border:1px solid #cbd5e1;border-radius:4px;font-size:12px}
.wwf-x{margin-left:4px;border:none;background:transparent;color:#b91c1c;font-size:15px;font-weight:700;cursor:pointer;line-height:1}
.wwf-add{margin-left:8px;border:1px dashed currentColor;background:rgba(255,255,255,.7);border-radius:5px;padding:2px 8px;font-size:11px;font-weight:700;cursor:pointer;color:inherit}
.wwf-sub{display:block;font-size:10px;font-weight:400;opacity:.85;white-space:normal;max-width:170px;margin:2px auto 0}
.wwf-badge{display:inline-block;background:#ecfdf5;color:#065f46;border:1px solid #6ee7b7;border-radius:999px;padding:4px 12px;font-size:12px;font-weight:700}
.wwf-sel{border:1px solid #94a3b8;border-radius:6px;padding:5px 8px;font-size:13px;background:#fff;max-width:100%}
.wwf-dg{overflow-x:auto;border:1px solid #e5e7eb;border-radius:8px;background:#fff}
.wwf-dg svg{display:block;width:100%;min-width:960px;height:auto}
`;

export const WaterWithdrawalForm = ({
  selectedUnit,
  selectedYear,
  companyName,
  userRole,
  restGet,
  restSet,
}: WaterWithdrawalFormProps) => {
  const isViewer = userRole === 'viewer';
  const unit = selectedUnit === undefined || selectedUnit === '' ? 'Default Unit' : String(selectedUnit);
  const year =
    selectedYear === undefined || selectedYear === '' ? String(new Date().getFullYear()) : String(selectedYear);
  const company = companyName && companyName.trim() !== '' ? companyName : 'Company Name';
  const storageKey = `water_withdrawal_${unit}_${year}`;

  const [data, setData] = useState<FormData>(() => loadData(storageKey));
  const [loadedKey, setLoadedKey] = useState<string>(storageKey);
  const { gridHandlers, gridError, reportGridError } = useInventoryGrid();
  const { status, error, saveNow } = useHybridAutoSave({
    unit,
    year,
    moduleId: 'water_withdrawal',
    storageKey,
    payload: data,
    restGet,
    restSet,
    enabled: !isViewer,
    ready: loadedKey === storageKey,
  });
  const [selected, setSelected] = useState<Record<GroupKey, boolean>>({
    municipal: true,
    ground: true,
    total: true,
    reuse: true,
    rain: true,
    discharge: true,
  });
  const [mode, setMode] = useState<DiagramMode>('all');
  const [inclRain, setInclRain] = useState<boolean>(true);
  const [inclReuse, setInclReuse] = useState<boolean>(true);
  const [animated, setAnimated] = useState<boolean>(true);

  /* ----- Load when unit / year changes ----- */
  useEffect(() => {
    if (loadedKey === storageKey) return;
    setData(loadData(storageKey));
    setLoadedKey(storageKey);
  }, [storageKey, loadedKey]);

  /* ----- Save on change ----- */
  useEffect(() => {
    if (loadedKey !== storageKey) return;
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (e) {
      /* storage full / blocked: ignore */
    }
  }, [data, storageKey, loadedKey]);

  const groups = useMemo(() => buildGroups(data.names), [data.names]);
  const calcs = useMemo(() => data.months.map(calcMonth), [data.months]);
  const agg = useMemo(() => aggregate(data), [data]);
  const label = useMemo(() => periodText(agg, year), [agg, year]);

  const svgHtml = useMemo(
    () => buildDiagramSvg(agg, data.names, { rain: inclRain, reuse: inclReuse }, animated, label),
    [agg, data.names, inclRain, inclReuse, animated, label]
  );

  /* ----- Mutations ----- */
  const updateMonth = (mi: number, fn: (m: MonthEntry) => MonthEntry): void => {
    if (isViewer) return;
    setData((d) => ({ ...d, months: d.months.map((m, i) => (i === mi ? fn(m) : m)) }));
  };

  const onCell = (mi: number, col: Col, v: string): void => {
    if (isViewer) return;
    if (!col.set) return;
    const normalized = normalizeNumericInput(v);
    if (normalized === null) {
      reportGridError(v.trim().startsWith('-') ? 'Negative value not allowed' : 'Invalid text pasted in numeric cell');
      return;
    }
    const setter = col.set;
    updateMonth(mi, (m) => setter(m, normalized));
  };

  const onCellBlur = (mi: number, col: Col): void => {
    if (isViewer) return;
    if (!col.set || !col.raw) return;
    const setter = col.set;
    const current = col.raw(data.months[mi]);
    if (current === '' || current === '.') {
      if (current === '.') updateMonth(mi, (m) => setter(m, ''));
      return;
    }
    const formatted = fix2(toNum(current));
    if (formatted !== current) updateMonth(mi, (m) => setter(m, formatted));
  };

  const renameMeter = (key: MeterKey, idx: number, name: string): void => {
    if (isViewer) return;
    setData((d) => ({
      ...d,
      names: { ...d.names, [key]: d.names[key].map((n, i) => (i === idx ? name : n)) } as MeterNames,
    }));
  };

  const addMeter = (key: MeterKey): void => {
    if (isViewer) return;
    setData((d) => {
      if (d.names[key].length >= 30) return d;
      const n = d.names[key].length + 1;
      const nm = key === 'reuse' ? `Meter ${n} (m³)` : `Meter ${n}`;
      return {
        names: { ...d.names, [key]: [...d.names[key], nm] } as MeterNames,
        months: d.months.map((m) => ({ ...m, [key]: [...m[key], ''] } as MonthEntry)),
      };
    });
  };

  const removeMeter = (key: MeterKey, idx: number): void => {
    if (isViewer) return;
    if (data.names[key].length <= 1) return;
    const has = data.months.some((m) => (m[key][idx] === undefined ? '' : m[key][idx]) !== '');
    if (has && typeof window !== 'undefined') {
      if (!window.confirm('This meter has entered values. Remove it and delete its data?')) return;
    }
    setData((d) => {
      if (d.names[key].length <= 1) return d;
      return {
        names: { ...d.names, [key]: d.names[key].filter((_n, i) => i !== idx) } as MeterNames,
        months: d.months.map(
          (m) => ({ ...m, [key]: m[key].filter((_v, i) => i !== idx) } as MonthEntry)
        ),
      };
    });
  };

  /* ----- Diagram filter handlers ----- */
  const onMode = (v: string): void => {
    if (v === 'all') {
      setMode('all');
      setInclRain(true);
      setInclReuse(true);
    } else if (v === 'core') {
      setMode('core');
      setInclRain(false);
      setInclReuse(false);
    } else {
      setMode('custom');
    }
  };
  const onRain = (v: boolean): void => {
    setInclRain(v);
    setMode(v && inclReuse ? 'all' : !v && !inclReuse ? 'core' : 'custom');
  };
  const onReuse = (v: boolean): void => {
    setInclReuse(v);
    setMode(v && inclRain ? 'all' : !v && !inclRain ? 'core' : 'custom');
  };

  /* ----- Export helpers ----- */
  const effectiveSelected = (): Record<GroupKey, boolean> => {
    const any = GROUP_KEYS.some((k) => selected[k]);
    if (any) return selected;
    return { municipal: true, ground: true, total: true, reuse: true, rain: true, discharge: true };
  };

  const downloadExcel = (): void => {
    try {
      const { html, cols } = buildStaticTable(data, effectiveSelected());
      const printed = new Date().toLocaleDateString('en-GB');
      const head =
        `<table><tr><td colspan="${cols}" style="font-size:18pt;font-weight:bold">${esc(company)}</td></tr>` +
        `<tr><td colspan="${cols}" style="font-size:13pt;font-weight:bold">WATER WITHDRAWAL &amp; DISCHARGE RECORD</td></tr>` +
        `<tr><td colspan="${cols}">Unit: ${esc(unit)} | Year: ${esc(year)} | Printed: ${esc(printed)}</td></tr>` +
        `<tr><td colspan="${cols}"></td></tr></table>`;
      const doc =
        `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">` +
        `<head><meta charset="utf-8"/>` +
        `<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Water Withdrawal</x:Name>` +
        `<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->` +
        `<style>td,th{font-family:Arial;font-size:10pt;mso-number-format:"\\@"}</style></head>` +
        `<body>${head}${html}</body></html>`;
      const blob = new Blob(['\ufeff' + doc], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Water_Withdrawal_${unit.replace(/[^\w-]+/g, '_')}_${year}.xls`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      if (typeof window !== 'undefined') window.alert('Could not create the Excel file.');
    }
  };

  const printPdf = (): void => {
    try {
      const { html: tbl } = buildStaticTable(data, effectiveSelected());
      const svg = buildDiagramSvg(agg, data.names, { rain: inclRain, reuse: inclReuse }, false, label);
      const title = 'WATER WITHDRAWAL & DISCHARGE RECORD';
      const doc =
        `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Water Withdrawal ${esc(unit)} ${esc(year)}</title>` +
        `<style>` +
        `@page{size:A4 landscape;margin:8mm}` +
        `*{box-sizing:border-box}` +
        `html,body{margin:0;padding:0}` +
        `body{font-family:Arial,Helvetica,sans-serif;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}` +
        `.lh{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #0f766e;padding-bottom:6px;margin-bottom:8px}` +
        `.co{font-size:20px;font-weight:700;color:#0f172a}` +
        `.tt{font-size:12px;font-weight:700;color:#0f766e;margin-top:2px}` +
        `.mt{font-size:10px;text-align:right;line-height:1.5}` +
        `table.rt{border-collapse:collapse;width:100%}` +
        `table.rt th,table.rt td{font-size:7px;line-height:1.25}` +
        `table.rt th{font-weight:700}` +
        `.last{page-break-before:always}` +
        `.badge{display:inline-block;font-size:10px;font-weight:700;border:1px solid #059669;background:#ecfdf5;color:#065f46;border-radius:10px;padding:2px 8px;margin-bottom:6px}` +
        `.dg svg{display:block;width:100%;height:auto;max-height:118mm}` +
        `.sig{display:flex;gap:40px;margin-top:70px}` +
        `.sig div{flex:1;border-top:1px solid #000;padding-top:4px;text-align:center;font-size:11px;font-weight:700}` +
        `.sig span{display:block;font-weight:400;font-size:9px;color:#444;margin-top:2px}` +
        `</style></head><body>` +
        `<div class="page">${letterheadHtml(company, unit, year, title)}${tbl}</div>` +
        `<div class="last">${letterheadHtml(company, unit, year, 'WATER BALANCE DIAGRAM (m³)')}` +
        `<div class="badge">${esc(label)}</div><div class="dg">${svg}</div>` +
        `<div class="sig"><div>Prepared By<span>Name / Signature / Date</span></div>` +
        `<div>Checked By<span>Name / Signature / Date</span></div>` +
        `<div>Approved By<span>Name / Signature / Date</span></div></div></div>` +
        `</body></html>`;
      const w = window.open('', '_blank');
      if (!w) {
        window.alert('Pop-up blocked. Please allow pop-ups for this site to print or save the PDF.');
        return;
      }
      w.document.open();
      w.document.write(doc);
      w.document.close();
      w.focus();
      setTimeout(() => {
        try {
          w.print();
        } catch (e) {
          /* user can print manually */
        }
      }, 600);
    } catch (e) {
      if (typeof window !== 'undefined') window.alert('Could not open the print preview.');
    }
  };

  /* ----- Table totals ----- */
  const totalFor = (c: Col): number => sumArr(data.months.map((m, mi) => c.num(m, calcs[mi])));

  /* =======================================================================
     RENDER
     ======================================================================= */
  return (
    <div {...gridHandlers} className="wwf-root">
      <style>{CSS}</style>

      {/* ---------- Header / actions ---------- */}
      <div className="wwf-card">
        <div className="wwf-bar" style={{ justifyContent: 'space-between' }}>
          <div>
            <h2 className="wwf-title">Water Withdrawal &amp; Discharge</h2>
            <div style={{ fontSize: 12, color: '#475569' }}>
              Unit: <b>{unit}</b> &nbsp; Year: <b>{year}</b> &nbsp; All values in m³ (2 decimals)
            </div>
          </div>
          <div className="wwf-bar">
            {!isViewer && (
              <button type="button" className="wwf-btn" onClick={() => { void saveNow(); }}>
                Save Data
              </button>
            )}
            <button type="button" className="wwf-btn" onClick={downloadExcel}>
              Download Excel (.xls)
            </button>
            <button type="button" className="wwf-btn wwf-btn-primary" onClick={printPdf}>
              Print / Save PDF
            </button>
          </div>
        </div>
        <InventorySaveStatus status={status} error={error} gridError={gridError} />
        <div className="wwf-bar" style={{ marginTop: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700 }}>Include in Excel / PDF:</span>
          {GROUP_KEYS.map((k) => (
            <label key={k} className="wwf-chk">
              <input
                type="checkbox"
                checked={selected[k]}
                onChange={(e) => setSelected((s) => ({ ...s, [k]: e.target.checked }))}
              />
              {GROUP_LABELS[k]}
            </label>
          ))}
        </div>
      </div>

      {/* ---------- Table ---------- */}
      <div className="wwf-scroll">
        <table className="wwf-table">
          <thead>
            <tr>
              <th rowSpan={2} className="wwf-month">
                Month
              </th>
              {groups.map((g) => {
                const t = THEMES[g.key];
                return (
                  <th
                    key={g.key}
                    colSpan={g.cols.length}
                    style={{ background: t.head, color: t.text, borderBottom: `2px solid ${t.border}` }}
                  >
                    {g.title}
                    {g.addKey && !isViewer && (
                      <button
                        type="button"
                        className="wwf-add"
                        onClick={() => g.addKey && addMeter(g.addKey)}
                      >
                        {g.addLabel}
                      </button>
                    )}
                  </th>
                );
              })}
              <th rowSpan={2} style={{ background: '#e5e7eb', minWidth: 220 }}>
                REMARKS
              </th>
            </tr>
            <tr>
              {groups.map((g) => {
                const t = THEMES[g.key];
                return (
                  <React.Fragment key={g.key}>
                    {g.cols.map((c) => (
                      <th key={c.id} style={{ background: t.head, color: t.text }}>
                        {c.meter ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                            <input
                              className="wwf-name"
                              value={c.label}
                              aria-label="Meter name"
                              disabled={isViewer}
                              onChange={(e) =>
                                c.meter && renameMeter(c.meter.key, c.meter.idx, e.target.value)
                              }
                            />
                            {!isViewer && data.names[c.meter.key].length > 1 && (
                              <button
                                type="button"
                                className="wwf-x"
                                title="Remove meter"
                                aria-label={`Remove ${c.label}`}
                                onClick={() => c.meter && removeMeter(c.meter.key, c.meter.idx)}
                              >
                                ×
                              </button>
                            )}
                          </span>
                        ) : (
                          <>
                            {c.label}
                            {c.sub && <span className="wwf-sub">{c.sub}</span>}
                          </>
                        )}
                      </th>
                    ))}
                  </React.Fragment>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {data.months.map((m, mi) => (
              <tr key={MONTHS[mi]}>
                <td className="wwf-month">{MONTHS[mi]}</td>
                {groups.map((g) => {
                  const t = THEMES[g.key];
                  return (
                    <React.Fragment key={g.key}>
                      {g.cols.map((c) =>
                        c.kind === 'calc' ? (
                          <td
                            key={c.id}
                            className="wwf-lock"
                            style={{ background: t.lock }}
                            title="Auto-calculated (locked)"
                          >
                            {fix2(c.num(m, calcs[mi]))}
                          </td>
                        ) : (
                          <td key={c.id} style={{ background: t.cell }}>
                            <input
                              className="wwf-in"
                              inputMode="decimal"
                              placeholder="0.00"
                              value={c.raw ? c.raw(m) : ''}
                              aria-label={`${MONTHS[mi]} ${c.label}`}
                              disabled={isViewer}
                              onChange={(e) => onCell(mi, c, e.target.value)}
                              onBlur={() => onCellBlur(mi, c)}
                            />
                          </td>
                        )
                      )}
                    </React.Fragment>
                  );
                })}
                <td style={{ background: '#fff' }}>
                  <input
                    className="wwf-rem"
                    value={m.remarks}
                    aria-label={`${MONTHS[mi]} remarks`}
                    disabled={isViewer}
                    onChange={(e) => {
                      const v = e.target.value;
                      updateMonth(mi, (x) => ({ ...x, remarks: v }));
                    }}
                  />
                </td>
              </tr>
            ))}
            <tr>
              <td className="wwf-month" style={{ background: '#e5e7eb' }}>
                Total
              </td>
              {groups.map((g) => {
                const t = THEMES[g.key];
                return (
                  <React.Fragment key={g.key}>
                    {g.cols.map((c) => (
                      <td
                        key={c.id}
                        style={{
                          background: t.head,
                          color: t.text,
                          fontWeight: 700,
                          textAlign: 'right',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {fix2(totalFor(c))}
                      </td>
                    ))}
                  </React.Fragment>
                );
              })}
              <td style={{ background: '#e5e7eb' }} />
            </tr>
          </tbody>
        </table>
      </div>

      {/* ---------- Water Balance Diagram ---------- */}
      <div className="wwf-card">
        <div className="wwf-bar" style={{ justifyContent: 'space-between' }}>
          <h3 className="wwf-title" style={{ fontSize: 16 }}>
            Water Balance Diagram (m³)
          </h3>
          <span className="wwf-badge">{label}</span>
        </div>

        <div className="wwf-bar" style={{ margin: '10px 0' }}>
          <label className="wwf-chk" style={{ gap: 8 }}>
            <span style={{ fontWeight: 700 }}>Components</span>
            <select
              className="wwf-sel"
              value={mode}
              onChange={(e) => onMode(e.target.value)}
              aria-label="Diagram components"
            >
              <option value="all">All Components (Municipal + Ground + Rainwater + Reuse)</option>
              <option value="core">Core Withdrawal &amp; Discharge Only (Municipal + Ground)</option>
              <option value="custom">Custom selection</option>
            </select>
          </label>
          <label className="wwf-chk">
            <input type="checkbox" checked={inclRain} onChange={(e) => onRain(e.target.checked)} />
            Include Rainwater Harvesting
          </label>
          <label className="wwf-chk">
            <input type="checkbox" checked={inclReuse} onChange={(e) => onReuse(e.target.checked)} />
            Include Water Reuse &amp; Condensate Recovery
          </label>
          <button type="button" className="wwf-btn" onClick={() => setAnimated((a) => !a)}>
            {animated ? 'Pause flow' : 'Play flow'}
          </button>
        </div>

        <div style={{ fontSize: 12, color: '#475569', marginBottom: 8 }}>
          {agg.count === 0
            ? 'Enter monthly values in the table above to populate the diagram.'
            : `Sums ${agg.count} month${agg.count === 1 ? '' : 's'} with entered data.`}
        </div>

        <div className="wwf-dg" dangerouslySetInnerHTML={{ __html: svgHtml }} />
      </div>
    </div>
  );
};

export default WaterWithdrawalForm;
