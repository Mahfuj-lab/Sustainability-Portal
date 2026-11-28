import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { UNIT_DIRECTORY } from '../utils/unitDirectory';
import type { InventoryRestGet, InventoryRestSet } from '../utils/inventoryDataEntry';
import {
  InventorySaveStatus,
  normalizeNumericInput,
  useHybridAutoSave,
  useInventoryGrid,
} from '../utils/inventoryDataEntry';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
type SectionId = 'nonhaz' | 'haz' | 'recycle' | 'summary' | 'reject' | 'remarks';
type Mode = 'all' | 'total';
type RecycleType = 'Recycle' | 'Reuse';

interface ItemDef {
  id: string;
  label: string;
  custom?: boolean;
}

interface GroupDef {
  id: string;
  section: SectionId;
  title: string;
  totalLabel: string;
  hasSub: boolean;
  /** Standalone groups have no sub-header and no sub-total; their items add directly into the section total. */
  standalone?: boolean;
  /** When false, no "+ Add" button is shown for this group. */
  addable?: boolean;
  addLabel: string;
  includeLabel: string;
  allLabel: string;
  totalOnlyLabel: string;
  defaults: ItemDef[];
}

interface Col {
  id: string;
  label: string;
  section: SectionId;
  sub: string | null;
  kind: 'input' | 'calc' | 'text';
  calcKey?: string;
  groupId?: string;
  removeId?: string;
}

interface HCell {
  key: string;
  label: string;
  colSpan: number;
  rowSpan: number;
  section: SectionId;
  tone: 'section' | 'sub' | 'col';
  groupId?: string;
  removeId?: string;
  addGroupId?: string;
}

interface Filters {
  include: Record<string, boolean>;
  mode: Record<string, Mode>;
  hiddenItems: Record<string, boolean>;
  summary: boolean;
  reject: boolean;
  remarks: boolean;
}

interface AddDialog {
  gid: string;
  name: string;
  type: RecycleType;
}

type MonthData = Record<string, string>;
type DataMap = Record<string, MonthData>;
type CustomMap = Record<string, ItemDef[]>;

export interface WasteManagementFormProps {
  selectedUnit: string;
  selectedYear: number | string;
  userRole?: string;
  restGet?: InventoryRestGet;
  restSet?: InventoryRestSet;
  [extra: string]: unknown;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const mk = (prefix: string, labels: string[]): ItemDef[] =>
  labels.map((label, i) => ({ id: `${prefix}_${i + 1}`, label }));

const GROUPS: GroupDef[] = [
  {
    id: 'textile', section: 'nonhaz', title: 'Textile Waste (kg)', totalLabel: 'Total Textile Waste (kg)',
    hasSub: true, addLabel: '+ Add Textile Item', includeLabel: 'Include Textile Section',
    allLabel: 'Show All Individual Items (Jhut, Thread, Cut Panel, Reject)', totalOnlyLabel: 'Show Total Textile Only',
    defaults: mk('textile', ['Jhut / Fabric Scrap', 'Thread / Yarn Waste', 'Cut Panel Waste', 'Reject Garments (kg)']),
  },
  {
    id: 'plastic', section: 'nonhaz', title: 'Plastic Waste (kg)', totalLabel: 'Total Plastic Waste (kg)',
    hasSub: true, addLabel: '+ Add Plastic Item', includeLabel: 'Include Plastic Section',
    allLabel: 'Show All Plastic Items', totalOnlyLabel: 'Show Total Plastic Only',
    defaults: mk('plastic', ['Polythene / PP Bag', 'Hard Plastic / Core', 'Shrink Wrap']),
  },
  {
    id: 'othernonhaz', section: 'nonhaz', title: 'Other Non-Hazardous Waste (kg)', totalLabel: 'Total Other Non-Haz (kg)',
    hasSub: true, addLabel: '+ Add Non-Haz Item', includeLabel: 'Include Other Non-Haz',
    allLabel: 'All Items', totalOnlyLabel: 'Total Only',
    defaults: [
      { id: 'othernonhaz_1', label: 'Paper & Carton (Legacy)' },
      { id: 'othernonhaz_carton', label: 'Carton' },
      { id: 'othernonhaz_paper', label: 'Paper' },
      { id: 'othernonhaz_2', label: 'Food / Organic Waste' },
      { id: 'othernonhaz_3', label: 'Metal Scrap' },
      { id: 'othernonhaz_4', label: 'Wood / Pallet' },
    ],
  },
  {
    id: 'electronics', section: 'haz', title: 'Electronics Waste (kg)', totalLabel: 'Total Electronics Waste (kg)',
    hasSub: true, addLabel: '+ Add Electronics Item', includeLabel: 'Include Electronics',
    allLabel: 'All Individual Items', totalOnlyLabel: 'Total Electronics Only',
    defaults: mk('electronics', ['Computer / Monitor / PCB', 'UPS / Electronic Battery', 'IT Cables & Accessories']),
  },
  {
    id: 'electrical', section: 'haz', title: 'Electrical Waste (kg)', totalLabel: 'Total Electrical Waste (kg)',
    hasSub: true, addLabel: '+ Add Electrical Item', includeLabel: 'Include Electrical',
    allLabel: 'All Individual Items', totalOnlyLabel: 'Total Electrical Only',
    defaults: mk('electrical', ['Tube Light / CFL / LED Bulb', 'Electric Motor / Switchgear', 'Power Cable / Ballast']),
  },
  {
    id: 'chemdrum', section: 'haz', title: 'Chemical Drum & Can (kg)', totalLabel: 'Total Chemical Drum & Can (kg)',
    hasSub: true, addable: false, addLabel: '', includeLabel: 'Include Chemical Drum & Can',
    allLabel: 'All Chemical Drum & Can Items', totalOnlyLabel: 'Total Chemical Drum & Can Only',
    defaults: mk('chemdrum', [
      'Empty Chemical Drum (Plastic)',
      'Empty Chemical Drum (Metal)',
      'Chemical Can (Spot Lifter / Aerosol)',
    ]),
  },
  {
    id: 'hazother', section: 'haz', title: 'Contaminated / Burn Oil / Medical Waste (kg)', totalLabel: '',
    hasSub: false, standalone: true, addLabel: '+ Add Hazardous Item',
    includeLabel: 'Include Contaminated / Burn Oil / Medical Waste',
    allLabel: 'All Individual Items', totalOnlyLabel: '',
    defaults: mk('hazother', [
      'Contaminated Rags / Jhut (kg)',
      'Burn Oil / Waste Lubricant (kg)',
      'Medical / First-Aid Waste (kg)',
    ]),
  },
  {
    id: 'recycle', section: 'recycle', title: 'Recycle / Reuse Waste (kg)', totalLabel: 'Total Recycle / Reuse (kg)',
    hasSub: false, addLabel: '+ Add Recycle / Reuse Item', includeLabel: 'Include Recycle / Reuse',
    allLabel: 'All Individual Items', totalOnlyLabel: 'Total Recycle / Reuse Only',
    defaults: mk('rr', [
      'Recycled Jhut / Fabric (kg)',
      'Reused Jhut / Fabric (kg)',
      'Reused Carton (kg)',
      'Optimized Paper Use (kg)',
      'Recycled Plastic (kg)',
      'Reused Chemical Drum (kg)',
    ]),
  },
];

const GROUP_MAP: Record<string, GroupDef> = GROUPS.reduce((acc, g) => {
  acc[g.id] = g;
  return acc;
}, {} as Record<string, GroupDef>);

const REJECT_ITEMS: ItemDef[] = [
  { id: 'rej_a', label: 'Grade A (pcs)' },
  { id: 'rej_b', label: 'Grade B (pcs)' },
  { id: 'rej_c', label: 'Grade C / Cut-Piece (pcs)' },
];

const SECTION_LABELS: Record<SectionId, string> = {
  nonhaz: 'NON-HAZARDOUS WASTE (kg)',
  haz: 'HAZARDOUS WASTE (kg)',
  recycle: 'RECYCLE / REUSE WASTE (kg)',
  summary: 'TOTAL WASTE SUMMARY (kg)',
  reject: 'REJECT GARMENTS (GRADE-WISE)',
  remarks: 'REMARKS',
};

interface Theme {
  head: string;
  sub: string;
  colHead: string;
  tint: string;
  locked: string;
  ring: string;
  hex: { head: string; sub: string; colHead: string; tint: string; locked: string; text: string };
}

const THEMES: Record<SectionId, Theme> = {
  nonhaz: {
    head: 'bg-emerald-200 text-emerald-900', sub: 'bg-emerald-100 text-emerald-900', colHead: 'bg-emerald-50 text-emerald-800',
    tint: 'bg-emerald-50/50', locked: 'bg-emerald-100 text-emerald-900', ring: 'focus:border-emerald-400 focus:ring-emerald-300',
    hex: { head: '#a7f3d0', sub: '#d1fae5', colHead: '#ecfdf5', tint: '#f3fcf8', locked: '#d1fae5', text: '#064e3b' },
  },
  haz: {
    head: 'bg-amber-200 text-amber-900', sub: 'bg-amber-100 text-amber-900', colHead: 'bg-amber-50 text-amber-800',
    tint: 'bg-amber-50/50', locked: 'bg-amber-100 text-amber-900', ring: 'focus:border-amber-400 focus:ring-amber-300',
    hex: { head: '#fde68a', sub: '#fef3c7', colHead: '#fffbeb', tint: '#fffdf5', locked: '#fef3c7', text: '#78350f' },
  },
  recycle: {
    head: 'bg-teal-300 text-teal-900', sub: 'bg-teal-200 text-teal-900', colHead: 'bg-teal-100 text-teal-900',
    tint: 'bg-teal-50/60', locked: 'bg-teal-100 text-teal-900', ring: 'focus:border-teal-500 focus:ring-teal-300',
    hex: { head: '#5eead4', sub: '#99f6e4', colHead: '#ccfbf1', tint: '#f0fdfa', locked: '#ccfbf1', text: '#134e4a' },
  },
  summary: {
    head: 'bg-green-200 text-green-900', sub: 'bg-green-100 text-green-900', colHead: 'bg-green-50 text-green-800',
    tint: 'bg-green-50/50', locked: 'bg-green-100 text-green-900', ring: 'focus:border-green-400 focus:ring-green-300',
    hex: { head: '#bbf7d0', sub: '#dcfce7', colHead: '#f0fdf4', tint: '#f7fef9', locked: '#dcfce7', text: '#14532d' },
  },
  reject: {
    head: 'bg-sky-200 text-sky-900', sub: 'bg-sky-100 text-sky-900', colHead: 'bg-sky-50 text-sky-800',
    tint: 'bg-sky-50/50', locked: 'bg-sky-100 text-sky-900', ring: 'focus:border-sky-400 focus:ring-sky-300',
    hex: { head: '#bae6fd', sub: '#e0f2fe', colHead: '#f0f9ff', tint: '#f7fcff', locked: '#e0f2fe', text: '#0c4a6e' },
  },
  remarks: {
    head: 'bg-slate-200 text-slate-800', sub: 'bg-slate-200 text-slate-800', colHead: 'bg-slate-100 text-slate-800',
    tint: 'bg-slate-50', locked: 'bg-slate-100 text-slate-800', ring: 'focus:border-slate-400 focus:ring-slate-300',
    hex: { head: '#e2e8f0', sub: '#e2e8f0', colHead: '#f1f5f9', tint: '#f8fafc', locked: '#f1f5f9', text: '#1e293b' },
  },
};

const CALC_KEYS = [
  ...GROUPS.map((g) => g.id),
  'totalNonHaz', 'totalHaz', 'totalGenerated', 'totalRecycled', 'net', 'totalReject',
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const num = (v: string | undefined): number => {
  const n = parseFloat(v || '');
  return Number.isFinite(n) ? n : 0;
};

const fmt = (n: number): string => (Number.isFinite(n) ? n : 0).toFixed(2);

const esc = (s: string): string =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const rateOf = (generated: number, recycled: number): number =>
  generated > 0 ? parseFloat(((recycled / generated) * 100).toFixed(2)) : 0;

const makeDefaultFilters = (): Filters => {
  const include: Record<string, boolean> = {};
  const mode: Record<string, Mode> = {};
  GROUPS.forEach((g) => {
    include[g.id] = true;
    mode[g.id] = 'all';
  });
  return { include, mode, hiddenItems: {}, summary: true, reject: true, remarks: true };
};

const computeCalc = (
  row: MonthData,
  getItems: (gid: string) => ItemDef[],
): Record<string, number> => {
  const t: Record<string, number> = {};
  GROUPS.forEach((g) => {
    t[g.id] = getItems(g.id).reduce((s, it) => s + num(row[it.id]), 0);
  });
  t.totalNonHaz = t.textile + t.plastic + t.othernonhaz;
  // Hazardous = Electronics + Electrical + Chemical Drum & Can total + standalone
  // (Contaminated Rags + Burn Oil + Medical + custom hazardous items)
  t.totalHaz = t.electronics + t.electrical + t.chemdrum + t.hazother;
  t.totalGenerated = t.totalNonHaz + t.totalHaz;
  t.totalRecycled = t.recycle;
  t.net = Math.max(0, t.totalGenerated - t.totalRecycled);
  t.rate = rateOf(t.totalGenerated, t.totalRecycled);
  t.totalReject = REJECT_ITEMS.reduce((s, it) => s + num(row[it.id]), 0);
  return t;
};

const buildColumns = (getItems: (gid: string) => ItemDef[], f: Filters | null): Col[] => {
  const cols: Col[] = [];

  const pushGroup = (g: GroupDef): boolean => {
    const inc = f ? f.include[g.id] !== false : true;
    if (!inc) return false;

    // Standalone group: individual columns only, no sub-header and no sub-total column.
    if (g.standalone) {
      getItems(g.id)
        .filter((it) => !f || !f.hiddenItems[it.id])
        .forEach((it) =>
          cols.push({
            id: it.id, label: it.label, section: g.section, sub: null, kind: 'input',
            groupId: g.id, removeId: it.custom ? it.id : undefined,
          }),
        );
      return true;
    }

    const mode: Mode = f ? f.mode[g.id] || 'all' : 'all';
    const items =
      mode === 'all' ? getItems(g.id).filter((it) => !f || !f.hiddenItems[it.id]) : [];
    const sub = g.hasSub && items.length > 0 ? g.title : null;
    items.forEach((it) =>
      cols.push({
        id: it.id, label: it.label, section: g.section, sub, kind: 'input',
        groupId: g.id, removeId: it.custom ? it.id : undefined,
      }),
    );
    cols.push({
      id: `tot_${g.id}`, label: g.totalLabel, section: g.section, sub,
      kind: 'calc', calcKey: g.id, groupId: g.id,
    });
    return true;
  };

  let anyNonHaz = false;
  GROUPS.filter((g) => g.section === 'nonhaz').forEach((g) => {
    anyNonHaz = pushGroup(g) || anyNonHaz;
  });
  if (anyNonHaz) {
    cols.push({
      id: 'tot_nonhaz', label: 'Total Non-Hazardous Waste (kg)', section: 'nonhaz',
      sub: null, kind: 'calc', calcKey: 'totalNonHaz',
    });
  }

  let anyHaz = false;
  GROUPS.filter((g) => g.section === 'haz').forEach((g) => {
    anyHaz = pushGroup(g) || anyHaz;
  });
  if (anyHaz) {
    cols.push({
      id: 'tot_haz', label: 'Total Hazardous Waste (kg)', section: 'haz',
      sub: null, kind: 'calc', calcKey: 'totalHaz',
    });
  }

  GROUPS.filter((g) => g.section === 'recycle').forEach((g) => {
    pushGroup(g);
  });

  if (!f || f.summary) {
    cols.push(
      { id: 'sum_gen', label: 'Total Generated Waste (kg)', section: 'summary', sub: null, kind: 'calc', calcKey: 'totalGenerated' },
      { id: 'sum_rec', label: 'Total Recycled / Reused (kg)', section: 'summary', sub: null, kind: 'calc', calcKey: 'totalRecycled' },
      { id: 'sum_net', label: 'Net Landfilled / Disposed (kg)', section: 'summary', sub: null, kind: 'calc', calcKey: 'net' },
      { id: 'sum_rate', label: 'Recycling Rate (%)', section: 'summary', sub: null, kind: 'calc', calcKey: 'rate' },
    );
  }

  if (!f || f.reject) {
    REJECT_ITEMS.forEach((it) =>
      cols.push({ id: it.id, label: it.label, section: 'reject', sub: null, kind: 'input' }),
    );
    cols.push({
      id: 'rej_total', label: 'Total Reject Garments (pcs)', section: 'reject',
      sub: null, kind: 'calc', calcKey: 'totalReject',
    });
  }

  if (!f || f.remarks) {
    cols.push({ id: 'remarks', label: 'REMARKS', section: 'remarks', sub: null, kind: 'text' });
  }

  return cols;
};

const buildHeader = (cols: Col[]): { r1: HCell[]; r2: HCell[]; r3: HCell[] } => {
  const r1: HCell[] = [];
  const r2: HCell[] = [];
  const r3: HCell[] = [];

  // Row 1: sections
  let i = 0;
  while (i < cols.length) {
    const sec = cols[i].section;
    let j = i;
    while (j < cols.length && cols[j].section === sec) j++;
    r1.push({
      key: `s_${sec}_${i}`,
      label: SECTION_LABELS[sec],
      colSpan: j - i,
      rowSpan: sec === 'remarks' ? 3 : 1,
      section: sec,
      tone: 'section',
      addGroupId: sec === 'recycle' ? 'recycle' : sec === 'haz' ? 'hazother' : undefined,
    });
    i = j;
  }

  // Row 2 and Row 3
  let k = 0;
  while (k < cols.length) {
    const c = cols[k];
    if (c.section === 'remarks') {
      k++;
      continue;
    }
    if (c.sub) {
      let m = k;
      while (m < cols.length && cols[m].sub && cols[m].groupId === c.groupId) m++;
      r2.push({
        key: `g_${c.groupId}_${k}`, label: c.sub, colSpan: m - k, rowSpan: 1,
        section: c.section, tone: 'sub', groupId: c.groupId,
      });
      for (let x = k; x < m; x++) {
        r3.push({
          key: `c_${cols[x].id}`, label: cols[x].label, colSpan: 1, rowSpan: 1,
          section: cols[x].section, tone: 'col', groupId: cols[x].groupId, removeId: cols[x].removeId,
        });
      }
      k = m;
    } else {
      r2.push({
        key: `c_${c.id}`, label: c.label, colSpan: 1, rowSpan: 2,
        section: c.section, tone: 'col', groupId: c.groupId, removeId: c.removeId,
      });
      k++;
    }
  }
  return { r1, r2, r3 };
};

const resolveUnit = (selectedUnit: string): { fullName: string; address: string } => {
  const fallback = { fullName: selectedUnit, address: 'Epyllion Group, Dhaka, Bangladesh' };
  try {
    const dir = UNIT_DIRECTORY as unknown;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matches = (u: any): boolean =>
      !!u &&
      typeof u === 'object' &&
      [u.id, u.code, u.key, u.name, u.shortName, u.unit, u.unitName, u.fullName, u.label, u.value].some(
        (v) => v === selectedUnit,
      );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let found: any;
    if (Array.isArray(dir)) {
      found = dir.find(matches);
    } else if (dir && typeof dir === 'object') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = dir as Record<string, any>;
      found = map[selectedUnit] !== undefined ? map[selectedUnit] : Object.values(map).find(matches);
    }
    if (!found || typeof found !== 'object') return fallback;
    return {
      fullName: found.fullName || found.name || found.unitName || found.label || selectedUnit,
      address: found.address || found.fullAddress || found.location || fallback.address,
    };
  } catch {
    return fallback;
  }
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
const WasteManagementForm: React.FC<WasteManagementFormProps> = ({ selectedUnit, selectedYear, userRole, restGet, restSet }) => {
  const isViewer = userRole === 'viewer';
  const unit = String(selectedUnit ?? '');
  const year = String(selectedYear ?? '');
  const storageKey = `waste_mgmt_${unit}_${year}`;

  const [data, setData] = useState<DataMap>({});
  const [custom, setCustom] = useState<CustomMap>({});
  const [filters, setFilters] = useState<Filters>(makeDefaultFilters());
  const [loadedKey, setLoadedKey] = useState<string>('');
  const { gridHandlers, gridError, reportGridError } = useInventoryGrid();
  const { status, error, saveNow } = useHybridAutoSave({
    unit,
    year,
    moduleId: 'waste_mgmt',
    storageKey,
    payload: { data, custom, filters },
    restGet,
    restSet,
    enabled: !isViewer,
    ready: loadedKey === storageKey,
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const [dialog, setDialog] = useState<AddDialog | null>(null);
  const filterRef = useRef<HTMLDivElement | null>(null);

  const unitInfo = useMemo(() => resolveUnit(unit), [unit]);
  const logoUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/epyllion-logo.png` : '/epyllion-logo.png';

  /* ---------- Load / save (synced with selectedUnit + selectedYear) ---------- */
  useEffect(() => {
    let d: DataMap = {};
    let c: CustomMap = {};
    const f = makeDefaultFilters();
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
      if (raw) {
        const p = JSON.parse(raw);
        if (p && typeof p === 'object') {
          if (p.data && typeof p.data === 'object') d = p.data;
          if (p.custom && typeof p.custom === 'object') c = p.custom;
          if (p.filters && typeof p.filters === 'object') {
            f.include = { ...f.include, ...(p.filters.include || {}) };
            f.mode = { ...f.mode, ...(p.filters.mode || {}) };
            f.hiddenItems = { ...(p.filters.hiddenItems || {}) };
            if (typeof p.filters.summary === 'boolean') f.summary = p.filters.summary;
            if (typeof p.filters.reject === 'boolean') f.reject = p.filters.reject;
            if (typeof p.filters.remarks === 'boolean') f.remarks = p.filters.remarks;
          }
        }
      }
    } catch {
      /* ignore corrupted storage */
    }
    setData(d);
    setCustom(c);
    setFilters(f);
    setLoadedKey(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (loadedKey !== storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ data, custom, filters }));
    } catch {
      /* storage may be full / unavailable */
    }
  }, [data, custom, filters, loadedKey, storageKey]);

  /* ---------- Close dropdown on outside click ---------- */
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  /* ---------- Items & calculations ---------- */
  const getItems = useCallback(
    (gid: string): ItemDef[] => {
      const g = GROUP_MAP[gid];
      return g ? [...g.defaults, ...(custom[gid] || [])] : [];
    },
    [custom],
  );

  const monthCalcs = useMemo(
    () => MONTHS.map((_, i) => computeCalc(data[String(i)] || {}, getItems)),
    [data, getItems],
  );

  const totalCalc = useMemo(() => {
    const t: Record<string, number> = {};
    CALC_KEYS.forEach((k) => {
      t[k] = monthCalcs.reduce((s, m) => s + (m[k] || 0), 0);
    });
    t.rate = rateOf(t.totalGenerated, t.totalRecycled);
    return t;
  }, [monthCalcs]);

  const screenCols = useMemo(() => buildColumns(getItems, null), [getItems]);
  const screenHeader = useMemo(() => buildHeader(screenCols), [screenCols]);

  /* ---------- Cell text helpers ---------- */
  const cellText = (col: Col, mi: number): string => {
    const row = data[String(mi)] || {};
    if (col.kind === 'calc') return fmt(monthCalcs[mi][col.calcKey as string]);
    if (col.kind === 'text') return row[col.id] || '';
    const v = row[col.id];
    return v === undefined || v === '' ? '' : fmt(num(v));
  };

  const totalText = (col: Col): string => {
    if (col.kind === 'calc') return fmt(totalCalc[col.calcKey as string]);
    if (col.kind === 'text') return '';
    return fmt(MONTHS.reduce((s, _, i) => s + num((data[String(i)] || {})[col.id]), 0));
  };

  /* ---------- Handlers ---------- */
  const handleNumChange = (mi: number, id: string, value: string) => {
    if (isViewer) return;
    const normalized = normalizeNumericInput(value);
    if (normalized === null) {
      reportGridError(value.trim().startsWith('-') ? 'Negative value not allowed' : 'Invalid text pasted in numeric cell');
      return;
    }
    setData((prev) => ({ ...prev, [String(mi)]: { ...(prev[String(mi)] || {}), [id]: normalized } }));
  };

  const handleTextChange = (mi: number, id: string, value: string) => {
    if (isViewer) return;
    setData((prev) => ({ ...prev, [String(mi)]: { ...(prev[String(mi)] || {}), [id]: value } }));
  };

  const pushCustomItem = (gid: string, label: string) => {
    if (isViewer) return;
    const id = `${gid}_c_${Date.now()}`;
    setCustom((prev) => ({ ...prev, [gid]: [...(prev[gid] || []), { id, label, custom: true }] }));
  };

  const addItem = (gid: string) => {
    if (isViewer) return;
    const g = GROUP_MAP[gid];
    if (!g) return;
    // Recycle / Reuse uses a dialog with a Recycle | Reuse dropdown selector.
    if (gid === 'recycle') {
      setDialog({ gid, name: '', type: 'Recycle' });
      return;
    }
    const name = window.prompt(`Enter new item name for "${g.title}"`);
    const label = (name || '').trim();
    if (!label) return;
    pushCustomItem(gid, label);
  };

  const confirmDialog = () => {
    if (isViewer) return;
    if (!dialog) return;
    const name = dialog.name.trim();
    if (!name) return;
    pushCustomItem(dialog.gid, `${name} (${dialog.type})`);
    setDialog(null);
  };

  const removeItem = (gid: string, id: string) => {
    if (isViewer) return;
    if (!window.confirm('Remove this item and its entered values?')) return;
    setCustom((prev) => ({ ...prev, [gid]: (prev[gid] || []).filter((it) => it.id !== id) }));
    setData((prev) => {
      const next: DataMap = {};
      Object.keys(prev).forEach((m) => {
        const copy = { ...prev[m] };
        delete copy[id];
        next[m] = copy;
      });
      return next;
    });
  };

  /* ---------- Filter helpers ---------- */
  const setInclude = (gid: string, v: boolean) =>
    setFilters((f) => ({ ...f, include: { ...f.include, [gid]: v } }));
  const setMode = (gid: string, m: Mode) =>
    setFilters((f) => ({ ...f, mode: { ...f.mode, [gid]: m } }));
  const toggleItem = (id: string) =>
    setFilters((f) => ({ ...f, hiddenItems: { ...f.hiddenItems, [id]: !f.hiddenItems[id] } }));
  const selectAllFilters = () => setFilters(makeDefaultFilters());

  /* ---------- Export HTML builders ---------- */
  const buildTableHtml = (cols: Col[], letterheadRows: string): string => {
    const h = buildHeader(cols);
    const bd = 'border:1px solid #6b7280;';
    const hs = (c: HCell): string => {
      const t = THEMES[c.section].hex;
      const bg = c.tone === 'section' ? t.head : c.tone === 'sub' ? t.sub : t.colHead;
      return `${bd}background:${bg};color:${t.text};font-weight:bold;text-align:center;vertical-align:middle;padding:3px;`;
    };
    const th = (c: HCell): string =>
      `<th colspan="${c.colSpan}" rowspan="${c.rowSpan}" style="${hs(c)}">${esc(c.label)}</th>`;
    const monthTh = `<th rowspan="3" style="${bd}background:#e2e8f0;color:#1e293b;font-weight:bold;text-align:center;vertical-align:middle;padding:3px;">Month</th>`;

    let html = `<table border="1" cellspacing="0" cellpadding="2" style="border-collapse:collapse;">`;
    html += `<thead>${letterheadRows}`;
    html += `<tr>${monthTh}${h.r1.map(th).join('')}</tr>`;
    html += `<tr>${h.r2.map(th).join('')}</tr>`;
    html += `<tr>${h.r3.map(th).join('')}</tr></thead><tbody>`;

    MONTHS.forEach((m, mi) => {
      html += `<tr><td style="${bd}background:#f8fafc;font-weight:bold;text-align:left;padding:2px 4px;">${m}</td>`;
      cols.forEach((c) => {
        const t = THEMES[c.section].hex;
        const val = cellText(c, mi);
        const bg = c.kind === 'calc' ? t.locked : t.tint;
        const isNum = c.kind !== 'text';
        const style = `${bd}background:${bg};color:${t.text};text-align:${isNum ? 'right' : 'left'};padding:2px 4px;${
          c.kind === 'calc' ? 'font-weight:bold;' : ''
        }${isNum && val !== '' ? "mso-number-format:'0\\.00';" : ''}`;
        html += `<td style="${style}">${esc(val)}</td>`;
      });
      html += `</tr>`;
    });

    html += `<tr><td style="${bd}background:#cbd5e1;color:#0f172a;font-weight:bold;text-align:left;padding:3px 4px;">Total</td>`;
    cols.forEach((c) => {
      const t = THEMES[c.section].hex;
      const val = totalText(c);
      const style = `${bd}background:${t.head};color:${t.text};font-weight:bold;text-align:${
        c.kind === 'text' ? 'left' : 'right'
      };padding:3px 4px;${val !== '' ? "mso-number-format:'0\\.00';" : ''}`;
      html += `<td style="${style}">${esc(val)}</td>`;
    });
    html += `</tr></tbody></table>`;
    return html;
  };

  const getExportCols = (): Col[] => buildColumns(getItems, filters);

  const handleDownloadExcel = () => {
    const cols = getExportCols();
    const span = cols.length + 1;
    const center = 'text-align:center;border:none;';
    const letterheadRows =
      `<tr><td colspan="${span}" style="${center}height:70px;"><img src="${esc(logoUrl)}" alt="Epyllion Group" width="150" height="60" /></td></tr>` +
      `<tr><td colspan="${span}" style="${center}font-size:20px;font-weight:bold;color:#065f46;">EPYLLION GROUP</td></tr>` +
      `<tr><td colspan="${span}" style="${center}font-size:15px;font-weight:bold;">${esc(unitInfo.fullName)}</td></tr>` +
      `<tr><td colspan="${span}" style="${center}font-size:12px;">${esc(unitInfo.address)}</td></tr>` +
      `<tr><td colspan="${span}" style="${center}font-size:16px;font-weight:bold;">Waste Management Inventory Report</td></tr>` +
      `<tr><td colspan="${span}" style="${center}font-size:13px;font-weight:bold;">Reporting Year: ${esc(year)}</td></tr>` +
      `<tr><td colspan="${span}" style="${center}">&nbsp;</td></tr>`;

    const table = buildTableHtml(cols, letterheadRows);
    const doc =
      `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">` +
      `<head><meta charset="utf-8" />` +
      `<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Waste Management</x:Name>` +
      `<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->` +
      `</head><body>${table}</body></html>`;

    const blob = new Blob(['\ufeff' + doc], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safe = `${unit}_${year}`.replace(/[^a-zA-Z0-9_-]+/g, '_');
    a.href = url;
    a.download = `Waste_Management_${safe}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handlePrint = () => {
    const cols = getExportCols();
    const table = buildTableHtml(cols, '');
    const w = window.open('', '_blank');
    if (!w) {
      window.alert('Popup blocked. Please allow popups for this site to print / save PDF.');
      return;
    }
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Waste Management Inventory Report - ${esc(unitInfo.fullName)} - ${esc(year)}</title>
<style>
  @page { size: A4 landscape; margin: 8mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; color: #111827; }
  .lh { text-align: center; margin-bottom: 6px; }
  .lh img { height: 54px; max-width: 220px; object-fit: contain; display: inline-block; }
  .grp { font-size: 17px; font-weight: bold; color: #065f46; letter-spacing: 1px; margin-top: 2px; }
  .unit { font-size: 13px; font-weight: bold; margin-top: 2px; }
  .addr { font-size: 10px; color: #374151; margin-top: 2px; }
  .title { font-size: 14px; font-weight: bold; margin-top: 6px; text-decoration: underline; }
  .year { font-size: 11px; font-weight: bold; margin: 3px 0 8px; }
  table { width: 100%; table-layout: auto; border-collapse: collapse; font-size: 8.5px; word-break: break-word; }
  th, td { padding: 2px 3px; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  .sign { display: flex; justify-content: space-between; margin-top: 70px; padding: 0 20px; }
  .sign div { width: 22%; border-top: 1px solid #111827; text-align: center; padding-top: 4px; font-size: 10px; font-weight: bold; }
</style>
</head>
<body>
  <div class="lh">
    <img src="${esc(logoUrl)}" alt="Epyllion Group" onerror="this.style.display='none'" />
    <div class="grp">EPYLLION GROUP</div>
    <div class="unit">${esc(unitInfo.fullName)}</div>
    <div class="addr">${esc(unitInfo.address)}</div>
    <div class="title">Waste Management Inventory Report</div>
    <div class="year">Reporting Year: ${esc(year)}</div>
  </div>
  ${table}
  <div class="sign"><div>Prepared By</div><div>Checked By</div><div>Approved By</div></div>
  <script>
    window.onload = function () { setTimeout(function () { window.focus(); window.print(); }, 500); };
  </script>
</body>
</html>`;
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  /* ---------- Screen rendering helpers ---------- */
  const renderHeadCell = (c: HCell) => {
    const t = THEMES[c.section];
    const toneCls = c.tone === 'section' ? t.head : c.tone === 'sub' ? t.sub : t.colHead;
    const subAddable =
      c.tone === 'sub' && !!c.groupId && GROUP_MAP[c.groupId] && GROUP_MAP[c.groupId].addable !== false;
    const showAdd = subAddable || !!c.addGroupId;
    const addGid = (c.tone === 'sub' ? c.groupId : c.addGroupId) as string | undefined;
    return (
      <th
        key={c.key}
        colSpan={c.colSpan}
        rowSpan={c.rowSpan}
        className={`border border-white/70 px-2 py-1.5 text-center align-middle text-[11px] font-bold tracking-wide ${toneCls}`}
      >
        <div className="flex items-center justify-center gap-2">
          <span className="whitespace-normal leading-tight">{c.label}</span>
          {showAdd && addGid && GROUP_MAP[addGid] ? (
            <button
              type="button"
              hidden={isViewer}
              onClick={() => addItem(addGid)}
              className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              {GROUP_MAP[addGid].addLabel}
            </button>
          ) : null}
          {c.removeId && c.groupId && !isViewer ? (
            <button
              type="button"
              title="Remove item"
              onClick={() => removeItem(c.groupId as string, c.removeId as string)}
              className="rounded-full bg-white px-1.5 text-[12px] font-bold leading-4 text-rose-600 shadow-sm hover:bg-rose-50"
            >
              ×
            </button>
          ) : null}
        </div>
      </th>
    );
  };

  const renderBodyCell = (col: Col, mi: number) => {
    const t = THEMES[col.section];
    if (col.kind === 'calc') {
      return (
        <td key={col.id} className={`border border-slate-200 px-1.5 py-1 ${t.tint}`}>
          <div
            aria-readonly="true"
            title="Auto-calculated (locked)"
            className={`min-w-[84px] cursor-not-allowed rounded-md border border-slate-200 px-2 py-1 text-right text-xs font-semibold ${t.locked}`}
          >
            {fmt(monthCalcs[mi][col.calcKey as string])}
          </div>
        </td>
      );
    }
    if (col.kind === 'text') {
      return (
        <td key={col.id} className={`border border-slate-200 px-1.5 py-1 ${t.tint}`}>
          <input
            type="text"
            value={(data[String(mi)] || {})[col.id] || ''}
            disabled={isViewer}
            onChange={(e) => handleTextChange(mi, col.id, e.target.value)}
            placeholder="Remarks"
            className={`w-48 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs shadow-sm outline-none focus:ring-2 ${t.ring}`}
          />
        </td>
      );
    }
    return (
      <td key={col.id} className={`border border-slate-200 px-1.5 py-1 ${t.tint}`}>
        <input
          type="text"
          inputMode="decimal"
          value={(data[String(mi)] || {})[col.id] || ''}
          disabled={isViewer}
          onChange={(e) => handleNumChange(mi, col.id, e.target.value)}
          placeholder="0.00"
          className={`w-[84px] rounded-md border border-slate-300 bg-white px-2 py-1 text-right text-xs shadow-sm outline-none focus:ring-2 ${t.ring}`}
        />
      </td>
    );
  };

  /* ---------- Render ---------- */
  return (
    <div {...gridHandlers} className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* Title + actions */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Waste Management</h2>
          <p className="text-xs text-slate-500">
            {unitInfo.fullName} &middot; Reporting Year {year}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isViewer && (
            <button
              type="button"
              onClick={() => { void saveNow(); }}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              Save Data
            </button>
          )}
          <InventorySaveStatus status={status} error={error} gridError={gridError} />
          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setFilterOpen((o) => !o)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Export &amp; Print Column Filter {filterOpen ? '▲' : '▼'}
            </button>

            {filterOpen && (
              <div className="absolute right-0 z-50 mt-2 max-h-[70vh] w-[min(94vw,980px)] overflow-auto rounded-xl border border-slate-200 bg-white p-4 shadow-2xl">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-bold text-slate-800">Choose what to include in Excel &amp; Print / PDF</div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllFilters}
                      className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Select All / Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterOpen(false)}
                      className="rounded-md bg-slate-800 px-2 py-1 text-[11px] font-semibold text-white hover:bg-slate-700"
                    >
                      Done
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {GROUPS.map((g) => {
                    const t = THEMES[g.section];
                    const inc = filters.include[g.id] !== false;
                    const mode = filters.mode[g.id] || 'all';
                    return (
                      <div key={g.id} className={`rounded-lg border border-slate-200 p-3 ${t.tint}`}>
                        <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-800">
                          <input type="checkbox" checked={inc} onChange={(e) => setInclude(g.id, e.target.checked)} />
                          {g.includeLabel}
                        </label>
                        <div className={`mt-2 space-y-1 pl-5 text-[11px] ${inc ? 'text-slate-700' : 'text-slate-400'}`}>
                          {!g.standalone && (
                            <>
                              <label className="flex cursor-pointer items-start gap-2">
                                <input
                                  type="radio"
                                  name={`mode_${g.id}`}
                                  disabled={!inc}
                                  checked={mode === 'all'}
                                  onChange={() => setMode(g.id, 'all')}
                                />
                                <span>{g.allLabel}</span>
                              </label>
                              <label className="flex cursor-pointer items-start gap-2">
                                <input
                                  type="radio"
                                  name={`mode_${g.id}`}
                                  disabled={!inc}
                                  checked={mode === 'total'}
                                  onChange={() => setMode(g.id, 'total')}
                                />
                                <span>{g.totalOnlyLabel}</span>
                              </label>
                            </>
                          )}
                          {inc && (g.standalone || mode === 'all') && (
                            <div className="mt-1 space-y-0.5 rounded-md border border-slate-200 bg-white p-2">
                              {getItems(g.id).map((it) => (
                                <label key={it.id} className="flex cursor-pointer items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={!filters.hiddenItems[it.id]}
                                    onChange={() => toggleItem(it.id)}
                                  />
                                  <span>{it.label}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <div className={`rounded-lg border border-slate-200 p-3 ${THEMES.summary.tint}`}>
                    <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-800">
                      <input
                        type="checkbox"
                        checked={filters.summary}
                        onChange={(e) => setFilters((f) => ({ ...f, summary: e.target.checked }))}
                      />
                      Include Total Waste Summary
                    </label>
                  </div>

                  <div className={`rounded-lg border border-slate-200 p-3 ${THEMES.reject.tint}`}>
                    <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-800">
                      <input
                        type="checkbox"
                        checked={filters.reject}
                        onChange={(e) => setFilters((f) => ({ ...f, reject: e.target.checked }))}
                      />
                      Include Reject Garments (Grade-Wise)
                    </label>
                  </div>

                  <div className={`rounded-lg border border-slate-200 p-3 ${THEMES.remarks.tint}`}>
                    <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-800">
                      <input
                        type="checkbox"
                        checked={filters.remarks}
                        onChange={(e) => setFilters((f) => ({ ...f, remarks: e.target.checked }))}
                      />
                      Include Remarks
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

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
            className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-700"
          >
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="max-h-[70vh] overflow-auto rounded-xl border border-slate-200">
        <table className="min-w-max border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th
                rowSpan={3}
                className="sticky left-0 top-0 z-30 min-w-[110px] border border-white/70 bg-slate-200 px-3 py-2 text-left text-[11px] font-bold text-slate-800"
              >
                Month
              </th>
              {screenHeader.r1.map(renderHeadCell)}
            </tr>
            <tr>{screenHeader.r2.map(renderHeadCell)}</tr>
            <tr>{screenHeader.r3.map(renderHeadCell)}</tr>
          </thead>

          <tbody>
            {MONTHS.map((m, mi) => (
              <tr key={m} className="hover:bg-slate-50/60">
                <td className="sticky left-0 z-10 border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700">
                  {m}
                </td>
                {screenCols.map((c) => renderBodyCell(c, mi))}
              </tr>
            ))}

            <tr>
              <td className="sticky bottom-0 left-0 z-30 border border-slate-300 bg-slate-300 px-3 py-2 font-bold text-slate-900">
                Total
              </td>
              {screenCols.map((c) => {
                const t = THEMES[c.section];
                return (
                  <td
                    key={`tot_${c.id}`}
                    className={`sticky bottom-0 z-20 border border-slate-300 px-2 py-2 text-right font-bold ${t.head}`}
                  >
                    {totalText(c)}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-[11px] text-slate-500">
        Tinted cells are auto-calculated and locked. Numeric entries accept up to 2 decimal places. Custom items can be
        removed with the × button in their column header.
      </p>

      {/* Add Recycle / Reuse item dialog */}
      {dialog && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDialog(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Add Recycle / Reuse Item"
            className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-4 shadow-2xl"
          >
            <h3 className="mb-3 text-sm font-bold text-slate-800">Add Recycle / Reuse Item</h3>

            <label className="mb-1 block text-[11px] font-semibold text-slate-600">Type</label>
            <select
              value={dialog.type}
              onChange={(e) => setDialog({ ...dialog, type: e.target.value as RecycleType })}
              className="mb-3 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs shadow-sm outline-none focus:ring-2 focus:border-teal-500 focus:ring-teal-300"
            >
              <option value="Recycle">Recycle</option>
              <option value="Reuse">Reuse</option>
            </select>

            <label className="mb-1 block text-[11px] font-semibold text-slate-600">Item name</label>
            <input
              type="text"
              autoFocus
              value={dialog.name}
              onChange={(e) => setDialog({ ...dialog, name: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmDialog();
                if (e.key === 'Escape') setDialog(null);
              }}
              placeholder="e.g. Cardboard Core"
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs shadow-sm outline-none focus:ring-2 focus:border-teal-500 focus:ring-teal-300"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Column will be named: {dialog.name.trim() ? `${dialog.name.trim()} (${dialog.type})` : `{Item Name} (${dialog.type})`}
            </p>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDialog(null)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              {!isViewer && <button
                type="button"
                onClick={confirmDialog}
                disabled={!dialog.name.trim()}
                className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add Item
              </button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { WasteManagementForm };
export default WasteManagementForm;
