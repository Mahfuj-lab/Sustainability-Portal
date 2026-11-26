import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Leaf, LogOut, Users, Settings, BarChart3, Zap, Flame, Factory,
  FileSpreadsheet, Save, X, Check, AlertCircle, Menu, Eye, EyeOff, Shield, Plus,
  ChevronDown, ChevronRight, Box, TrendingUp, Target, Globe, FileCheck, Scale, FolderOpen
} from 'lucide-react';
import InventoryManagement from './modules/InventoryManagement';
import SettingsPanel, { THEMES } from './modules/SettingsPanel';
type ThemeKey = string;

// ============================================================
// FIRESTORE REST API (no SDK, native fetch)
// ============================================================
const PROJECT_ID = "sustainability-portal-886cf";
const API_KEY = "AIzaSyB6JNUFMjSOjD4Xr3-hMQ90MNurDN8URu0";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const toFSValue = (v: any): any => {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFSValue) } };
  if (typeof v === 'object') {
    const fields: any = {};
    Object.keys(v).forEach(k => { fields[k] = toFSValue(v[k]); });
    return { mapValue: { fields } };
  }
  return { nullValue: null };
};

const fromFSValue = (fv: any): any => {
  if (!fv) return null;
  if ('stringValue' in fv) return fv.stringValue;
  if ('integerValue' in fv) return parseInt(fv.integerValue, 10);
  if ('doubleValue' in fv) return fv.doubleValue;
  if ('booleanValue' in fv) return fv.booleanValue;
  if ('nullValue' in fv) return null;
  if ('arrayValue' in fv) return (fv.arrayValue.values || []).map(fromFSValue);
  if ('mapValue' in fv) return fromFSFields(fv.mapValue.fields || {});
  return null;
};

const fromFSFields = (fields: any): any => {
  const o: any = {};
  Object.keys(fields || {}).forEach(k => { o[k] = fromFSValue(fields[k]); });
  return o;
};

const toFSFields = (obj: any): any => {
  const fields: any = {};
  Object.keys(obj || {}).forEach(k => { fields[k] = toFSValue(obj[k]); });
  return fields;
};

const restGet = async (path: string) => {
  const r = await fetch(`${BASE}/${path}?key=${API_KEY}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GET ${path} failed: ${r.status}`);
  const json = await r.json();
  return { id: json.name?.split('/').pop(), ...fromFSFields(json.fields || {}) };
};

const restList = async (collectionId: string) => {
  const r = await fetch(`${BASE}/${collectionId}?key=${API_KEY}`);
  if (!r.ok) {
    if (r.status === 404) return [];
    throw new Error(`LIST ${collectionId} failed: ${r.status}`);
  }
  const json = await r.json();
  const docs = json.documents || [];
  return docs.map((d: any) => ({ id: d.name?.split('/').pop(), ...fromFSFields(d.fields || {}) }));
};

const restSet = async (collectionId: string, docId: string, data: any) => {
  const r = await fetch(`${BASE}/${collectionId}/${docId}?key=${API_KEY}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFSFields(data) }),
  });
  if (!r.ok) throw new Error(`SET failed: ${r.status} ${await r.text()}`);
  return true;
};

const restCreate = async (collectionId: string, data: any) => {
  const r = await fetch(`${BASE}/${collectionId}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFSFields(data) }),
  });
  if (!r.ok) throw new Error(`CREATE failed: ${r.status} ${await r.text()}`);
  const json = await r.json();
  return json.name?.split('/').pop();
};

const restPatch = async (collectionId: string, docId: string, data: any) => {
  const mask = Object.keys(data).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const r = await fetch(`${BASE}/${collectionId}/${docId}?key=${API_KEY}&${mask}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFSFields(data) }),
  });
  if (!r.ok) throw new Error(`PATCH failed: ${r.status} ${await r.text()}`);
  return true;
};

const restQuery = async (collectionId: string, filters: { field: string; value: string }[]) => {
  const r = await fetch(`${BASE}:runQuery?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          compositeFilter: {
            op: 'AND',
            filters: filters.map(f => ({
              fieldFilter: {
                field: { fieldPath: f.field },
                op: 'EQUAL',
                value: { stringValue: f.value },
              },
            })),
          },
        },
      },
    }),
  });
  if (!r.ok) throw new Error(`QUERY failed: ${r.status} ${await r.text()}`);
  const json = await r.json();
  const results: any[] = [];
  (json || []).forEach((row: any) => {
    if (row.document) {
      results.push({ id: row.document.name?.split('/').pop(), ...fromFSFields(row.document.fields || {}) });
    }
  });
  return results;
};

// ============================================================
// TYPES & CONSTANTS
// ============================================================
type Role = 'super_admin' | 'entry_user' | 'viewer';
interface UserRecord { id?: string; email: string; password: string; full_name: string; role: Role; allowed_modules: string[]; allowed_factories: string[]; }

interface EmissionFactors { grid_electricity: number; natural_gas: number; diesel: number; petrol_octane: number; cng: number; }
interface EnergyRow {
  month: string; pe_meter1_offpeak: number; pe_meter1_peak: number; pe_meter1_flat: number;
  pe_meter2_offpeak: number; pe_meter2_peak: number; pe_meter2_flat: number;
  pe_total_bdt: number; pe_domestic_kwh: number; pe_production_kwh: number;
  solar_meter1_kwh: number; solar_meter2_kwh: number; gen1_kwh: number; gen2_kwh: number;
  ng_meter1_m3: number; ng_meter2_m3: number; ng_total_bdt: number;
  diesel_gen1_l: number; diesel_gen2_l: number; diesel_boiler_l: number; diesel_total_bdt: number;
  vehicle_diesel_l: number; vehicle_cng_m3: number; vehicle_octane_l: number;
}
interface ProductionRow {
  month: string; man_power: number; working_days: number; available_hour: number;
  produce_hour: number; total_npt_hour: number; average_smv: number;
  prod_pcs_stst: number; prod_pcs_ca: number; prod_pcs_ms: number; prod_pcs_varner: number;
  prod_pcs_next: number; prod_pcs_fenatech: number; prod_pcs_4f: number; total_production_kg: number;
}

const FACTORIES = ['EKWL', 'DKL', 'DDL', 'EKWL-HW', 'ESL', 'ESL-Extention', 'EFL', 'EKL', 'EPL', 'EWL'];

const UNIT_FULL_NAMES: Record<string, string> = {
  'EKWL': 'Epyllion Knitwears Ltd.',
  'DKL': 'Dekko Knitwears Ltd.',
  'DDL': 'Dazzling Dresses Ltd.',
  'EKWL-HW': 'Epyllion Knitwears Ltd. (HW)',
  'ESL': 'Epyllion Style Ltd.',
  'ESL-Extention': 'Epyllion Style Ltd.(Extention)',
  'EFL': 'Epyllion Fabrics Ltd.',
  'EKL': 'Epyllion Knitwears Ltd.',
  'EPL': 'Epyllion Limited.',
  'EWL': 'Epyllion Washing Ltd.'
};
const YEARS = [2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const DEFAULT_FACTORS: EmissionFactors = { grid_electricity: 0.62, natural_gas: 2.02, diesel: 2.68, petrol_octane: 2.31, cng: 2.02 };

const P_E_FIELDS: { key: keyof EnergyRow; label: string }[] = [
  { key:'pe_meter1_offpeak', label:'PE M1 Off (kWh)' }, { key:'pe_meter1_peak', label:'PE M1 Peak (kWh)' },
  { key:'pe_meter1_flat', label:'PE M1 Flat (kWh)' }, { key:'pe_meter2_offpeak', label:'PE M2 Off (kWh)' },
  { key:'pe_meter2_peak', label:'PE M2 Peak (kWh)' }, { key:'pe_meter2_flat', label:'PE M2 Flat (kWh)' },
  { key:'pe_total_bdt', label:'PE Total (BDT)' }, { key:'pe_domestic_kwh', label:'PE Domestic (kWh)' },
  { key:'pe_production_kwh', label:'PE Production (kWh)' }, { key:'solar_meter1_kwh', label:'Solar M1 (kWh)' },
  { key:'solar_meter2_kwh', label:'Solar M2 (kWh)' }, { key:'gen1_kwh', label:'Gen1 (kWh)' },
  { key:'gen2_kwh', label:'Gen2 (kWh)' },
];
const NG_FIELDS: { key: keyof EnergyRow; label: string }[] = [
  { key:'ng_meter1_m3', label:'NG M1 (m³)' }, { key:'ng_meter2_m3', label:'NG M2 (m³)' },
  { key:'ng_total_bdt', label:'NG Total (BDT)' }, { key:'diesel_gen1_l', label:'Diesel Gen1 (L)' },
  { key:'diesel_gen2_l', label:'Diesel Gen2 (L)' }, { key:'diesel_boiler_l', label:'Diesel Boiler (L)' },
  { key:'diesel_total_bdt', label:'Diesel Total (BDT)' }, { key:'vehicle_diesel_l', label:'Veh Diesel (L)' },
  { key:'vehicle_cng_m3', label:'Veh CNG (m³)' }, { key:'vehicle_octane_l', label:'Veh Octane (L)' },
];
const PROD_FIELDS: { key: keyof ProductionRow; label: string }[] = [
  { key:'man_power', label:'Man Power' }, { key:'working_days', label:'Working Days' },
  { key:'available_hour', label:'Available Hour' }, { key:'produce_hour', label:'Produce Hour' },
  { key:'total_npt_hour', label:'Total NPT Hour' }, { key:'average_smv', label:'Avg SMV' },
  { key:'prod_pcs_stst', label:'Pcs STST' }, { key:'prod_pcs_ca', label:'Pcs CA' },
  { key:'prod_pcs_ms', label:'Pcs MS' }, { key:'prod_pcs_varner', label:'Pcs Varner' },
  { key:'prod_pcs_next', label:'Pcs Next' }, { key:'prod_pcs_fenatech', label:'Pcs Fenatech' },
  { key:'prod_pcs_4f', label:'Pcs 4F' }, { key:'total_production_kg', label:'Total Prod (kg)' },
];

// Updated Modules array
const MODULES = [
  { 
    id: 'factory_profile', 
    label: 'Factory Profile', 
    icon: Factory,
    subModules: [{ id: 'factory_profile_overview', label: 'Overview (Coming Soon)' }]
  },
  { 
    id: 'inventory_mgmt', 
    label: 'Inventory Management', 
    icon: Box,
    subModules: [
      { id: 'inv_production_operations', label: 'Production & Operations' },
      { id: 'inv_electricity_solar', label: 'Purchase Electricity & Solar' },
      { id: 'inv_fuel_vehicles', label: 'Natural Gas, Diesel, Vehicles' },
      { id: 'inv_ghg_emission', label: 'GHG Emission' },
      { id: 'inv_water_wastewater', label: 'Water & Wastewater' },
      { id: 'inv_waste_management', label: 'Waste Management' },
      { id: 'inv_refrigerant', label: 'Refrigerant' },
      { id: 'inv_chemical_management', label: 'Chemical Management' },
      { id: 'inv_air_emission', label: 'Air Emission Inventory' },
      { id: 'inv_ppe_inventory', label: 'PPE Inventory' },
      { id: 'inv_boiler_gen_comp', label: 'Boiler, Generator & Compressor' },
      { id: 'inv_utility_info', label: 'Utility Information' }
    ]
  },
  { 
    id: 'kpi_mgmt', 
    label: 'KPI Management', 
    icon: TrendingUp,
    subModules: [{ id: 'kpi_mgmt_overview', label: 'Overview (Coming Soon)' }]
  },
  { 
    id: 'baseline_target', 
    label: 'Baseline, Target, Evaluation', 
    icon: Target,
    subModules: [{ id: 'baseline_target_overview', label: 'Overview (Coming Soon)' }]
  },
      {
      id: 'long_term_strategy',
      label: 'Long Term Strategy',
      icon: Compass,
      subModules: [{ id: 'long_term_overview', label: 'Overview (Coming Soon)' }]
    },
    {
      id: 'license_permit',
      label: 'License & Permit Tracking',
      icon: FileCheck,
      subModules: [{ id: 'license_permit_overview', label: 'Overview (Coming Soon)' }]
    },
    {
      id: 'legal_requirement',
      label: 'Legal Requirement Monitoring',
      icon: Scale,
      subModules: [{ id: 'legal_requirement_overview', label: 'Overview (Coming Soon)' }]
    },

    {
      id: 'sustainability_summary',
      label: 'Sustainability Summary',
      icon: TrendingUp,
      subModules: [{ id: 'sus_summary_overview', label: 'Overview (Coming Soon)' }]
    },
    {
      id: 'mcd_data_management',
      label: 'MCD Data Management',
      icon: Globe,
      subModules: [{ id: 'mcd_overview', label: 'Overview (Coming Soon)' }]
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: FolderOpen,
      subModules: [{ id: 'documents_overview', label: 'Overview (Coming Soon)' }]
    },

];

// ============================================================
// HELPERS
// ============================================================
const n = (v: any): number => { const x = parseFloat(v); return isNaN(x) ? 0 : x; };
const fmt = (v: number, d = 2): string => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

const emptyEnergyRow = (month: string): EnergyRow => ({
  month, pe_meter1_offpeak:0, pe_meter1_peak:0, pe_meter1_flat:0, pe_meter2_offpeak:0, pe_meter2_peak:0, pe_meter2_flat:0,
  pe_total_bdt:0, pe_domestic_kwh:0, pe_production_kwh:0, solar_meter1_kwh:0, solar_meter2_kwh:0, gen1_kwh:0, gen2_kwh:0,
  ng_meter1_m3:0, ng_meter2_m3:0, ng_total_bdt:0, diesel_gen1_l:0, diesel_gen2_l:0, diesel_boiler_l:0, diesel_total_bdt:0,
  vehicle_diesel_l:0, vehicle_cng_m3:0, vehicle_octane_l:0,
});
const emptyProdRow = (month: string): ProductionRow => ({
  month, man_power:0, working_days:0, available_hour:0, produce_hour:0, total_npt_hour:0, average_smv:0,
  prod_pcs_stst:0, prod_pcs_ca:0, prod_pcs_ms:0, prod_pcs_varner:0, prod_pcs_next:0, prod_pcs_fenatech:0, prod_pcs_4f:0, total_production_kg:0,
});

const rowTotalPE = (r: EnergyRow) => n(r.pe_meter1_offpeak)+n(r.pe_meter1_peak)+n(r.pe_meter1_flat)+n(r.pe_meter2_offpeak)+n(r.pe_meter2_peak)+n(r.pe_meter2_flat);
const rowTotalNG = (r: EnergyRow) => n(r.ng_meter1_m3)+n(r.ng_meter2_m3);
const rowTotalDiesel = (r: EnergyRow) => n(r.diesel_gen1_l)+n(r.diesel_gen2_l)+n(r.diesel_boiler_l);
const rowTotalProductionPcs = (r: ProductionRow) => n(r.prod_pcs_stst)+n(r.prod_pcs_ca)+n(r.prod_pcs_ms)+n(r.prod_pcs_varner)+n(r.prod_pcs_next)+n(r.prod_pcs_fenatech)+n(r.prod_pcs_4f);
const rowEfficiency = (r: ProductionRow) => {
  const avail = n(r.man_power)*n(r.working_days)*n(r.available_hour);
  const prod = n(r.man_power)*n(r.working_days)*n(r.produce_hour);
  return avail > 0 ? (prod/avail)*100 : 0;
};

const buildCSV = (headers: string[], rows: (string | number)[][]): string => {
  const esc = (v: any) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(esc).join(',')];
  rows.forEach(r => lines.push(r.map(esc).join(',')));
  return '\uFEFF' + lines.join('\r\n');
};
const downloadCSV = (filename: string, csv: string) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
};

// ============================================================
// DATA TABLE COMPONENT
// ============================================================
interface DataTableProps {
  title: string; subtitle?: string; rows: any[]; fields: { key: string; label: string }[];
  canEdit: boolean; onCellChange: (mi: number, key: string, val: string) => void; onSave: () => void;
  extraRows?: { label: string; getter: (r: any) => number }[];
}
const DataTable: React.FC<DataTableProps> = ({ title, subtitle, rows, fields, canEdit, onCellChange, onSave, extraRows }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-wrap gap-2">
      <div>
        <h2 className="text-sm font-bold text-gray-800">{title}</h2>
        {subtitle && <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {canEdit && (
        <button onClick={onSave} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm">
          <Save size={14} /> Save
        </button>
      )}
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-emerald-50/60 text-emerald-800">
            <th className="px-2 py-2 text-left font-semibold sticky left-0 bg-emerald-50/60 z-10">Month</th>
            {fields.map(f => <th key={f.key} className="px-2 py-2 text-right font-semibold whitespace-nowrap">{f.label}</th>)}
            {extraRows?.map((r, i) => <th key={'x'+i} className="px-2 py-2 text-right font-semibold whitespace-nowrap bg-emerald-100/70">{r.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, mi) => (
            <tr key={row.month} className={mi % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
              <td className="px-2 py-1.5 font-semibold text-gray-700 sticky left-0 bg-inherit z-10">{row.month}</td>
              {fields.map(f => (
                <td key={f.key} className="px-1 py-1">
                  <input type="number" value={row[f.key] || ''} disabled={!canEdit}
                    onChange={e => onCellChange(mi, f.key, e.target.value)}
                    className="w-24 text-right px-2 py-1 border border-transparent hover:border-gray-200 focus:border-emerald-400 focus:bg-emerald-50/40 rounded text-xs disabled:bg-transparent disabled:cursor-not-allowed outline-none" />
                </td>
              ))}
              {extraRows?.map((r, i) => (
                <td key={'x'+i} className="px-2 py-1.5 text-right font-semibold text-emerald-700 bg-emerald-50/40 whitespace-nowrap">{fmt(r.getter(row), 1)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// ============================================================
// MAIN APP
// ============================================================
const App: React.FC = () => {
  const [user, setUser] = useState<UserRecord | null>(null);
  const [bootLoading, setBootLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState('');
  const [factors, setFactors] = useState<EmissionFactors>(DEFAULT_FACTORS);
  const [factory, setFactory] = useState('EKWL');
  const [year, setYear] = useState(2027);
    const [currentTheme, setCurrentTheme] = useState<ThemeKey>(() => {
    return (localStorage.getItem('portal_theme') as ThemeKey) || 'emerald';
  });
   const themeConfig = THEMES.find(t => t.id === currentTheme) || THEMES[0];
  
  const [activeModule, setActiveModule] = useState<string>('factory_profile_overview');
  const [expandedModules, setExpandedModules] = useState<string[]>(['factory_profile', 'inventory_mgmt']);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [energyRows, setEnergyRows] = useState<EnergyRow[]>([]);
  const [prodRows, setProdRows] = useState<ProductionRow[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    const sess = localStorage.getItem('sp_session');
    if (sess) { try { setUser(JSON.parse(sess)); } catch {} }
    setBootLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const s = await restGet('settings/general');
        if (s && s.logo_url) setLogoUrl(s.logo_url);
        const ef = await restGet('settings/emission_factors');
        if (ef) {
          setFactors({
            grid_electricity: n(ef.grid_electricity) || DEFAULT_FACTORS.grid_electricity,
            natural_gas: n(ef.natural_gas) || DEFAULT_FACTORS.natural_gas,
            diesel: n(ef.diesel) || DEFAULT_FACTORS.diesel,
            petrol_octane: n(ef.petrol_octane) || DEFAULT_FACTORS.petrol_octane,
            cng: n(ef.cng) || DEFAULT_FACTORS.cng,
          });
        }
      } catch {}
    })();
  }, []);

  const isSuper = user?.role === 'super_admin';
  const isViewer = user?.role === 'viewer';
  const canEdit = !isViewer;

  const userAllowedModules = useMemo(() => {
    if (!user) return [];
    if (isSuper) return MODULES.map(m => m.id);
    return MODULES.map(m => m.id); // Default to all new modules for everyone
  }, [user, isSuper]);

  const userAllowedFactories = useMemo(() => {
    if (!user) return [];
    if (isSuper) return [...FACTORIES];
    return user.allowed_factories || [];
  }, [user, isSuper]);

  useEffect(() => {
    if (userAllowedFactories.length && !userAllowedFactories.includes(factory)) setFactory(userAllowedFactories[0]);
  }, [userAllowedFactories, factory]);

  useEffect(() => {
    if (!user) return;
    if (!userAllowedModules.includes(activeModule) && activeModule !== 'settings' && activeModule !== 'user_management' && activeModule !== 'excel_export') {
      setActiveModule('factory_profile_overview');
    }
  }, [user, userAllowedModules, activeModule]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      const [eSnap, pSnap] = await Promise.all([
        restGet(`energy_data/${factory}_${year}`),
        restGet(`production_data/${factory}_${year}`),
      ]);
      if (eSnap && eSnap.rows) {
        setEnergyRows(MONTHS.map(m => ({ ...emptyEnergyRow(m), ...(eSnap.rows[m] || {}), month: m })));
      } else setEnergyRows(MONTHS.map(emptyEnergyRow));
      if (pSnap && pSnap.rows) {
        setProdRows(MONTHS.map(m => ({ ...emptyProdRow(m), ...(pSnap.rows[m] || {}), month: m })));
      } else setProdRows(MONTHS.map(emptyProdRow));
    } catch { setEnergyRows(MONTHS.map(emptyEnergyRow)); setProdRows(MONTHS.map(emptyProdRow)); }
    finally { setDataLoading(false); }
  }, [user, factory, year]);

  useEffect(() => { loadData(); }, [loadData]);

  const saveEnergy = async () => {
    if (!canEdit) return;
    try {
      const rowsObj: any = {};
      energyRows.forEach(r => { rowsObj[r.month] = r; });
      await restSet('energy_data', `${factory}_${year}`, { factory, year, rows: rowsObj });
      alert('Energy data saved.');
    } catch (e: any) { alert('Save failed: ' + e.message); }
  };
  const saveProd = async () => {
    if (!canEdit) return;
    try {
      const rowsObj: any = {};
      prodRows.forEach(r => { rowsObj[r.month] = r; });
      await restSet('production_data', `${factory}_${year}`, { factory, year, rows: rowsObj });
      alert('Production data saved.');
    } catch (e: any) { alert('Save failed: ' + e.message); }
  };

  const updateEnergyCell = (mi: number, key: string, val: string) => {
    if (!canEdit) return;
    setEnergyRows(prev => { const c = [...prev]; (c[mi] as any)[key] = val === '' ? 0 : n(val); return c; });
  };
  const updateProdCell = (mi: number, key: string, val: string) => {
    if (!canEdit) return;
    setProdRows(prev => { const c = [...prev]; (c[mi] as any)[key] = val === '' ? 0 : n(val); return c; });
  };

  const logout = () => { localStorage.removeItem('sp_session'); setUser(null); };

  const toggleExpand = (id: string) => {
    setExpandedModules(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const ghg = useMemo(() => {
    const totalPEkWh = energyRows.reduce((s, r) => s + rowTotalPE(r), 0);
    const totalSolar = energyRows.reduce((s, r) => s + n(r.solar_meter1_kwh) + n(r.solar_meter2_kwh), 0);
    const totalNGm3 = energyRows.reduce((s, r) => s + rowTotalNG(r), 0);
    const totalDieselL = energyRows.reduce((s, r) => s + rowTotalDiesel(r), 0);
    const totalVehDiesel = energyRows.reduce((s, r) => s + n(r.vehicle_diesel_l), 0);
    const totalVehCNG = energyRows.reduce((s, r) => s + n(r.vehicle_cng_m3), 0);
    const totalVehOctane = energyRows.reduce((s, r) => s + n(r.vehicle_octane_l), 0);
    const totalGenkWh = energyRows.reduce((s, r) => s + n(r.gen1_kwh) + n(r.gen2_kwh), 0);
    const totalProdPcs = prodRows.reduce((s, r) => s + rowTotalProductionPcs(r), 0);
    const totalProdKg = prodRows.reduce((s, r) => s + n(r.total_production_kg), 0);
    const ghgPE = totalPEkWh * factors.grid_electricity;
    const ghgNG = totalNGm3 * factors.natural_gas;
    const ghgDiesel = totalDieselL * factors.diesel;
    const ghgVehicle = totalVehDiesel*factors.diesel + totalVehCNG*factors.cng + totalVehOctane*factors.petrol_octane;
    const totalGHGkg = ghgPE + ghgNG + ghgDiesel + ghgVehicle;
    const totalGHGton = totalGHGkg / 1000;
    return {
      totalPEkWh, totalSolar, totalNGm3, totalDieselL, totalVehDiesel, totalVehCNG, totalVehOctane, totalGenkWh, totalProdPcs, totalProdKg,
      ghgPE, ghgNG, ghgDiesel, ghgVehicle, totalGHGkg, totalGHGton,
      ghgPerPcs: totalProdPcs > 0 ? totalGHGkg/totalProdPcs : 0,
      ghgPerKg: totalProdKg > 0 ? totalGHGkg/totalProdKg : 0,
      energyPerPcs: totalProdPcs > 0 ? (totalPEkWh+totalSolar+totalGenkWh)/totalProdPcs : 0,
    };
  }, [energyRows, prodRows, factors]);

  const [exportModule, setExportModule] = useState('purchase_electricity');
  const [exportCols, setExportCols] = useState<string[]>([]);
  const [exportDropOpen, setExportDropOpen] = useState(false);

  const exportFieldMap: Record<string, { key: string; label: string }[]> = {
    purchase_electricity: P_E_FIELDS.map(f => ({ key: f.key as string, label: f.label })),
    natural_gas: NG_FIELDS.map(f => ({ key: f.key as string, label: f.label })),
    production: PROD_FIELDS.map(f => ({ key: f.key as string, label: f.label })),
  };

  useEffect(() => {
    const list = exportFieldMap[exportModule] || [];
    setExportCols(list.map(f => f.key));
  }, [exportModule]);

  const doExport = () => {
    const list = exportFieldMap[exportModule] || [];
    const selected = list.filter(f => exportCols.includes(f.key));
    const source = exportModule === 'production' ? prodRows : energyRows;
    const headers = ['Month', ...selected.map(f => f.label)];
    const data = source.map((r: any) => [r.month, ...selected.map(f => r[f.key] ?? '')]);
    const csv = buildCSV(headers, data);
    downloadCSV(`${factory}_${year}_${exportModule}.csv`, csv);
  };

  const [allUsers, setAllUsers] = useState<UserRecord[]>([]);
  const [userLoading, setUserLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [newUser, setNewUser] = useState<Omit<UserRecord,'id'>>({ email:'', password:'', full_name:'', role:'viewer', allowed_modules:['kpi_mgmt'], allowed_factories:[...FACTORIES] });

  const loadUsers = async () => {
    setUserLoading(true);
    try { const list = await restList('users'); setAllUsers(list as UserRecord[]); }
    catch {} finally { setUserLoading(false); }
  };
  useEffect(() => { if (activeModule === 'user_management' && isSuper) loadUsers(); }, [activeModule, isSuper]);

  const addNewUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.full_name) { alert('Fill all fields'); return; }
    try {
      await restCreate('users', newUser);
      setNewUserOpen(false);
      setNewUser({ email:'', password:'', full_name:'', role:'viewer', allowed_modules:['kpi_mgmt'], allowed_factories:[...FACTORIES] });
      loadUsers();
    } catch (e: any) { alert('Failed: ' + e.message); }
  };
  const saveUserEdit = async () => {
    if (!editingUser || !editingUser.id) return;
    try {
      const { id, ...data } = editingUser;
      await restPatch('users', id, data);
      setEditingUser(null);
      loadUsers();
    } catch (e: any) { alert('Failed: ' + e.message); }
  };

  const [settingsLogo, setSettingsLogo] = useState(logoUrl);
  const [settingsFactors, setSettingsFactors] = useState<EmissionFactors>(factors);
  useEffect(() => { setSettingsLogo(logoUrl); }, [logoUrl]);
  useEffect(() => { setSettingsFactors(factors); }, [factors]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setSettingsLogo(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const saveSettings = async () => {
    try {
      await restSet('settings', 'general', { logo_url: settingsLogo });
      await restSet('settings', 'emission_factors', settingsFactors);
      setLogoUrl(settingsLogo); setFactors(settingsFactors);
      alert('Settings saved.');
    } catch (e: any) { alert('Save failed: ' + e.message); }
  };

  const findActiveModuleAndSub = () => {
    for (const mod of MODULES) {
      const sub = mod.subModules.find(s => s.id === activeModule);
      if (sub) return { mainModule: mod, subModule: sub };
    }
    return null;
  };

  const activeRoute = findActiveModuleAndSub();

  if (bootLoading) return <div className="min-h-screen flex items-center justify-center bg-white"><div className="animate-pulse text-emerald-600 text-sm">Loading...</div></div>;
  if (!user) return <LoginScreen onLogin={setUser} />;

  return (    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${themeConfig.pageBg}`}>
      {/* HEADER */}
      <header className={`${themeConfig.headerBg} ${themeConfig.sidebarText} border-b sticky top-0 z-40 transition-colors duration-300`}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 hover:text-emerald-600"><Menu size={20} /></button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-sm">
                <Leaf className="text-white" size={18} />
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-800 leading-tight">Sustainability</h1>
                <p className="text-[10px] text-emerald-600 font-medium">Portal</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-2">
              <span className="text-[11px] text-gray-500">Unit</span>
              <select value={factory} onChange={e => setFactory(e.target.value)} className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none">
                {userAllowedFactories.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <span className="text-[11px] text-gray-500">Year</span>
              <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none">
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-semibold text-gray-800">{user.full_name}</span>
              <span className="text-[10px] text-emerald-600 uppercase">{user.role.replace('_',' ')}</span>
            </div>
            <button onClick={logout} title="Logout" className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600"><LogOut size={18} /></button>
          </div>
        </div>
        
        <div className="md:hidden px-4 pb-2 flex gap-2">
          <select value={factory} onChange={e => setFactory(e.target.value)} className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded-lg bg-white">
            {userAllowedFactories.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded-lg bg-white">
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR */}
        {sidebarOpen && (
          <aside className={`w-64 ${themeConfig.sidebarBg} ${themeConfig.sidebarText} border-r flex flex-col h-[calc(100vh-61px)] overflow-y-auto hidden md:flex transition-colors duration-300`}>
            <nav className="p-3 space-y-1 flex-1">
              {MODULES.map(m => {
                const Icon = m.icon;
                const isExpanded = expandedModules.includes(m.id);
                return (
                  <div key={m.id} className="flex flex-col">
                    <button 
                      onClick={() => toggleExpand(m.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                        isExpanded ? 'bg-emerald-50/50 text-emerald-800 font-semibold' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={16} className={isExpanded ? 'text-emerald-600' : 'text-gray-400'} />
                        <span>{m.label}</span>
                      </div>
                      {isExpanded ? <ChevronDown size={14} className="text-emerald-600" /> : <ChevronRight size={14} className="text-gray-400" />}
                    </button>
                    
                    {isExpanded && (
                      <div className="ml-9 mt-1 space-y-1 border-l border-gray-100 pl-2">
                        {m.subModules.map(sub => {
                          const isActive = activeModule === sub.id;
                          return (
                            <button
                              key={sub.id}
                              onClick={() => setActiveModule(sub.id)}
                              className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors ${
                                isActive ? 'bg-emerald-100/60 text-emerald-700 font-medium' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                              }`}
                            >
                              {sub.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* SYSTEM MENUS */}
            <div className="p-3 border-t border-gray-100 space-y-1 mt-auto">
              <button onClick={() => setActiveModule('excel_export')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm ${activeModule === 'excel_export' ? 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200' : 'text-gray-600 hover:bg-gray-50'}`}>
                <FileSpreadsheet size={16} /><span className="flex-1">Custom Excel Export</span>
              </button>
              {isSuper && (
                <button onClick={() => setActiveModule('user_management')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm ${activeModule === 'user_management' ? 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200' : 'text-gray-600 hover:bg-gray-50'}`}>
                  <Users size={16} /><span className="flex-1">User Management</span>
                </button>
              )}
              <button onClick={() => setActiveModule('settings')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm ${activeModule === 'settings' ? 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Settings size={16} /><span className="flex-1">Settings</span>
              </button>
            </div>
          </aside>
        )}

        {/* MOBILE DRAWER */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-30 flex">
            <div className="absolute inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
            <div className="relative w-64 bg-white h-full shadow-xl overflow-y-auto flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <span className="text-sm font-bold text-gray-800">Menu</span>
                <button onClick={() => setSidebarOpen(false)}><X size={18} /></button>
              </div>
              <nav className="p-3 space-y-1 flex-1">
                {MODULES.map(m => {
                  const Icon = m.icon;
                  const isExpanded = expandedModules.includes(m.id);
                  return (
                    <div key={m.id} className="flex flex-col">
                      <button 
                        onClick={() => toggleExpand(m.id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                          isExpanded ? 'bg-emerald-50/50 text-emerald-800 font-semibold' : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon size={16} className={isExpanded ? 'text-emerald-600' : 'text-gray-400'} />
                          <span>{m.label}</span>
                        </div>
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                      {isExpanded && (
                        <div className="ml-9 mt-1 space-y-1 border-l border-gray-100 pl-2">
                          {m.subModules.map(sub => {
                            const isActive = activeModule === sub.id;
                            return (
                              <button
                                key={sub.id}
                                onClick={() => { setActiveModule(sub.id); setSidebarOpen(false); }}
                                className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors ${
                                  isActive ? 'bg-emerald-100/60 text-emerald-700 font-medium' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                                }`}
                              >
                                {sub.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>

              <div className="p-3 border-t border-gray-100 space-y-1 mt-auto">
                <button onClick={() => { setActiveModule('excel_export'); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm ${activeModule === 'excel_export' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
                  <FileSpreadsheet size={16} /><span>Custom Excel Export</span>
                </button>
                {isSuper && (
                  <button onClick={() => { setActiveModule('user_management'); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm ${activeModule === 'user_management' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
                    <Users size={16} /><span>User Management</span>
                  </button>
                )}
                <button onClick={() => { setActiveModule('settings'); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm ${activeModule === 'settings' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
                  <Settings size={16} /><span>Settings</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
                    <div className="mb-6 bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-gray-200/60 shadow-sm flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                {UNIT_FULL_NAMES[factory] || factory}
              </h1>
              <p className="text-xs text-gray-500 mt-1 font-medium tracking-wide uppercase">
                Sustainability Portal &bull; {year}
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 font-semibold text-xs">
              Active Unit: {factory}
            </div>
          </div>
          {activeModule === 'excel_export' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
              <h2 className="text-sm font-bold text-gray-800">Custom Excel Export (CSV)</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Module</label>
                  <select value={exportModule} onChange={e => setExportModule(e.target.value)} className="w-full text-xs px-2 py-2 border border-gray-200 rounded-lg">
                    <option value="purchase_electricity">Purchase Electricity & Solar</option>
                    <option value="natural_gas">Natural Gas, Diesel & Vehicles</option>
                    <option value="production">Production & Operations</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Unit</label>
                  <select value={factory} onChange={e => setFactory(e.target.value)} className="w-full text-xs px-2 py-2 border border-gray-200 rounded-lg">
                    {userAllowedFactories.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Year</label>
                  <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="w-full text-xs px-2 py-2 border border-gray-200 rounded-lg">
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Columns</label>
                <button onClick={() => setExportDropOpen(!exportDropOpen)} className="w-full text-left text-xs px-3 py-2 border border-gray-200 rounded-lg bg-white flex items-center justify-between">
                  <span>{exportCols.length} of {(exportFieldMap[exportModule]||[]).length} selected</span>
                  <Menu size={14} />
                </button>
                {exportDropOpen && (
                  <div className="mt-1 p-2 border border-gray-200 rounded-lg bg-white max-h-60 overflow-y-auto">
                    {(exportFieldMap[exportModule]||[]).map(f => (
                      <label key={f.key} className="flex items-center gap-2 px-2 py-1 hover:bg-emerald-50 rounded cursor-pointer text-xs">
                        <input type="checkbox" checked={exportCols.includes(f.key)}
                          onChange={e => setExportCols(prev => e.target.checked ? [...prev, f.key] : prev.filter(k => k !== f.key))} />
                        {f.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={doExport} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold">
                <FileSpreadsheet size={14} /> Download CSV
              </button>
            </div>
          )}

          {activeModule === 'user_management' && isSuper && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-800">User Management</h2>
                <button onClick={() => setNewUserOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold">
                  <Plus size={14} /> Add User
                </button>
              </div>
              {userLoading ? <div className="p-4 text-xs text-emerald-600">Loading users...</div> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-emerald-50/60 text-emerald-800">
                        <th className="px-3 py-2 text-left font-semibold">Name</th>
                        <th className="px-3 py-2 text-left font-semibold">Email</th>
                        <th className="px-3 py-2 text-left font-semibold">Role</th>
                        <th className="px-3 py-2 text-left font-semibold">Modules</th>
                        <th className="px-3 py-2 text-left font-semibold">Units</th>
                        <th className="px-3 py-2 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allUsers.map((u, i) => (
                        <tr key={u.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                          <td className="px-3 py-2">{u.full_name}</td>
                          <td className="px-3 py-2">{u.email}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${u.role === 'super_admin' ? 'bg-emerald-100 text-emerald-700' : u.role === 'entry_user' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-[10px] text-gray-500">{(u.allowed_modules||[]).length} modules</td>
                          <td className="px-3 py-2 text-[10px] text-gray-500">{(u.allowed_factories||[]).length} units</td>
                          <td className="px-3 py-2 text-right">
                            <button onClick={() => setEditingUser(u)} className="text-emerald-600 hover:underline text-[11px]">Edit</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

                   {activeModule === 'settings' && (
            <SettingsPanel
              currentThemeId={currentTheme}
              onThemeChange={(newTheme) => setCurrentTheme(newTheme as ThemeKey)}
              settingsFactors={factors}
              setSettingsFactors={setFactors}
              isSuper={isSuper}
              onSaveSettings={saveSettings}
              n={n}
            />
          )}

          {/* NEW INVENTORY MANAGEMENT COMPONENT */}
          {activeModule.startsWith('inv_') && (
            <InventoryManagement 
              activeSubModule={activeModule} 
              selectedUnit={factory} 
              selectedYear={year.toString()} 
              userRole={user?.role || 'viewer'} 
            />
          )}

          {/* PLACEHOLDER FOR OTHER NEW MODULES */}
          {activeRoute && !activeModule.startsWith('inv_') && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 min-h-[60vh] flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-6">
                <Factory className="text-emerald-600" size={32} />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-2">
                {activeRoute.mainModule.label} <ChevronRight size={18} className="text-gray-400" /> {activeRoute.subModule.label}
              </h2>
              <p className="text-sm text-gray-500 max-w-md mb-8">
                This is a clean placeholder for the new module. You can start building forms, data tables, and analytics here.
              </p>
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                  <span className="text-xs text-gray-500 uppercase font-semibold">Unit</span>
                  <div className="text-sm font-bold text-gray-800">{factory}</div>
                </div>
                <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                  <span className="text-xs text-gray-500 uppercase font-semibold">Year</span>
                  <div className="text-sm font-bold text-gray-800">{year}</div>
                </div>
                <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                  <span className="text-xs text-gray-500 uppercase font-semibold">Module ID</span>
                  <div className="text-sm font-bold text-emerald-600 font-mono">{activeRoute.subModule.id}</div>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100">
                <Check size={14} /> Ready for implementation
              </div>
            </div>
          )}
        </main>
      </div>

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold">Edit User</h3>
              <button onClick={() => setEditingUser(null)}><X size={18} /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Full Name</label>
                <input value={editingUser.full_name} onChange={e => setEditingUser({ ...editingUser, full_name: e.target.value })} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg" />
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Role</label>
                <select value={editingUser.role} onChange={e => setEditingUser({ ...editingUser, role: e.target.value as Role })} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg">
                  <option value="super_admin">super_admin</option>
                  <option value="entry_user">entry_user</option>
                  <option value="viewer">viewer</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Modules</label>
                <div className="grid grid-cols-2 gap-1">
                  {MODULES.map(m => (
                    <label key={m.id} className="flex items-center gap-2 text-[11px]">
                      <input type="checkbox" checked={editingUser.allowed_modules.includes(m.id)}
                        onChange={e => setEditingUser({ ...editingUser, allowed_modules: e.target.checked ? [...editingUser.allowed_modules, m.id] : editingUser.allowed_modules.filter(x => x !== m.id) })} />
                      {m.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Units</label>
                <div className="grid grid-cols-3 gap-1">
                  {FACTORIES.map(f => (
                    <label key={f} className="flex items-center gap-2 text-[11px]">
                      <input type="checkbox" checked={editingUser.allowed_factories.includes(f)}
                        onChange={e => setEditingUser({ ...editingUser, allowed_factories: e.target.checked ? [...editingUser.allowed_factories, f] : editingUser.allowed_factories.filter(x => x !== f) })} />
                      {f}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setEditingUser(null)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg">Cancel</button>
              <button onClick={saveUserEdit} className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg font-semibold">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* NEW USER MODAL */}
      {newUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold">Add New User</h3>
              <button onClick={() => setNewUserOpen(false)}><X size={18} /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Full Name</label>
                <input value={newUser.full_name} onChange={e => setNewUser({ ...newUser, full_name: e.target.value })} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg" />
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Email</label>
                <input value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg" />
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Password</label>
                <input value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg" />
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Role</label>
                <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value as Role })} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg">
                  <option value="super_admin">super_admin</option>
                  <option value="entry_user">entry_user</option>
                  <option value="viewer">viewer</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Modules</label>
                <div className="grid grid-cols-2 gap-1">
                  {MODULES.map(m => (
                    <label key={m.id} className="flex items-center gap-2 text-[11px]">
                      <input type="checkbox" checked={newUser.allowed_modules.includes(m.id)}
                        onChange={e => setNewUser({ ...newUser, allowed_modules: e.target.checked ? [...newUser.allowed_modules, m.id] : newUser.allowed_modules.filter(x => x !== m.id) })} />
                      {m.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Units</label>
                <div className="grid grid-cols-3 gap-1">
                  {FACTORIES.map(f => (
                    <label key={f} className="flex items-center gap-2 text-[11px]">
                      <input type="checkbox" checked={newUser.allowed_factories.includes(f)}
                        onChange={e => setNewUser({ ...newUser, allowed_factories: e.target.checked ? [...newUser.allowed_factories, f] : newUser.allowed_factories.filter(x => x !== f) })} />
                      {f}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setNewUserOpen(false)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg">Cancel</button>
              <button onClick={addNewUser} className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg font-semibold">Create</button>
            </div>
          </div>
        </div>
      )}

      <footer className="text-center text-[11px] text-gray-400 py-4 border-t border-gray-100 bg-white mt-auto">
        © 2027 Sustainability Portal • Designed &amp; Developed by Md. Mahfuj Rahman Rasel | Support: +880 1705-472581
      </footer>
    </div>
  );
};

// ============================================================
// LOGIN SCREEN
// ============================================================
const LoginScreen: React.FC<{ onLogin: (u: UserRecord) => void }> = ({ onLogin }) => {
  const [mode, setMode] = useState<'signin'|'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignin = async () => {
    setError('');
    if (!email || !password) { setError('Email and password are required.'); return; }
    setLoading(true);
    try {
      const matches = await restQuery('users', [
        { field: 'email', value: email.trim().toLowerCase() },
        { field: 'password', value: password },
      ]);
      if (matches.length === 0) { setError('Invalid credentials.'); setLoading(false); return; }
      const u = matches[0] as UserRecord;
      localStorage.setItem('sp_session', JSON.stringify(u));
      onLogin(u);
    } catch (e: any) { setError(e.message || 'Sign in failed.'); }
    finally { setLoading(false); }
  };

  const handleSignup = async () => {
    setError('');
    if (!email || !password || !fullName) { setError('All fields are required.'); return; }
    setLoading(true);
    try {
      const existing = await restList('users');
      const isFirst = existing.length === 0;
      const role: Role = isFirst ? 'super_admin' : 'viewer';
      const newUser: Omit<UserRecord,'id'> = {
        email: email.trim().toLowerCase(), password, full_name: fullName.trim(), role,
        allowed_modules: isFirst ? MODULES.map(m => m.id) : ['kpi_mgmt'],
        allowed_factories: [...FACTORIES],
      };
      const newId = await restCreate('users', newUser);
      const u: UserRecord = { id: newId, ...newUser };
      localStorage.setItem('sp_session', JSON.stringify(u));
      onLogin(u);
    } catch (e: any) { setError(e.message || 'Sign up failed.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col relative">
      <img 
        src="https://i.ibb.co/8nj060LX/epyllion.png" 
        alt="Epyllion Group" 
        className="h-12 w-auto object-contain fixed top-5 left-6" 
      />
      <div className="flex-1 flex items-center justify-center px-4 py-10 mt-10">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl shadow-emerald-100/60 border border-emerald-100 p-8">
            <div className="flex flex-col items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-800">Sustainability Portal</h1>
              <p className="text-sm text-emerald-600 mt-1">{mode==='signin' ? 'Sign in to your account' : 'Create a new account'}</p>
            </div>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 shrink-0" /> <span>{error}</span>
              </div>
            )}
            <div className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name</label>
                  <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Doe"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Password</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                    className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-600">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button onClick={mode==='signin' ? handleSignin : handleSignup} disabled={loading}
                className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold text-sm shadow-md shadow-emerald-200">
                {loading ? 'Please wait...' : mode==='signin' ? 'Sign In' : 'Create Account'}
              </button>
            </div>
            <div className="mt-5 text-center text-sm text-gray-500">
              {mode==='signin' ? (
                <>Don't have an account? <button onClick={() => { setMode('signup'); setError(''); }} className="text-emerald-600 font-semibold hover:underline">Sign Up</button></>
              ) : (
                <>Already have an account? <button onClick={() => { setMode('signin'); setError(''); }} className="text-emerald-600 font-semibold hover:underline">Sign In</button></>
              )}
            </div>
            <div className="mt-4 p-3 rounded-lg bg-emerald-50/60 border border-emerald-100 text-[11px] text-emerald-700">
              <Shield size={12} className="inline mr-1" />First registered user becomes <b>super_admin</b>.
            </div>
          </div>
        </div>
      </div>
      <footer className="text-center text-[11px] text-gray-400 py-5 border-t border-gray-100">
        © 2027 Sustainability Portal • Designed &amp; Developed by Md. Mahfuj Rahman Rasel
      </footer>
    </div>
  );
};

export default App;
