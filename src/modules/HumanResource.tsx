
import React, { useMemo } from 'react';
import {
  Users,
  Building2,
  Calendar,
  ClipboardList,
  UserCheck,
  UserX,
  ShieldCheck,
  FileText,
  DoorOpen,
  Briefcase,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';

export interface HumanResourceProps {
  activeSubModule: string;
  selectedUnit: string;
  unitFullName: string;
  selectedYear: string;
  userRole?: string;
  [key: string]: any;
}

const MONTHS: string[] = [
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

const DEPARTMENTS: string[] = [
  'Cutting',
  'Sewing',
  'Finishing',
  'Quality Control',
  'Store',
  'Maintenance',
  'Administration',
];

interface SubModuleMeta {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

function getSubModuleMeta(id: string): SubModuleMeta {
  switch (id) {
    case 'hr_total_manpower':
      return {
        id,
        label: 'Total Manpower',
        description: 'Month-wise Male / Female worker and staff headcount overview.',
        icon: <Users className="w-5 h-5" />,
      };
    case 'hr_work_station':
      return {
        id,
        label: 'Work Station',
        description: 'Department / line-wise workstation capacity and utilization.',
        icon: <Briefcase className="w-5 h-5" />,
      };
    case 'hr_summary':
      return {
        id,
        label: 'HR Summary',
        description: 'Executive HR KPIs and key workforce indicators.',
        icon: <TrendingUp className="w-5 h-5" />,
      };
    case 'hr_gate_pass':
      return {
        id,
        label: 'Gate Pass Report',
        description: 'Visitor and worker gate pass entry and exit log.',
        icon: <DoorOpen className="w-5 h-5" />,
      };
    default:
      return {
        id,
        label: 'Human Resource',
        description: 'Select a Human Resource sub-module from the sidebar.',
        icon: <Users className="w-5 h-5" />,
      };
  }
}

function buildHeaderTitle(activeSubModule: string): string {
  switch (activeSubModule) {
    case 'hr_total_manpower':
      return 'Total Manpower — Human Resource';
    case 'hr_work_station':
      return 'Work Station — Human Resource';
    case 'hr_summary':
      return 'HR Summary';
    case 'hr_gate_pass':
      return 'Gate pass Report';
    default:
      return 'Human Resource';
  }
}

function TotalManpowerPlaceholder(): React.ReactNode {
  const rows: Array<{ month: string; maleW: number; femaleW: number; maleS: number; femaleS: number }> =
    MONTHS.map((m) => ({ month: m, maleW: 0, femaleW: 0, maleS: 0, femaleS: 0 }));

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="text-left px-4 py-3 font-semibold">Month</th>
            <th className="text-right px-4 py-3 font-semibold">Male Workers</th>
            <th className="text-right px-4 py-3 font-semibold">Female Workers</th>
            <th className="text-right px-4 py-3 font-semibold">Male Staff</th>
            <th className="text-right px-4 py-3 font-semibold">Female Staff</th>
            <th className="text-right px-4 py-3 font-semibold">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.month} className="hover:bg-slate-50">
              <td className="px-4 py-2 font-medium text-slate-700">{r.month}</td>
              <td className="px-4 py-2 text-right text-slate-500">{r.maleW}</td>
              <td className="px-4 py-2 text-right text-slate-500">{r.femaleW}</td>
              <td className="px-4 py-2 text-right text-slate-500">{r.maleS}</td>
              <td className="px-4 py-2 text-right text-slate-500">{r.femaleS}</td>
              <td className="px-4 py-2 text-right font-semibold text-slate-800">
                {r.maleW + r.femaleW + r.maleS + r.femaleS}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-slate-50">
          <tr>
            <td className="px-4 py-3 font-semibold text-slate-700">Total</td>
            <td className="px-4 py-3 text-right font-semibold text-slate-800">0</td>
            <td className="px-4 py-3 text-right font-semibold text-slate-800">0</td>
            <td className="px-4 py-3 text-right font-semibold text-slate-800">0</td>
            <td className="px-4 py-3 text-right font-semibold text-slate-800">0</td>
            <td className="px-4 py-3 text-right font-semibold text-emerald-700">0</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function WorkStationPlaceholder(): React.ReactNode {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="text-left px-4 py-3 font-semibold">Department / Line</th>
            <th className="text-right px-4 py-3 font-semibold">Workstations</th>
            <th className="text-right px-4 py-3 font-semibold">Occupied</th>
            <th className="text-right px-4 py-3 font-semibold">Vacant</th>
            <th className="text-right px-4 py-3 font-semibold">Utilization %</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {DEPARTMENTS.map((d) => (
            <tr key={d} className="hover:bg-slate-50">
              <td className="px-4 py-2 font-medium text-slate-700">{d}</td>
              <td className="px-4 py-2 text-right text-slate-500">0</td>
              <td className="px-4 py-2 text-right text-slate-500">0</td>
              <td className="px-4 py-2 text-right text-slate-500">0</td>
              <td className="px-4 py-2 text-right font-semibold text-slate-800">0%</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-slate-50">
          <tr>
            <td className="px-4 py-3 font-semibold text-slate-700">Total</td>
            <td className="px-4 py-3 text-right font-semibold text-slate-800">0</td>
            <td className="px-4 py-3 text-right font-semibold text-slate-800">0</td>
            <td className="px-4 py-3 text-right font-semibold text-slate-800">0</td>
            <td className="px-4 py-3 text-right font-semibold text-emerald-700">0%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function SummaryPlaceholder(): React.ReactNode {
  const kpis: Array<{ label: string; value: string; icon: React.ReactNode; tone: string }> = [
    {
      label: 'Total Manpower',
      value: '0',
      icon: <Users className="w-5 h-5" />,
      tone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      label: 'Male / Female Ratio',
      value: '0 : 0',
      icon: <UserCheck className="w-5 h-5" />,
      tone: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      label: 'New Joiners (YTD)',
      value: '0',
      icon: <UserCheck className="w-5 h-5" />,
      tone: 'bg-teal-50 text-teal-700 border-teal-200',
    },
    {
      label: 'Separations (YTD)',
      value: '0',
      icon: <UserX className="w-5 h-5" />,
      tone: 'bg-red-50 text-red-700 border-red-200',
    },
    {
      label: 'Attrition Rate',
      value: '0%',
      icon: <TrendingUp className="w-5 h-5" />,
      tone: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
      label: 'Safety Training Covered',
      value: '0%',
      icon: <ShieldCheck className="w-5 h-5" />,
      tone: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {kpis.map((k) => (
        <div key={k.label} className={'rounded-lg border p-4 shadow-sm ' + k.tone}>
          <div className="flex items-center gap-2 mb-2">
            {k.icon}
            <span className="text-xs font-semibold uppercase tracking-wide">{k.label}</span>
          </div>
          <div className="text-2xl font-bold">{k.value}</div>
        </div>
      ))}
    </div>
  );
}

function GatePassPlaceholder(): React.ReactNode {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="text-left px-4 py-3 font-semibold">Date</th>
            <th className="text-left px-4 py-3 font-semibold">Gate Pass No.</th>
            <th className="text-left px-4 py-3 font-semibold">Person / Visitor</th>
            <th className="text-left px-4 py-3 font-semibold">Type</th>
            <th className="text-left px-4 py-3 font-semibold">Purpose</th>
            <th className="text-left px-4 py-3 font-semibold">In Time</th>
            <th className="text-left px-4 py-3 font-semibold">Out Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          <tr>
            <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
              <div className="flex flex-col items-center gap-2">
                <FileText className="w-8 h-8 text-slate-300" />
                <span>No gate pass records for this period yet.</span>
                <span className="text-xs text-slate-400">
                  Visitor and worker gate pass entries will appear here.
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function HumanResource({
  activeSubModule,
  selectedUnit,
  unitFullName,
  selectedYear,
  userRole,
}: HumanResourceProps) {
  const meta = useMemo<SubModuleMeta>(() => getSubModuleMeta(activeSubModule), [activeSubModule]);
  const headerTitle = useMemo<string>(() => buildHeaderTitle(activeSubModule), [activeSubModule]);

  const displayUnit = unitFullName || selectedUnit || '—';
  const displayYear = selectedYear || '—';

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6">
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700">
            {meta.icon}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{headerTitle}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{meta.description}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            <Building2 className="w-3.5 h-3.5" />
            {displayUnit}
            {selectedUnit && unitFullName && selectedUnit !== unitFullName && (
              <span className="text-slate-400">({selectedUnit})</span>
            )}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            <Calendar className="w-3.5 h-3.5" />
            Year: {displayYear}
          </span>
          {userRole && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              {userRole}
            </span>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-emerald-600" />
            {meta.label} Workspace
          </h2>
          <span className="text-xs text-slate-500">Data entry ready</span>
        </div>

        <div className="p-4">
          {activeSubModule === 'hr_total_manpower' && <TotalManpowerPlaceholder />}
          {activeSubModule === 'hr_work_station' && <WorkStationPlaceholder />}
          {activeSubModule === 'hr_summary' && <SummaryPlaceholder />}
          {activeSubModule === 'hr_gate_pass' && <GatePassPlaceholder />}

          {activeSubModule !== 'hr_total_manpower' &&
            activeSubModule !== 'hr_work_station' &&
            activeSubModule !== 'hr_summary' &&
            activeSubModule !== 'hr_gate_pass' && (
              <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                <AlertCircle className="w-4 h-4" />
                No sub-module selected. Choose a Human Resource sub-module from the sidebar.
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

