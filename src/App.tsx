import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Leaf, LogOut, Users, Settings, BarChart3, Zap, Flame, Factory,
  FileSpreadsheet, Save, X, Check, AlertCircle, Menu, Eye, EyeOff, Shield, Plus,
  ChevronDown, ChevronRight, Box, TrendingUp, Target, Globe, FileCheck, Scale, FolderOpen,
  Home, Droplets, Recycle, Cloud, Fuel, Sun, Cog, Wind, Snowflake, FlaskConical, Truck,
  Trash2, Waves, Boxes, ClipboardList, Building2, Clock, LayoutGrid, SlidersHorizontal
} from 'lucide-react';
import InventoryManagement from './modules/InventoryManagement';
import SettingsPanel, { THEMES } from './modules/SettingsPanel';
import FactoryProfile from './modules/FactoryProfile';
import KpiManagement from './modules/KpiManagement';
import BaselineTargetEvaluation from './modules/BaselineTargetEvaluation';
import LongTermStrategy from './modules/LongTermStrategy';
import LicensePermitTracking from './modules/LicensePermitTracking';
import LegalRequirementMonitoring from './modules/LegalRequirementMonitoring';
import SustainabilitySummary from './modules/SustainabilitySummary';
import McdDataManagement from './modules/McdDataManagement';
import HumanResource from './modules/HumanResource';
import DocumentsModule from './modules/DocumentsModule';
import CustomExcelExport from './modules/CustomExcelExport';
type ThemeKey = string;

// ============================================================
// FIRESTORE REST API (no SDK, native fetch)
// ============================================================
const PROJECT_ID = "sustainability-portal-886cf";
const API_KEY = import.meta.env.VITE_FIREBASE_API_KEY;
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
  const docs: any[] = [];
  let pageToken = '';
  do {
    const params = new URLSearchParams({ key: API_KEY || '', pageSize: '1000' });
    if (pageToken) params.set('pageToken', pageToken);
    const r = await fetch(`${BASE}/${collectionId}?${params}`);
    if (!r.ok) {
      if (r.status === 404) return [];
      throw new Error(`LIST ${collectionId} failed: ${r.status}`);
    }
    const json = await r.json();
    docs.push(...(json.documents || []).map((d: any) => ({ id: d.name?.split('/').pop(), ...fromFSFields(d.fields || {}) })));
    pageToken = json.nextPageToken || '';
  } while (pageToken);
  return docs;
};

const restListCollectionIds = async (parentPath = ''): Promise<string[]> => {
  const collectionIds: string[] = [];
  let pageToken = '';
  do {
    const params = new URLSearchParams({ key: API_KEY || '' });
    if (pageToken) params.set('pageToken', pageToken);
    const url = `${BASE}${parentPath ? `/${parentPath}` : ''}:listCollectionIds?${params}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageSize: 1000, pageToken: pageToken || undefined }),
    });
    if (!r.ok) throw new Error(`LIST COLLECTIONS failed: ${r.status} ${await r.text()}`);
    const json = await r.json();
    collectionIds.push(...(json.collectionIds || []));
    pageToken = json.nextPageToken || '';
  } while (pageToken);
  return collectionIds;
};

const restExportAllDocuments = async (): Promise<{ collection: string; id: string; data: any }[]> => {
  const exported: { collection: string; id: string; data: any }[] = [];
  const pendingCollections = await restListCollectionIds();
  while (pendingCollections.length) {
    const collection = pendingCollections.shift()!;
    const documents = await restList(collection);
    for (const document of documents) {
      const { id, ...data } = document;
      exported.push({ collection, id: String(id || ''), data });
      pendingCollections.push(...(await restListCollectionIds(`${collection}/${id}`)));
    }
  }
  return exported;
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
type Role = 'super_admin' | 'editor' | 'viewer';
type UserStatus = 'pending' | 'approved' | 'rejected';
interface UserRecord {
  id?: string;
  email: string;
  password: string;
  full_name: string;
  role: Role;
  status: UserStatus;
  allowedModules: string[];
  allowedUnits: string[];
}

const normalizeUser = (raw: any): UserRecord => {
  const allowedModules = Array.isArray(raw?.allowedModules) ? raw.allowedModules
    : Array.isArray(raw?.allowed_modules) ? raw.allowed_modules : [];
  const allowedUnits = Array.isArray(raw?.allowedUnits) ? raw.allowedUnits
    : Array.isArray(raw?.allowed_factories) ? raw.allowed_factories : [];
  return {
    ...raw,
    role: raw?.role === 'super_admin' ? 'super_admin' : raw?.role === 'editor' || raw?.role === 'entry_user' ? 'editor' : 'viewer',
    status: raw?.role === 'super_admin' || raw?.status === 'active' || raw?.status === 'approved'
      ? 'approved'
      : raw?.status === 'pending' ? 'pending' : raw?.status === 'rejected' ? 'rejected' : 'approved',
    allowedModules: allowedModules.filter((id: unknown) =>
      id === 'dashboard' || MODULE_PERMISSION_OPTIONS.some(option => option.id === id)),
    allowedUnits: allowedUnits.filter((unit: unknown) => typeof unit === 'string' && FACTORIES.includes(unit)),
  };
};

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

const UNIT_DIRECTORY: Record<string, string> = {
  'EKWL': 'Epyllion Knitwears Ltd.',
  'DKL': 'Dekko Knitwears Ltd.',
  'DDL': 'Dazzling Dresses Ltd.',
  'EKWL-HW': 'Epyllion Knitwears Ltd. (HW)',
  'ESL': 'Epyllion Style Ltd.',
  'ESL-Extention': 'Epyllion Style Ltd.(Extention)',
  'EFL': 'Epyllion Fabrics Ltd.',
  'EKL': 'Epyllion Knitex Ltd.',
  'EPL': 'Epyllion Limited.',
  'EWL': 'Epyllion Washing Ltd.'
};
// Backward-compatible alias used by all module props
const UNIT_FULL_NAMES = UNIT_DIRECTORY;

const YEARS = [2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const DEFAULT_FACTORS: EmissionFactors = { grid_electricity: 0.62, natural_gas: 2.02, diesel: 2.68, petrol_octane: 2.31, cng: 2.02 };

// Net Calorific Value defaults (MJ per unit). Overridden by Settings year-wise NCV factors when found.
const DEFAULT_NCV: EmissionFactors = { grid_electricity: 3.6, natural_gas: 38.3, diesel: 36.0, petrol_octane: 32.0, cng: 38.3 };

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
       subModules: [
      { id: 'fp_basic_info', label: 'Basic Information' },
      { id: 'fp_premises', label: 'Factory Premises' },
      { id: 'fp_working_hour', label: 'Working Hour & Payment System' },
      { id: 'fp_floor_glance', label: 'Floor At a Glance' },
      { id: 'fp_machinery_list', label: 'Machinery List' }
    ] 
  },
  { 
    id: 'inventory_mgmt', 
    label: 'Inventory Management', 
    icon: Box,
        subModules: [
      { id: 'inv_production_operations', label: 'Production & Operations' },
      { id: 'inv_electricity_solar', label: 'Purchase Electricity & Solar' },
      { id: 'inv_fuel_vehicles', label: 'Natural Gas, Diesel, Vehicles' },
      { id: 'inv_steam_boiler', label: 'Boiler & Generator' },
      { id: 'inv_water_withdrawal', label: 'Water Withdrawal' },
      { id: 'inv_wastewater_etp', label: 'Wastewater & ETP' },
      { id: 'inv_solid_waste', label: 'Waste Management' },
      { id: 'inv_air_emission', label: 'Air Emission & Stack Monitoring' },
      { id: 'inv_refrigerant', label: 'Refrigerant & ODS' },
      { id: 'inv_chemical', label: 'Chemical Inventory & ZDHC' },
      { id: 'inv_transport', label: 'Employee Commuting & Logistics' },
      { id: 'inv_ghg_summary', label: 'GHG Emission Summary (Scope 1, 2, 3)' },
    ],
  },

      
       {
    id: 'kpi_mgmt',
    label: 'KPI Management',
    icon: TrendingUp,
    subModules: [
      { id: 'kpi_normalized', label: 'Normalized' },
      { id: 'kpi_absolute', label: 'Absolute' },
    ],
  },
  {
    id: 'baseline_target',
    label: 'Baseline, Target, Evaluation',
    icon: Target,
    subModules: [
      { id: 'bte_normalized', label: 'Normalized' },
      { id: 'bte_absolute', label: 'Absolute' },
    ],
  },
  {
    id: 'long_term_strategy',
    label: 'Long Term Strategy',
    icon: Target,
    subModules: [{ id: 'lts_main', label: 'Strategy Overview' }],
  },
  {
    id: 'license_permit',
    label: 'License & Permit Tracking',
    icon: FileCheck,
    subModules: [
      { id: 'lp_social', label: 'Social Compliance' },
      { id: 'lp_environment', label: 'Environment Compliance' },
    ],
  },
  {
    id: 'legal_requirement',
    label: 'Legal Requirement Monitoring',
    icon: Scale,
    subModules: [{ id: 'legal_main', label: 'Legal Register' }],
  },
  {
    id: 'sustainability_summary',
    label: 'Sustainability Summary',
    icon: TrendingUp,
    subModules: [{ id: 'sus_summary_main', label: 'Executive Dashboard' }],
  },
  {
    id: 'mcd_data_management',
    label: 'MCD Data Management',
    icon: Globe,
    subModules: [
      { id: 'mcd_fabrics', label: 'Fabrics Data' },
      { id: 'mcd_accessories', label: 'Accessories Data' },
    ],
  },
  {
    id: 'human_resource',
    label: 'Human Resource',
    icon: Users,
    subModules: [
      { id: 'hr_total_manpower', label: 'Total Manpower' },
      { id: 'hr_work_station', label: 'Work Station' },
      { id: 'hr_summary', label: 'Summary' },
      { id: 'hr_gate_pass', label: 'Gate pass Report' },
    ],
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: FolderOpen,
    subModules: [
      { id: 'doc_hr', label: 'HR' },
      { id: 'doc_admin', label: 'Admin' },
      { id: 'doc_social', label: 'Social' },
      { id: 'doc_environment', label: 'Environment' },
      { id: 'doc_fire_safety', label: 'Fire, Health & Safety' },
    ],
  },
     

];

const MODULE_PERMISSION_OPTIONS = [
  ...MODULES.flatMap(module => [
    { id: module.id, label: module.label },
    ...module.subModules.map(subModule => ({ id: subModule.id, label: `${module.label} / ${subModule.label}` })),
  ]),
  { id: 'excel_export', label: 'Custom Excel Export' },
  { id: 'settings', label: 'Settings' },
];

// Icons for the Quick-Launch Inventory cards
const INVENTORY_ICONS: Record<string, any> = {
  inv_production_operations: Factory,
  inv_electricity_solar: Sun,
  inv_fuel_vehicles: Fuel,
  inv_steam_boiler: Cog,
  inv_water_withdrawal: Droplets,
  inv_wastewater_etp: Waves,
  inv_solid_waste: Recycle,
  inv_air_emission: Wind,
  inv_refrigerant: Snowflake,
  inv_chemical: FlaskConical,
  inv_transport: Truck,
  inv_ghg_summary: Cloud,
};

// ============================================================
// HELPERS
// ============================================================
const n = (v: any): number => { const x = parseFloat(v); return isNaN(x) ? 0 : x; };
const fmt = (v: number, d = 2): string => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

const safeParse = (s: string | null): any => { if (!s) return null; try { return JSON.parse(s); } catch { return null; } };
const ssGet = (k: string): string | null => { try { return sessionStorage.getItem(k); } catch { return null; } };
const ssSet = (k: string, v: string) => { try { sessionStorage.setItem(k, v); } catch {} };

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

// ---------- localStorage readers for Dashboard KPIs ----------
// Normalises many possible stored shapes ({rows:{Jan:{}}}, [{}], {Jan:{}}, {...flat}) into an array of row objects.
const extractRows = (d: any): any[] => {
  if (!d) return [];
  if (Array.isArray(d)) return d.filter(x => x && typeof x === 'object');
  if (typeof d === 'object') {
    if (d.rows) return extractRows(d.rows);
    if (d.data) return extractRows(d.data);
    const vals = Object.values(d).filter(v => v && typeof v === 'object' && !Array.isArray(v));
    if (vals.length) return vals as any[];
    return [d];
  }
  return [];
};

// Looks for `{prefix}_{unit}_{year}` (and a few sibling patterns) in localStorage.
// If your modules save under a different key, add the pattern to `candidates` below.
const readStoredModule = (prefix: string, unit: string, year: string | number): any[] => {
  const candidates = [
    `${prefix}_${unit}_${year}`,
    `${prefix}_${year}_${unit}`,
    `${prefix}:${unit}_${year}`,
    `${unit}_${year}_${prefix}`,
    `${prefix}_${unit}_${year}_data`,
  ];
  try {
    for (const k of candidates) {
      const rows = extractRows(safeParse(localStorage.getItem(k)));
      if (rows.length) return rows;
    }
    const g = safeParse(localStorage.getItem(`${unit}_${year}`));
    if (g && typeof g === 'object' && g[prefix]) {
      const rows = extractRows(g[prefix]);
      if (rows.length) return rows;
    }
  } catch {}
  return [];
};

const sumFields = (rows: any[], include: RegExp, exclude?: RegExp): number =>
  rows.reduce((s, r) => s + Object.keys(r || {}).reduce(
    (a, k) => (include.test(k) && !(exclude && exclude.test(k)) ? a + n(r[k]) : a), 0), 0);

// ---------- Dashboard KPI catalogue ----------
interface KpiOption { id: string; label: string; unit: string; icon: any; accent: string; iconBg: string; decimals: number; }
const KPI_OPTIONS: KpiOption[] = [
  { id: 'electricity', label: 'Total Purchased Electricity', unit: 'kWh', icon: Zap, accent: 'border-amber-300', iconBg: 'bg-amber-50 text-amber-600', decimals: 2 },
  { id: 'ghg', label: 'Total GHG Footprint', unit: 'Ton CO₂e', icon: Cloud, accent: 'border-slate-300', iconBg: 'bg-slate-100 text-slate-600', decimals: 2 },
  { id: 'water', label: 'Total Water Withdrawal', unit: 'm³', icon: Droplets, accent: 'border-sky-300', iconBg: 'bg-sky-50 text-sky-600', decimals: 2 },
  { id: 'recycling', label: 'Waste Recycling Rate', unit: '%', icon: Recycle, accent: 'border-emerald-300', iconBg: 'bg-emerald-50 text-emerald-600', decimals: 2 },
  { id: 'diesel', label: 'Total Diesel Consumption', unit: 'L', icon: Fuel, accent: 'border-orange-300', iconBg: 'bg-orange-50 text-orange-600', decimals: 2 },
  { id: 'natural_gas', label: 'Total Natural Gas', unit: 'm³', icon: Flame, accent: 'border-rose-300', iconBg: 'bg-rose-50 text-rose-600', decimals: 2 },
  { id: 'energy_mj', label: 'Total Energy Consumption', unit: 'MJ', icon: BarChart3, accent: 'border-violet-300', iconBg: 'bg-violet-50 text-violet-600', decimals: 2 },
  { id: 'production', label: 'Total Production Quantity', unit: 'pcs', icon: Boxes, accent: 'border-teal-300', iconBg: 'bg-teal-50 text-teal-600', decimals: 2 },
];
const DEFAULT_KPI_SELECTION = ['electricity', 'ghg', 'water', 'recycling'];

// ---------- Unit status strip (Higg FEM 4.0 / SBTi / GRI) ----------
interface UnitStatus { higg_fem: string; sbti: string; gri: string; }
const HIGG_OPTIONS = ['Not Started', 'In Progress', 'Self-Assessment Submitted', 'Verified'];
const SBTI_OPTIONS = ['Not Committed', 'Committed', 'Targets Submitted', 'Targets Validated'];
const GRI_OPTIONS = ['Not Reported', 'Reporting With Reference', 'Reporting In Accordance'];
const DEFAULT_STATUS: UnitStatus = { higg_fem: HIGG_OPTIONS[0], sbti: SBTI_OPTIONS[0], gri: GRI_OPTIONS[0] };
const statusTone = (opts: string[], v: string) => {
  const i = opts.indexOf(v);
  if (i <= 0) return 'bg-gray-100 text-gray-600 border-gray-200';
  if (i === opts.length - 1) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  return 'bg-amber-100 text-amber-700 border-amber-200';
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
// EXECUTIVE HOME DASHBOARD
// ============================================================
interface DashboardHomeProps {
  unit: string;
  year: number;
  kpiValues: Record<string, number>;
  kpiSelection: string[];
  onKpiSlotChange: (slot: number, id: string) => void;
  onLaunch: (subModuleId: string) => void;
  canLaunch: (moduleId: string) => boolean;
  status: UnitStatus;
  onStatusChange: (key: keyof UnitStatus, value: string) => void;
  canEdit: boolean;
}

const DashboardHome: React.FC<DashboardHomeProps> = ({
  unit, year, kpiValues, kpiSelection, onKpiSlotChange, onLaunch, canLaunch, status, onStatusChange, canEdit
}) => {
  const [customOpen, setCustomOpen] = useState(false);
  const [logoOk, setLogoOk] = useState(true);
  let brandLogo = '/epyllion-logo.png';
  try { brandLogo = localStorage.getItem('corporate_brand_logo') || '/epyllion-logo.png'; } catch {}

  const inventory = MODULES.find(m => m.id === 'inventory_mgmt');

  const statusItems: { key: keyof UnitStatus; title: string; opts: string[] }[] = [
    { key: 'higg_fem', title: 'Higg FEM 4.0', opts: HIGG_OPTIONS },
    { key: 'sbti', title: 'SBTi', opts: SBTI_OPTIONS },
    { key: 'gri', title: 'GRI Reporting', opts: GRI_OPTIONS },
  ];

  return (
    <div className="space-y-6">
      {/* HERO CORPORATE BANNER */}
      <section className="rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 text-white p-5 sm:p-7 shadow-lg relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-white/10" />
        <div className="absolute right-24 -bottom-16 w-48 h-48 rounded-full bg-white/5" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="shrink-0 bg-white rounded-xl p-3 shadow-md w-36 h-20 flex items-center justify-center">
            {logoOk ? (
              <img src={brandLogo} alt="Epyllion Group" className="max-h-full max-w-full object-contain" onError={() => setLogoOk(false)} />
            ) : (
              <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-sm"><Leaf size={18} /> Epyllion</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold leading-tight">Epyllion Sustainability &amp; ESG Portal</h2>
            <p className="text-xs sm:text-sm text-emerald-50/90 mt-1">Centralized Environmental Inventory, Compliance &amp; Sustainability Data Centre</p>
            <div className="mt-3 inline-flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/25 text-[11px] font-semibold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-200"></span>
                </span>
                <Building2 size={12} /> {unit} - {UNIT_DIRECTORY[unit] || unit}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/25 text-[11px] font-semibold">
                <Clock size={12} /> FY {year}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE KPI GRID */}
      <section>
        <div className="flex items-center justify-between mb-3 relative">
          <div>
            <h3 className="text-sm font-bold text-gray-800">Live Key Performance Indicators</h3>
            <p className="text-[11px] text-gray-500">Auto-synced from saved data for {unit} • FY {year}</p>
          </div>
          <div className="relative">
            <button onClick={() => setCustomOpen(o => !o)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-emerald-50 text-xs font-semibold text-gray-700 shadow-sm">
              <SlidersHorizontal size={13} /> Customize 4 Cards <ChevronDown size={13} />
            </button>
            {customOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-20 p-3 space-y-2">
                <p className="text-[11px] text-gray-500">Choose the metric shown in each card slot.</p>
                {kpiSelection.map((sel, slot) => (
                  <div key={slot}>
                    <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Card {slot + 1}</label>
                    <select value={sel} onChange={e => onKpiSlotChange(slot, e.target.value)}
                      className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400">
                      {KPI_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label} ({o.unit})</option>)}
                    </select>
                  </div>
                ))}
                <button onClick={() => setCustomOpen(false)} className="w-full mt-1 px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center justify-center gap-1">
                  <Check size={13} /> Done
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {kpiSelection.map((id, i) => {
            const opt = KPI_OPTIONS.find(o => o.id === id) || KPI_OPTIONS[0];
            const Icon = opt.icon;
            return (
              <div key={`${id}-${i}`} className={`bg-white rounded-xl border-l-4 ${opt.accent} border-y border-r border-gray-200 shadow-sm p-4 flex items-start gap-3`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${opt.iconBg}`}><Icon size={20} /></div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-gray-500 leading-tight">{opt.label}</p>
                  <p className="text-xl font-bold text-gray-800 mt-1 truncate">{fmt(kpiValues[opt.id] || 0, opt.decimals)}</p>
                  <p className="text-[10px] text-gray-400 font-medium">{opt.unit}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* QUICK-LAUNCH INVENTORY CARDS */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <LayoutGrid size={15} className="text-emerald-600" />
          <h3 className="text-sm font-bold text-gray-800">Quick-Launch Inventory Modules</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {(inventory?.subModules || []).filter(sub => canLaunch(sub.id)).map(sub => {
            const Icon = INVENTORY_ICONS[sub.id] || ClipboardList;
            return (
              <button key={sub.id} onClick={() => onLaunch(sub.id)}
                className="group text-left bg-white rounded-xl border border-gray-200 hover:border-emerald-300 hover:shadow-md transition-all p-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
                  <Icon size={17} />
                </div>
                <span className="text-xs font-semibold text-gray-700 leading-snug flex-1">{sub.label}</span>
                <ChevronRight size={14} className="text-gray-300 group-hover:text-emerald-500" />
              </button>
            );
          })}
        </div>
      </section>

      {/* HIGG FEM / SBTi / GRI STATUS STRIP */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Shield size={15} className="text-emerald-600" />
          <h3 className="text-sm font-bold text-gray-800">Framework Status • {unit} • FY {year}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {statusItems.map(item => {
            const value = status[item.key];
            return (
              <div key={item.key} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{item.title}</p>
                {canEdit ? (
                  <select value={value} onChange={e => onStatusChange(item.key, e.target.value)}
                    className={`mt-2 w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border focus:outline-none ${statusTone(item.opts, value)}`}>
                    {item.opts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <span className={`mt-2 inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${statusTone(item.opts, value)}`}>{value}</span>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

// ============================================================
// MAIN APP
// ============================================================
const App: React.FC = () => {
  const [user, setUser] = useState<UserRecord | null>(null);
  const [bootLoading, setBootLoading] = useState(true);
  const [bootError, setBootError] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [factors, setFactors] = useState<EmissionFactors>(DEFAULT_FACTORS);

  // Unit & Year persisted in sessionStorage so a browser refresh never resets them
  const [factory, setFactory] = useState<string>(() => {
    const v = ssGet('selectedUnit');
    return v && FACTORIES.includes(v) ? v : 'EKWL';
  });
  const [year, setYear] = useState<number>(() => {
    const v = parseInt(ssGet('selectedYear') || '', 10);
    if (YEARS.includes(v)) return v;
    const cy = new Date().getFullYear();
    return YEARS.includes(cy) ? cy : 2026;
  });
  useEffect(() => { ssSet('selectedUnit', factory); }, [factory]);
  useEffect(() => { ssSet('selectedYear', String(year)); }, [year]);

  const [currentTheme, setCurrentTheme] = useState<ThemeKey>(() => {
    return (localStorage.getItem('portal_theme') as ThemeKey) || 'emerald';
  });
  const themeConfig = THEMES.find(t => t.id === currentTheme) || THEMES[0];
  
  // Home Dashboard is the landing page; accordions start collapsed
  const [activeModule, setActiveModule] = useState<string>('dashboard');
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => typeof window === 'undefined' ? true : window.innerWidth >= 768);

  const [energyRows, setEnergyRows] = useState<EnergyRow[]>([]);
  const [prodRows, setProdRows] = useState<ProductionRow[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    const restoreSession = async () => {
      const sess = localStorage.getItem('sp_session');
      if (sess) {
        try {
          const savedUser = normalizeUser(JSON.parse(sess));
          if (!savedUser.id) throw new Error('Stored session is missing its user ID.');
          const latestUser = await restGet(`users/${savedUser.id}`);
          if (!latestUser) throw new Error('Account no longer exists.');
          const currentUser = normalizeUser(latestUser);
          setUser(currentUser);
          if (currentUser.status === 'approved') localStorage.setItem('sp_session', JSON.stringify(currentUser));
          else localStorage.removeItem('sp_session');
        } catch {
          localStorage.removeItem('sp_session');
          setBootError('Unable to verify your saved session. Please sign in again.');
        }
      }
      setBootLoading(false);
    };
    restoreSession();
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
    return isSuper ? [
      ...MODULES.flatMap(m => [m.id, ...m.subModules.map(s => s.id)]),
      'settings', 'excel_export',
    ] : user.allowedModules;
  }, [user, isSuper]);

  const userAllowedFactories = useMemo(() => {
    if (!user) return [];
    if (isSuper) return [...FACTORIES];
    return user.allowedUnits || [];
  }, [user, isSuper]);

  useEffect(() => {
    if (isSuper && !factory) setFactory(FACTORIES[0]);
    else if (!isSuper && !userAllowedFactories.includes(factory)) setFactory(userAllowedFactories[0] || '');
  }, [userAllowedFactories, factory, isSuper]);

  const canAccessModule = useCallback((moduleId: string) => {
    if (isSuper) return true;
    if (userAllowedModules.includes(moduleId)) return true;
    const parent = MODULES.find(m => m.subModules.some(s => s.id === moduleId));
    return Boolean(parent && userAllowedModules.includes(parent.id));
  }, [isSuper, userAllowedModules]);

  const hasUnitAccess = isSuper || userAllowedFactories.includes(factory);

  useEffect(() => {
    if (!user) return;
    if (activeModule === 'dashboard' || activeModule === 'user_management' && isSuper) return;
    if (!canAccessModule(activeModule)) {
      setActiveModule('dashboard');
    }
  }, [user, canAccessModule, activeModule, isSuper]);

  const loadData = useCallback(async () => {
    if (!user) return;
    if (!isSuper && !user.allowedUnits.includes(factory)) {
      setEnergyRows([]);
      setProdRows([]);
      setDataLoading(false);
      return;
    }
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
  }, [user, factory, year, isSuper]);

  useEffect(() => { loadData(); }, [loadData]);

  const saveEnergy = async () => {
    if (!canEdit || !hasUnitAccess) return;
    try {
      const existing = await restGet(`energy_data/${factory}_${year}`);
      const months = existing ? Object.keys(existing.rows || {}).filter(month => MONTHS.includes(month)) : [];
      if (existing && months.length === 0) months.push('the existing monthly records');
      if (months.length && !window.confirm(`An existing record for ${factory} • ${months.join(', ')} • ${year} will be overwritten. Continue?`)) return;
      const rowsObj: any = {};
      energyRows.forEach(r => { rowsObj[r.month] = r; });
      await restSet('energy_data', `${factory}_${year}`, { factory, year, rows: rowsObj });
      alert('Energy data saved.');
    } catch (e: any) { alert('Save failed: ' + e.message); }
  };
  const saveProd = async () => {
    if (!canEdit || !hasUnitAccess) return;
    try {
      const existing = await restGet(`production_data/${factory}_${year}`);
      const months = existing ? Object.keys(existing.rows || {}).filter(month => MONTHS.includes(month)) : [];
      if (existing && months.length === 0) months.push('the existing monthly records');
      if (months.length && !window.confirm(`An existing record for ${factory} • ${months.join(', ')} • ${year} will be overwritten. Continue?`)) return;
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

  const logout = () => { localStorage.removeItem('sp_session'); setUser(null); setBootError(''); setActiveModule('dashboard'); setExpandedModules([]); };

  const toggleExpand = (id: string) => {
    setExpandedModules(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const ghg = useMemo<any>(() => {
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

  // ---------- DASHBOARD: KPI selection (4 slots, persisted) ----------
  const [kpiSelection, setKpiSelection] = useState<string[]>(() => {
    const s = safeParse(localStorage.getItem('dashboard_kpi_selection'));
    if (Array.isArray(s) && s.length === 4 && new Set(s).size === 4 && s.every((x: any) => KPI_OPTIONS.some(o => o.id === x))) return s;
    return DEFAULT_KPI_SELECTION;
  });
  const changeKpiSlot = (slot: number, id: string) => {
    setKpiSelection(prev => {
      const next = [...prev];
      const existing = next.indexOf(id);
      if (existing >= 0 && existing !== slot) next[existing] = next[slot]; // swap so there are never duplicates
      next[slot] = id;
      try { localStorage.setItem('dashboard_kpi_selection', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // ---------- DASHBOARD: year-wise NCV factors from Settings ----------
  const [ncv, setNcv] = useState<EmissionFactors>(DEFAULT_NCV);
  useEffect(() => {
    let cancelled = false;
    const pick = (src: any): EmissionFactors | null => {
      if (!src || typeof src !== 'object') return null;
      const byYear = src[String(year)] || src[year];
      const o = byYear && typeof byYear === 'object' ? byYear : src;
      const out: EmissionFactors = { ...DEFAULT_NCV };
      let found = false;
      (Object.keys(DEFAULT_NCV) as (keyof EmissionFactors)[]).forEach(k => {
        if (n(o[k]) > 0) { out[k] = n(o[k]); found = true; }
      });
      return found ? out : null;
    };
    (async () => {
      const local = pick(safeParse(localStorage.getItem(`ncv_factors_${year}`))) || pick(safeParse(localStorage.getItem('ncv_factors')));
      if (local) { if (!cancelled) setNcv(local); return; }
      try {
        const remote = pick(await restGet('settings/ncv_factors'));
        if (!cancelled) setNcv(remote || DEFAULT_NCV);
      } catch { if (!cancelled) setNcv(DEFAULT_NCV); }
    })();
    return () => { cancelled = true; };
  }, [year]);

  // ---------- DASHBOARD: unit status strip (Higg FEM 4.0, SBTi, GRI) ----------
  const [unitStatus, setUnitStatus] = useState<UnitStatus>(DEFAULT_STATUS);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const local = safeParse(localStorage.getItem(`unit_status_${factory}_${year}`));
      if (local && typeof local === 'object') { if (!cancelled) setUnitStatus({ ...DEFAULT_STATUS, ...local }); return; }
      try {
        const remote = await restGet(`unit_status/${factory}_${year}`);
        if (!cancelled) setUnitStatus(remote ? {
          higg_fem: remote.higg_fem || DEFAULT_STATUS.higg_fem,
          sbti: remote.sbti || DEFAULT_STATUS.sbti,
          gri: remote.gri || DEFAULT_STATUS.gri,
        } : DEFAULT_STATUS);
      } catch { if (!cancelled) setUnitStatus(DEFAULT_STATUS); }
    })();
    return () => { cancelled = true; };
  }, [user, factory, year]);

  const changeUnitStatus = async (key: keyof UnitStatus, value: string) => {
    if (!canEdit) return;
    const next = { ...unitStatus, [key]: value };
    setUnitStatus(next);
    try { localStorage.setItem(`unit_status_${factory}_${year}`, JSON.stringify(next)); } catch {}
    try { await restSet('unit_status', `${factory}_${year}`, { factory, year, ...next }); } catch {}
  };

  // ---------- DASHBOARD: live KPI values ----------
  // Reads localStorage for {unit}_{year} first; falls back to Firestore-loaded rows; final fallback is 0.
 const kpiValues = useMemo<any>(() => {
    if (activeModule !== 'dashboard') return {};
    const u = factory, y = year;
    const lsElec = readStoredModule('inv_electricity_solar', u, y);
    const lsFuel = readStoredModule('inv_fuel_vehicles', u, y);
    const lsProd = readStoredModule('inv_production_operations', u, y);
    const lsWater = readStoredModule('inv_water_withdrawal', u, y);
    const lsWaste = readStoredModule('inv_solid_waste', u, y);

    const elecRows: any[] = lsElec.length ? lsElec : energyRows;
    const fuelRows: any[] = lsFuel.length ? lsFuel : energyRows;
    const prRows: any[] = lsProd.length ? lsProd : prodRows;

    const peKWh = elecRows.reduce((s, r) => s + rowTotalPE(r), 0);
    const solarKWh = elecRows.reduce((s, r) => s + n(r.solar_meter1_kwh) + n(r.solar_meter2_kwh), 0);
    const ngM3 = fuelRows.reduce((s, r) => s + rowTotalNG(r), 0);
    const dieselL = fuelRows.reduce((s, r) => s + rowTotalDiesel(r), 0);
    const vehDiesel = fuelRows.reduce((s, r) => s + n(r.vehicle_diesel_l), 0);
    const vehCNG = fuelRows.reduce((s, r) => s + n(r.vehicle_cng_m3), 0);
    const vehOctane = fuelRows.reduce((s, r) => s + n(r.vehicle_octane_l), 0);
    const pcs = prRows.reduce((s, r) => s + rowTotalProductionPcs(r), 0);

    const ghgKg = peKWh * factors.grid_electricity + ngM3 * factors.natural_gas + dieselL * factors.diesel
      + vehDiesel * factors.diesel + vehCNG * factors.cng + vehOctane * factors.petrol_octane;

    const energyMJ = (peKWh + solarKWh) * ncv.grid_electricity + ngM3 * ncv.natural_gas
      + (dieselL + vehDiesel) * ncv.diesel + vehCNG * ncv.cng + vehOctane * ncv.petrol_octane;

    // Water: prefer an explicit total field, otherwise sum the individual m³ source fields
    let water = sumFields(lsWater, /(total.*(m3|m³|withdraw))|(withdraw.*total)/i, /bdt|cost/i);
    if (!water) water = sumFields(lsWater, /(m3|m³|withdraw|ground|municipal|surface|rain)/i, /bdt|cost|total|month|recycl|reuse/i);

    // Waste recycling rate = recycled / total generated × 100
    const recycled = sumFields(lsWaste, /recycl|reuse/i, /bdt|cost|rate|percent|%/i);
    let generated = sumFields(lsWaste, /(total|generat)/i, /bdt|cost|rate|percent|recycl/i);
    if (!generated) generated = sumFields(lsWaste, /./, /bdt|cost|rate|percent|month|id|year/i);
    const recyclingRate = generated > 0 ? Math.min(100, (recycled / generated) * 100) : 0;

    return {
      electricity: peKWh,
      ghg: ghgKg / 1000,
      water,
      recycling: recyclingRate,
      diesel: dieselL,
      natural_gas: ngM3,
      energy_mj: energyMJ,
      production: pcs,
    };
  }, [activeModule, factory, year, energyRows, prodRows, factors, ncv]);

  const launchInventory = (subId: string) => {
    if (!canAccessModule(subId)) return;
    setExpandedModules(prev => prev.includes('inventory_mgmt') ? prev : [...prev, 'inventory_mgmt']);
    setActiveModule(subId);
  };

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
  const [newUser, setNewUser] = useState<Omit<UserRecord,'id'>>({
    email: '', password: '', full_name: '', role: 'viewer', status: 'approved', allowedModules: [], allowedUnits: [],
  });
  const [backupLoading, setBackupLoading] = useState(false);

  const loadUsers = async () => {
    setUserLoading(true);
    try { const list = await restList('users'); setAllUsers(list.map(normalizeUser)); }
    catch (e: any) { alert('Failed to load users: ' + e.message); }
    finally { setUserLoading(false); }
  };
  useEffect(() => { if (activeModule === 'user_management' && isSuper) loadUsers(); }, [activeModule, isSuper]);

  const addNewUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.full_name) { alert('Fill all fields'); return; }
    try {
      await restCreate('users', { ...newUser, email: newUser.email.trim().toLowerCase() });
      setNewUserOpen(false);
      setNewUser({ email: '', password: '', full_name: '', role: 'viewer', status: 'approved', allowedModules: [], allowedUnits: [] });
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
  const setUserApproval = async (target: UserRecord, status: UserStatus) => {
    if (!target.id || target.role === 'super_admin' && status !== 'approved') return;
    try {
      await restPatch('users', target.id, { status });
      await loadUsers();
    } catch (e: any) { alert(`Failed to ${status === 'approved' ? 'approve' : 'reject'} user: ` + e.message); }
  };
  const downloadDatabaseBackup = async () => {
    setBackupLoading(true);
    try {
      const documents = await restExportAllDocuments();
      const csv = buildCSV(
        ['Collection', 'Document ID', 'Data (JSON)'],
        documents.map(document => [
          document.collection,
          document.id,
          JSON.stringify(document.data, (key, value) => key.toLowerCase() === 'password' ? '[REDACTED]' : value),
        ]),
      );
      const today = new Date();
      const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      downloadCSV(`firestore-full-backup-${date}.csv`, csv);
    } catch (e: any) {
      alert('Database backup failed: ' + e.message);
    } finally {
      setBackupLoading(false);
    }
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
  if (!user) return <LoginScreen onLogin={setUser} initialError={bootError} />;
  if (user.status !== 'approved') return <ApprovalStatusScreen status={user.status} onLogout={logout} />;

  return (
    <div className={`h-screen flex flex-col transition-colors duration-300 ${themeConfig.pageBg}`}>
      {/* HEADER */}
      <header className={`${themeConfig.headerBg} ${themeConfig.sidebarText} border-b shrink-0 z-40 transition-colors duration-300`}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 hover:text-emerald-600"><Menu size={20} /></button>
            <button onClick={() => setActiveModule('dashboard')} className="flex items-center gap-2 text-left" title="Home Dashboard">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-sm">
                <Leaf className="text-white" size={18} />
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-800 leading-tight">Sustainability</h1>
                <p className="text-[10px] text-emerald-600 font-medium">Portal</p>
              </div>
            </button>
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
            {/* Dynamic logged-in user badge (name + role from auth state) */}
            <div className="flex flex-col items-end max-w-[120px] sm:max-w-none">
              <span className="text-xs font-semibold text-gray-800 truncate max-w-full">{user.full_name}</span>
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

      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* SIDEBAR */}
        {sidebarOpen && (
          <aside className={`w-64 shrink-0 ${themeConfig.sidebarBg} ${themeConfig.sidebarText} border-r flex-col h-full overflow-y-auto hidden md:flex transition-colors duration-300`}>
            <nav className="p-3 space-y-1 flex-1">
              {/* HOME DASHBOARD */}
              <button onClick={() => setActiveModule('dashboard')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                  activeModule === 'dashboard' ? 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200' : 'text-gray-600 hover:bg-gray-50'
                }`}>
                <Home size={16} className={activeModule === 'dashboard' ? 'text-emerald-600' : 'text-gray-400'} />
                <span className="flex-1">Dashboard</span>
              </button>
              {MODULES.filter(m => isSuper || userAllowedModules.includes(m.id) || m.subModules.some(s => canAccessModule(s.id))).map(m => {
                const Icon = m.icon;
                const isExpanded = expandedModules.includes(m.id);
                const visibleSubModules = m.subModules.filter(sub => canAccessModule(sub.id));
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
                        {visibleSubModules.map(sub => {
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
              {canAccessModule('excel_export') && <button onClick={() => setActiveModule('excel_export')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm ${activeModule === 'excel_export' ? 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200' : 'text-gray-600 hover:bg-gray-50'}`}>
                <FileSpreadsheet size={16} /><span className="flex-1">Custom Excel Export</span>
              </button>}
              {isSuper && (
                <button onClick={() => setActiveModule('user_management')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm ${activeModule === 'user_management' ? 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200' : 'text-gray-600 hover:bg-gray-50'}`}>
                  <Users size={16} /><span className="flex-1">User Management</span>
                </button>
              )}
              {canAccessModule('settings') && <button onClick={() => setActiveModule('settings')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm ${activeModule === 'settings' ? 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Settings size={16} /><span className="flex-1">Settings</span>
              </button>}
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
                <button onClick={() => { setActiveModule('dashboard'); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm ${
                    activeModule === 'dashboard' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'
                  }`}>
                  <Home size={16} className={activeModule === 'dashboard' ? 'text-emerald-600' : 'text-gray-400'} /><span>Dashboard</span>
                </button>
                {MODULES.filter(m => isSuper || userAllowedModules.includes(m.id) || m.subModules.some(s => canAccessModule(s.id))).map(m => {
                  const Icon = m.icon;
                  const isExpanded = expandedModules.includes(m.id);
                  const visibleSubModules = m.subModules.filter(sub => canAccessModule(sub.id));
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
                          {visibleSubModules.map(sub => {
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
                {canAccessModule('excel_export') && <button onClick={() => { setActiveModule('excel_export'); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm ${activeModule === 'excel_export' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
                  <FileSpreadsheet size={16} /><span>Custom Excel Export</span>
                </button>}
                {isSuper && (
                  <button onClick={() => { setActiveModule('user_management'); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm ${activeModule === 'user_management' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
                    <Users size={16} /><span>User Management</span>
                  </button>
                )}
                {canAccessModule('settings') && <button onClick={() => { setActiveModule('settings'); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm ${activeModule === 'settings' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
                  <Settings size={16} /><span>Settings</span>
                </button>}
              </div>
            </div>
          </div>
        )}

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 overflow-y-auto">
          {!hasUnitAccess ? (
            <div className="max-w-xl mx-auto mt-12 rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
              <h2 className="text-lg font-bold text-amber-900">No Units Assigned</h2>
              <p className="mt-2 text-sm text-amber-800">An administrator must assign one or more units to your account before you can view portal data.</p>
            </div>
          ) : !canAccessModule(activeModule) && activeModule !== 'dashboard' ? (
            <div className="max-w-xl mx-auto mt-12 rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
              <h2 className="text-lg font-bold text-amber-900">Module Not Assigned</h2>
              <p className="mt-2 text-sm text-amber-800">An administrator must grant access to this module.</p>
            </div>
          ) : <>
          {activeModule === 'dashboard' ? (
            <DashboardHome
              unit={factory}
              year={year}
              kpiValues={kpiValues}
              kpiSelection={kpiSelection}
              onKpiSlotChange={changeKpiSlot}
              onLaunch={launchInventory}
              canLaunch={canAccessModule}
              status={unitStatus}
              onStatusChange={changeUnitStatus}
              canEdit={canEdit}
            />
          ) : (
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
          )}

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
                <div className="flex flex-wrap justify-end gap-2">
                  <button onClick={downloadDatabaseBackup} disabled={backupLoading} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-xs font-semibold">
                    <FileSpreadsheet size={14} /> {backupLoading ? 'Preparing Backup...' : 'Download Full Database Backup (CSV/Excel)'}
                  </button>
                  <button onClick={() => setNewUserOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold">
                    <Plus size={14} /> Add User
                  </button>
                </div>
              </div>
              {userLoading ? (
                <div className="p-4 text-xs text-emerald-600">Loading users...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-emerald-50/60 text-emerald-800">
                        <th className="px-3 py-2 text-left font-semibold">Name</th>
                        <th className="px-3 py-2 text-left font-semibold">Email</th>
                        <th className="px-3 py-2 text-left font-semibold">Role</th>
                        <th className="px-3 py-2 text-left font-semibold">Status</th>
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
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${u.role === 'super_admin' ? 'bg-emerald-100 text-emerald-700' : u.role === 'editor' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${u.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : u.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                              {u.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-[10px] text-gray-500">{u.allowedModules.length} modules</td>
                          <td className="px-3 py-2 text-[10px] text-gray-500">{u.allowedUnits.length} units</td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            {u.status !== 'approved' && <button onClick={() => setUserApproval(u, 'approved')} className="text-emerald-600 hover:underline text-[11px] mr-2">Approve</button>}
                            {u.status !== 'rejected' && u.role !== 'super_admin' && <button onClick={() => setUserApproval(u, 'rejected')} className="text-red-600 hover:underline text-[11px] mr-2">Reject</button>}
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

                                    {activeModule.startsWith('kpi_') && (
            <KpiManagement
              activeSubModule={activeModule}
              selectedUnit={factory}
              unitFullName={UNIT_FULL_NAMES[factory] || factory}
              selectedYear={year.toString()}
              userRole={user?.role || 'viewer'}
            />
          )}

          {activeModule.startsWith('bte_') && (
                         <BaselineTargetEvaluation
                activeSubModule={activeModule}
                selectedUnit={factory}
                unitFullName={UNIT_FULL_NAMES[factory] || factory}
                selectedYear={year.toString()}
                userRole={user?.role || 'viewer'}
              />
          )}

          {activeModule === 'lts_main' && (
                         <LongTermStrategy
                selectedUnit={factory}
                unitFullName={UNIT_FULL_NAMES[factory] || factory}
                selectedYear={year.toString()}
                userRole={user?.role || 'viewer'}
              />
          )}

          {activeModule.startsWith('lp_') && (
                          <LicensePermitTracking
                activeSubModule={activeModule}
                selectedUnit={factory}
                unitFullName={UNIT_FULL_NAMES[factory] || factory}
                selectedYear={year.toString()}
                userRole={user?.role || 'viewer'}
              />
          )}

          {activeModule === 'legal_main' && (
                          <LegalRequirementMonitoring
                selectedUnit={factory}
                unitFullName={UNIT_FULL_NAMES[factory] || factory}
                selectedYear={year.toString()}
                userRole={user?.role || 'viewer'}
              />
          )}

          {activeModule === 'sus_summary_main' && (
                         <SustainabilitySummary
                selectedUnit={factory}
                unitFullName={UNIT_FULL_NAMES[factory] || factory}
                selectedYear={year.toString()}
                userRole={user?.role || 'viewer'}
              />
          )}

          {activeModule.startsWith('mcd_') && (
                          <McdDataManagement
                activeSubModule={activeModule}
                selectedUnit={factory}
                unitFullName={UNIT_FULL_NAMES[factory] || factory}
                selectedYear={year.toString()}
                userRole={user?.role || 'viewer'}
              />
          )}

          {activeModule.startsWith('hr_') && (
            <HumanResource
              activeSubModule={activeModule}
              selectedUnit={factory}
              unitFullName={UNIT_FULL_NAMES[factory] || factory}
              selectedYear={year.toString()}
              userRole={user?.role || 'viewer'}
            />
          )}

          {activeModule.startsWith('doc_') && (
                         <DocumentsModule
                activeSubModule={activeModule}
                selectedUnit={factory}
                unitFullName={UNIT_FULL_NAMES[factory] || factory}
                selectedYear={year.toString()}
                userRole={user?.role || 'viewer'}
              />
          )}

          {activeModule === 'excel_export' && (
            <CustomExcelExport
              selectedUnit={factory}
              selectedYear={year.toString()}
              userRole={user?.role || 'viewer'}
              allowedUnits={userAllowedFactories}
              restGet={restGet}
            />
          )}

                  {activeModule.startsWith('fp_') && (
            <FactoryProfile
              activeSubModule={activeModule}
              selectedUnit={factory}
              unitFullName={UNIT_FULL_NAMES[factory] || factory}
              userRole={user?.role || 'viewer'}
              restGet={restGet}
              restSet={restSet as any}
              
            />
          )}


          {activeModule.startsWith('inv_') && (
            <InventoryManagement
              activeSubModule={activeModule}
              selectedUnit={factory}
              selectedYear={year.toString()}
              userRole={user?.role || 'viewer'}
              restGet={restGet}
              restSet={restSet}
            />
          )}

          {activeModule === 'settings' && (
            <SettingsPanel
              currentThemeId={localStorage.getItem('portal_theme') || 'emerald'}
              onThemeChange={(newTheme: any) => {
                const id = typeof newTheme === 'string' ? newTheme : newTheme.id;
                localStorage.setItem('portal_theme', id);
                window.location.reload();
              }}
              userRole={user?.role || 'viewer'}
              restGet={restGet}
            />
          )}
          </>}
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
                  <option value="editor">editor</option>
                  <option value="viewer">viewer</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Modules</label>
                <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto">
                  {MODULE_PERMISSION_OPTIONS.map(option => (
                    <label key={option.id} className="flex items-center gap-2 text-[11px]">
                      <input type="checkbox" checked={editingUser.allowedModules.includes(option.id)}
                        onChange={e => setEditingUser({ ...editingUser, allowedModules: e.target.checked ? [...editingUser.allowedModules, option.id] : editingUser.allowedModules.filter(x => x !== option.id) })} />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Units</label>
                <div className="grid grid-cols-3 gap-1">
                  {FACTORIES.map(f => (
                    <label key={f} className="flex items-center gap-2 text-[11px]">
                      <input type="checkbox" checked={editingUser.allowedUnits.includes(f)}
                        onChange={e => setEditingUser({ ...editingUser, allowedUnits: e.target.checked ? [...editingUser.allowedUnits, f] : editingUser.allowedUnits.filter(x => x !== f) })} />
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
                  <option value="editor">editor</option>
                  <option value="viewer">viewer</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Modules</label>
                <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto">
                  {MODULE_PERMISSION_OPTIONS.map(option => (
                    <label key={option.id} className="flex items-center gap-2 text-[11px]">
                      <input type="checkbox" checked={newUser.allowedModules.includes(option.id)}
                        onChange={e => setNewUser({ ...newUser, allowedModules: e.target.checked ? [...newUser.allowedModules, option.id] : newUser.allowedModules.filter(x => x !== option.id) })} />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Units</label>
                <div className="grid grid-cols-3 gap-1">
                  {FACTORIES.map(f => (
                    <label key={f} className="flex items-center gap-2 text-[11px]">
                      <input type="checkbox" checked={newUser.allowedUnits.includes(f)}
                        onChange={e => setNewUser({ ...newUser, allowedUnits: e.target.checked ? [...newUser.allowedUnits, f] : newUser.allowedUnits.filter(x => x !== f) })} />
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

      {/* PERMANENT DEVELOPER CREDIT & SUPPORT FOOTER */}
      <footer className="shrink-0 text-center text-[11px] text-gray-400 py-3 border-t border-gray-100 bg-white">
        © 2026 Sustainability Portal • Designed &amp; Developed by Md. Mahfuj Rahman Rasel | Support: +880 1705-472581
      </footer>
    </div>
  );
};

// ============================================================
// LOGIN SCREEN
// ============================================================
const ApprovalStatusScreen: React.FC<{ status: UserStatus; onLogout: () => void }> = ({ status, onLogout }) => (
  <div className="min-h-screen flex items-center justify-center bg-emerald-50 px-4">
    <div className="w-full max-w-md rounded-2xl border border-emerald-100 bg-white p-8 text-center shadow-xl">
      <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
        {status === 'pending' ? <Clock size={26} /> : <AlertCircle size={26} />}
      </div>
      <h1 className="text-xl font-bold text-gray-800">
        {status === 'pending' ? 'Waiting for Admin Approval' : 'Account Not Approved'}
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        {status === 'pending'
          ? 'Your account is pending review. You will be able to access the portal after a Super Admin approves your account.'
          : 'Your account was rejected. Please contact a Super Admin for assistance.'}
      </p>
      <button onClick={onLogout} className="mt-6 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
        Return to Sign In
      </button>
    </div>
  </div>
);

const LoginScreen: React.FC<{ onLogin: (u: UserRecord) => void; initialError?: string }> = ({ onLogin, initialError }) => {
  const [mode, setMode] = useState<'signin'|'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError || '');

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
      const u = normalizeUser(matches[0]);
      if (u.status === 'rejected') { setError('Your account has been rejected. Please contact an administrator.'); return; }
      if (u.status === 'approved') localStorage.setItem('sp_session', JSON.stringify(u));
      onLogin(u);
    } catch (e: any) { setError(e.message || 'Sign in failed.'); }
    finally { setLoading(false); }
  };

  const handleSignup = async () => {
    setError('');
    if (!email || !password || !fullName) { setError('All fields are required.'); return; }
    setLoading(true);
    try {
      const newUser: Omit<UserRecord,'id'> = {
        email: email.trim().toLowerCase(),
        password,
        full_name: fullName.trim(),
        role: 'viewer',
        status: 'pending',
        allowedModules: [],
        allowedUnits: [],
      };
      const newId = await restCreate('users', newUser);
      const u: UserRecord = { id: newId, ...newUser };
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
              <Shield size={12} className="inline mr-1" />New accounts require administrator approval before access.
            </div>
          </div>
        </div>
      </div>
      <footer className="text-center text-[11px] text-gray-400 py-5 border-t border-gray-100">
        © 2026 Sustainability Portal • Designed &amp; Developed by Md. Mahfuj Rahman Rasel | Support: +880 1705-472581
      </footer>
    </div>
  );
};

export default App;
