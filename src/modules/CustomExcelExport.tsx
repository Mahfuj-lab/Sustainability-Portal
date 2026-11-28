import React, { useMemo, useState } from 'react';
import { UNIT_DIRECTORY } from '../utils/unitDirectory';

export interface CustomExcelExportProps {
  selectedUnit?: string;
  selectedYear?: string;
  userRole?: string;
  allowedUnits?: string[];
  restGet?: (...args: any[]) => Promise<any>;
  [key: string]: any;
}

interface UnitInfo {
  code: string;
  name?: string;
  fullName?: string;
  address?: string;
  [key: string]: any;
}

interface TemplateDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  modules: string[];
}

interface ModuleGroup {
  group: string;
  modules: string[];
}

const YEARS: string[] = ['2023', '2024', '2025', '2026', '2027'];

const TEMPLATES: TemplateDef[] = [
  {
    id: 'higg',
    name: 'Higg FEM 4.0 Full Pack',
    description: 'Complete Higg FEM 4.0 module set for buyer submission.',
    icon: '🌿',
    modules: [
      'Factory Profile',
      'Energy',
      'GHG',
      'Water',
      'Wastewater',
      'Waste',
      'Air Emission',
      'Chemical',
    ],
  },
  {
    id: 'sbti',
    name: 'SBTi GHG Inventory Pack',
    description: 'GHG inventory covering all Scope 1 & Scope 2 sources.',
    icon: '📊',
    modules: [
      'Production & Operations',
      'Electricity',
      'Natural Gas',
      'Diesel',
      'Furnace Oil',
      'CNG',
      'LPG',
      'Biomass',
      'Refrigerant',
      'GHG Summary',
    ],
  },
  {
    id: 'management',
    name: 'Monthly Management Summary',
    description: 'Concise monthly summary for management review.',
    icon: '📈',
    modules: [
      'Production & Operations',
      'KPI Normalized & Absolute',
      'Sustainability Summary',
    ],
  },
  {
    id: 'custom',
    name: 'Custom Selection',
    description: 'Manually pick the exact modules you need.',
    icon: '🛠️',
    modules: [],
  },
];

const MODULE_GROUPS: ModuleGroup[] = [
  {
    group: 'Factory Profile',
    modules: [
      'Factory Profile',
      'General Information',
      'Certifications',
      'Buyer List',
      'Workforce Profile',
    ],
  },
  {
    group: 'Inventory Management',
    modules: [
      'Production & Operations',
      'Electricity',
      'Natural Gas',
      'Diesel',
      'Furnace Oil',
      'CNG',
      'LPG',
      'Biomass',
      'Refrigerant',
      'Water',
      'Wastewater',
      'Waste',
    ],
  },
  {
    group: 'KPI Management',
    modules: ['KPI Normalized & Absolute'],
  },
  {
    group: 'Baseline, Target, Evaluation',
    modules: ['Baseline', 'Target', 'Evaluation'],
  },
  {
    group: 'Long Term Strategy',
    modules: ['Long Term Strategy'],
  },
  {
    group: 'License & Permit Tracking',
    modules: ['License & Permit Tracking'],
  },
  {
    group: 'Legal Requirement Monitoring',
    modules: ['Legal Requirement Monitoring'],
  },
  {
    group: 'MCD Data Management',
    modules: ['MCD Data Management'],
  },
];

const ALL_MODULES: string[] = Array.from(
  new Set(MODULE_GROUPS.flatMap((g) => g.modules).concat(TEMPLATES.flatMap((t) => t.modules)))
);

function resolveUnitInfo(code: string): UnitInfo {
  const directory = UNIT_DIRECTORY as unknown;
  if (Array.isArray(directory)) {
    const found = (directory as UnitInfo[]).find((u) => u && u.code === code);
    if (found) return found;
  } else if (directory && typeof directory === 'object') {
    const obj = directory as Record<string, UnitInfo>;
    if (obj[code]) return obj[code];
    const values = Object.values(obj);
    const found = values.find((u) => u && u.code === code);
    if (found) return found;
  }
  return { code };
}

function unitDisplayName(info: UnitInfo): string {
  return info.fullName || info.name || info.code;
}

function unitAddress(info: UnitInfo): string {
  return info.address || 'Bangladesh';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildModuleTable(moduleName: string, unitCode: string, year: string): string {
  const rows: string[] = [];
  for (let i = 1; i <= 5; i++) {
    rows.push(
      '<tr>' +
        '<td>' + escapeHtml(moduleName) + ' — Item ' + i + '</td>' +
        '<td>' + escapeHtml(unitCode) + '</td>' +
        '<td>' + escapeHtml(year) + '</td>' +
        '<td style="text-align:right">0</td>' +
        '<td style="text-align:right">0.00</td>' +
        '</tr>'
    );
  }
  return (
    '<table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;width:100%;margin-bottom:12px;">' +
    '<thead style="background:#065f46;color:#ffffff;">' +
    '<tr>' +
    '<th align="left">' + escapeHtml(moduleName) + '</th>' +
    '<th align="left">Unit</th>' +
    '<th align="left">Year</th>' +
    '<th align="right">Value</th>' +
    '<th align="right">CO₂e (t)</th>' +
    '</tr>' +
    '</thead>' +
    '<tbody>' + rows.join('') + '</tbody>' +
    '</table>'
  );
}

export default function CustomExcelExport({
  selectedUnit,
  selectedYear,
  userRole,
  allowedUnits,
  restGet,
}: CustomExcelExportProps) {
  const allUnitCodes: string[] = useMemo<string[]>(() => {
    const directory = UNIT_DIRECTORY as unknown;
    if (Array.isArray(directory)) {
      return (directory as UnitInfo[]).map((u) => u.code).filter(Boolean);
    }
    if (directory && typeof directory === 'object') {
      return Object.values(directory as Record<string, UnitInfo>)
        .map((u) => (u && u.code ? u.code : ''))
        .filter(Boolean);
    }
    return ['EKWL', 'DKL', 'DDL', 'EKWL-HW', 'ESL', 'ESL-Extention', 'EFL', 'EKL', 'EPL', 'EWL'];
  }, []);
  const unitCodes = allowedUnits ? allUnitCodes.filter((code) => allowedUnits.includes(code)) : allUnitCodes;

  const [activeTemplate, setActiveTemplate] = useState<string>('custom');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [units, setUnits] = useState<string[]>(selectedUnit ? [selectedUnit] : []);
  const [years, setYears] = useState<string[]>(selectedYear ? [selectedYear] : ['2025']);
  const [reportTitle, setReportTitle] = useState<string>('Corporate Sustainability Report');

  const canExport = selectedModules.length > 0 && units.length > 0 && years.length > 0;

  const handleSelectTemplate = (template: TemplateDef): void => {
    setActiveTemplate(template.id);
    if (template.id === 'custom') {
      setSelectedModules([]);
    } else {
      setSelectedModules(template.modules.slice());
    }
  };

  const toggleModule = (moduleName: string): void => {
    setSelectedModules((prev) =>
      prev.includes(moduleName) ? prev.filter((m) => m !== moduleName) : [...prev, moduleName]
    );
    setActiveTemplate('custom');
  };

  const toggleGroup = (group: ModuleGroup): void => {
    const allSelected = group.modules.every((m) => selectedModules.includes(m));
    setSelectedModules((prev) => {
      if (allSelected) {
        return prev.filter((m) => !group.modules.includes(m));
      }
      const next = new Set(prev);
      group.modules.forEach((m) => next.add(m));
      return Array.from(next);
    });
    setActiveTemplate('custom');
  };

  const toggleUnit = (code: string): void => {
    setUnits((prev) => (prev.includes(code) ? prev.filter((u) => u !== code) : [...prev, code]));
  };

  const toggleAllUnits = (): void => {
    if (units.length === unitCodes.length) {
      setUnits([]);
    } else {
      setUnits(unitCodes.slice());
    }
  };

  const toggleYear = (year: string): void => {
    setYears((prev) => (prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]));
  };

  const handleExport = (): void => {
    if (!canExport) return;

    const allUnits = Array.from(new Set(units)).map(resolveUnitInfo);
    const primaryUnit = allUnits[0] || resolveUnitInfo(units[0] || '');
    const primaryDisplay = unitDisplayName(primaryUnit);
    const primaryAddress = unitAddress(primaryUnit);
    const yearLabel = years.join(', ');

    const tables: string[] = [];
    selectedModules.forEach((moduleName) => {
      const firstUnitCode = allUnits[0] ? allUnits[0].code : (units[0] || '');
      tables.push(buildModuleTable(moduleName, firstUnitCode, yearLabel));
    });

    const header =
      '<table border="0" cellspacing="0" cellpadding="6" style="width:100%;margin-bottom:16px;border-bottom:2px solid #065f46;">' +
      '<tr>' +
      '<td style="width:60px;font-size:24px;font-weight:bold;color:#065f46;">E</td>' +
      '<td align="left">' +
      '<div style="font-size:18px;font-weight:bold;color:#065f46;">Epyllion Group</div>' +
      '<div style="font-size:14px;font-weight:bold;">' + escapeHtml(primaryDisplay) + '</div>' +
      '<div style="font-size:11px;color:#555;">' + escapeHtml(primaryAddress) + '</div>' +
      '</td>' +
      '<td align="right">' +
      '<div style="font-size:14px;font-weight:bold;">' + escapeHtml(reportTitle) + '</div>' +
      '<div style="font-size:11px;color:#555;">Year: ' + escapeHtml(yearLabel) + '</div>' +
      '<div style="font-size:11px;color:#555;">Units: ' + escapeHtml(units.join(', ')) + '</div>' +
      '</td>' +
      '</tr>' +
      '</table>';

    const metaTable =
      '<table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;width:100%;margin-bottom:16px;">' +
      '<tr><td style="width:160px;font-weight:bold;background:#f1f5f9;">Report Title</td><td>' + escapeHtml(reportTitle) + '</td></tr>' +
      '<tr><td style="font-weight:bold;background:#f1f5f9;">Selected Units</td><td>' + escapeHtml(units.join(', ')) + '</td></tr>' +
      '<tr><td style="font-weight:bold;background:#f1f5f9;">Selected Years</td><td>' + escapeHtml(years.join(', ')) + '</td></tr>' +
      '<tr><td style="font-weight:bold;background:#f1f5f9;">Modules</td><td>' + escapeHtml(selectedModules.join(', ')) + '</td></tr>' +
      '<tr><td style="font-weight:bold;background:#f1f5f9;">Generated By</td><td>' + escapeHtml(userRole || 'System User') + '</td></tr>' +
      '<tr><td style="font-weight:bold;background:#f1f5f9;">Generated At</td><td>' + escapeHtml(new Date().toLocaleString()) + '</td></tr>' +
      '</table>';

    const body =
      '<html xmlns:o="urn:schemas-microsoft-com:office:office" ' +
      'xmlns:x="urn:schemas-microsoft-com:office:excel" ' +
      'xmlns="http://www.w3.org/TR/REC-html40">' +
      '<head><meta charset="utf-8" />' +
      '<style>body{font-family:Arial,Helvetica,sans-serif;font-size:12px;}</style>' +
      '</head><body>' +
      header +
      metaTable +
      tables.join('') +
      '</body></html>';

    const blob = new Blob(['\ufeff', body], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeTitle = reportTitle.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'Epyllion_Export';
    link.href = url;
    link.download = `${safeTitle}_${years.join('-')}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Custom Excel Export</h1>
        <p className="text-sm text-slate-500 mt-1">
          Build a tailored corporate Excel report by selecting templates, units, years, and modules.
        </p>
      </div>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">1. Pre-built Templates</h2>
        <p className="text-sm text-slate-500 mb-3">Click a card to auto-select its modules.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {TEMPLATES.map((t) => {
            const active = activeTemplate === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelectTemplate(t)}
                className={
                  'text-left rounded-xl border p-4 transition-all shadow-sm hover:shadow-md ' +
                  (active
                    ? 'border-emerald-600 ring-2 ring-emerald-300 bg-emerald-50'
                    : 'border-slate-200 bg-white hover:border-emerald-300')
                }
              >
                <div className="text-2xl mb-2">{t.icon}</div>
                <h3 className="text-sm font-semibold text-slate-800">{t.name}</h3>
                <p className="text-xs text-slate-500 mt-1">{t.description}</p>
                {t.id !== 'custom' && (
                  <div className="mt-2 text-xs text-emerald-700 font-medium">
                    {t.modules.length} modules
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">2. Units &amp; Years</h2>
        <p className="text-sm text-slate-500 mb-3">Choose the units and reporting years to include.</p>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Units</span>
            <button
              type="button"
              onClick={toggleAllUnits}
              className="text-xs font-semibold px-3 py-1 rounded-md border border-emerald-500 text-emerald-700 hover:bg-emerald-50"
            >
              {units.length === unitCodes.length ? `Deselect All ${unitCodes.length} Units` : `Select All ${unitCodes.length} Units`}
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {unitCodes.map((code) => {
              const info = resolveUnitInfo(code);
              const checked = units.includes(code);
              return (
                <label
                  key={code}
                  className={
                    'flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer text-sm ' +
                    (checked ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white')
                  }
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleUnit(code)}
                    className="accent-emerald-600"
                  />
                  <span className="font-medium text-slate-700 truncate" title={unitDisplayName(info)}>
                    {code}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <span className="text-sm font-medium text-slate-700 block mb-2">Years</span>
          <div className="flex flex-wrap gap-2">
            {YEARS.map((y) => {
              const checked = years.includes(y);
              return (
                <label
                  key={y}
                  className={
                    'flex items-center gap-2 rounded-md border px-3 py-1.5 cursor-pointer text-sm ' +
                    (checked ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white')
                  }
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleYear(y)}
                    className="accent-emerald-600"
                  />
                  <span className="font-medium text-slate-700">{y}</span>
                </label>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">3. Modules &amp; Sub-Modules</h2>
        <p className="text-sm text-slate-500 mb-3">Fine-tune exactly what data appears in the export.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MODULE_GROUPS.map((group) => {
            const allSelected = group.modules.every((m) => selectedModules.includes(m));
            return (
              <div key={group.group} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-800">{group.group}</h3>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group)}
                    className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
                  >
                    {allSelected ? 'Clear' : 'Select All'}
                  </button>
                </div>
                <div className="flex flex-col gap-1.5">
                  {group.modules.map((moduleName) => {
                    const checked = selectedModules.includes(moduleName);
                    return (
                      <label key={moduleName} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleModule(moduleName)}
                          className="accent-emerald-600"
                        />
                        <span>{moduleName}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">4. Letterhead Preview &amp; Export</h2>
        <p className="text-sm text-slate-500 mb-3">Preview the corporate letterhead used in your Excel report.</p>

        <div className="mb-3">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Report Title</span>
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </label>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b-2 border-emerald-700 pb-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-lg">
                E
              </div>
              <div>
                <div className="text-base font-bold text-emerald-800">Epyllion Group</div>
                <div className="text-sm font-semibold text-slate-700">
                  {units.length > 0 ? unitDisplayName(resolveUnitInfo(units[0])) : 'Select a unit'}
                </div>
                <div className="text-xs text-slate-500">
                  {units.length > 0 ? unitAddress(resolveUnitInfo(units[0])) : '—'}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-slate-800">{reportTitle || 'Report Title'}</div>
              <div className="text-xs text-slate-500">Years: {years.join(', ') || '—'}</div>
              <div className="text-xs text-slate-500">
                Units: {units.length > 0 ? units.join(', ') : '—'}
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-500">
            {selectedModules.length > 0
              ? `${selectedModules.length} module(s) selected: ${selectedModules.join(', ')}`
              : 'No modules selected yet.'}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {!canExport && 'Select at least one unit, one year, and one module to export.'}
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={!canExport}
            className="px-6 py-2.5 text-sm font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            Generate &amp; Download Excel (.xls)
          </button>
        </div>
      </section>
    </div>
  );
}
