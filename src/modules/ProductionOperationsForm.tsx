import React, { useState, useEffect } from 'react';
import { Save, Plus, X, Printer, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { UNIT_DIRECTORY } from '../utils/unitDirectory';

export interface ProductionOperationsFormProps {
  selectedUnit: string;
  selectedYear: string;
  userRole?: string;
  [key: string]: any;
}

interface Buyer {
  id: string;
  name: string;
}

interface MonthData {
  manPower: string;
  workingDays: string;
  availableHour: string;
  produceHour: string;
  totalMTO: string;
  efficiency: string;
  averageSMV: string;
  remarks: string;
  prodPcs: Record<string, string>;
  shipPcs: Record<string, string>;
  shipKg: Record<string, string>;
  shipSam: Record<string, string>;
}

type FormData = Record<string, MonthData>;

type SectionKey = 'ops' | 'prod' | 'shipPcs' | 'shipKg' | 'shipSam' | 'remarks';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// ---------------------------------------------------------------------------
// Design tokens (UI only - the export/print HTML template keeps its own styles)
// ---------------------------------------------------------------------------
const INPUT_CLASS =
  'w-24 border border-slate-300 bg-white rounded px-2 py-1 text-right text-xs text-slate-900 shadow-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed';

const BUYER_INPUT_CLASS =
  'w-full border border-slate-300 bg-white rounded px-2 py-1 text-center text-xs font-medium text-slate-900 shadow-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed';

const REMARKS_INPUT_CLASS =
  'w-full min-w-[160px] border border-slate-300 bg-white rounded px-2 py-1 text-left text-xs text-slate-900 shadow-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed';

interface SectionTheme {
  header: string;      // section group header
  subHeader: string;   // column sub-header
  cell: string;        // column body tint
  locked: string;      // locked/auto-calculated cell
  footer: string;      // footer total cell
  footerLocked: string;
  border: string;
}

const THEMES: Record<SectionKey, SectionTheme> = {
  ops: {
    header: 'bg-emerald-200 text-emerald-950 border-emerald-400',
    subHeader: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    cell: 'bg-emerald-50/70 border-emerald-200',
    locked: 'bg-emerald-200/70 text-emerald-950 font-bold border-emerald-300',
    footer: 'bg-emerald-200 text-emerald-950 font-bold border-emerald-400',
    footerLocked: 'bg-emerald-300 text-emerald-950 font-extrabold border-emerald-500',
    border: 'border-emerald-300',
  },
  prod: {
    header: 'bg-sky-200 text-sky-950 border-sky-400',
    subHeader: 'bg-sky-100 text-sky-900 border-sky-300',
    cell: 'bg-sky-50/70 border-sky-200',
    locked: 'bg-sky-200/70 text-sky-950 font-bold border-sky-300',
    footer: 'bg-sky-200 text-sky-950 font-bold border-sky-400',
    footerLocked: 'bg-sky-300 text-sky-950 font-extrabold border-sky-500',
    border: 'border-sky-300',
  },
  shipPcs: {
    header: 'bg-indigo-200 text-indigo-950 border-indigo-400',
    subHeader: 'bg-indigo-100 text-indigo-900 border-indigo-300',
    cell: 'bg-indigo-50/70 border-indigo-200',
    locked: 'bg-indigo-200/70 text-indigo-950 font-bold border-indigo-300',
    footer: 'bg-indigo-200 text-indigo-950 font-bold border-indigo-400',
    footerLocked: 'bg-indigo-300 text-indigo-950 font-extrabold border-indigo-500',
    border: 'border-indigo-300',
  },
  shipKg: {
    header: 'bg-amber-200 text-amber-950 border-amber-400',
    subHeader: 'bg-amber-100 text-amber-900 border-amber-300',
    cell: 'bg-amber-50/70 border-amber-200',
    locked: 'bg-amber-200/70 text-amber-950 font-bold border-amber-300',
    footer: 'bg-amber-200 text-amber-950 font-bold border-amber-400',
    footerLocked: 'bg-amber-300 text-amber-950 font-extrabold border-amber-500',
    border: 'border-amber-300',
  },
  shipSam: {
    header: 'bg-orange-200 text-orange-950 border-orange-400',
    subHeader: 'bg-orange-100 text-orange-900 border-orange-300',
    cell: 'bg-orange-50/70 border-orange-200',
    locked: 'bg-orange-200/70 text-orange-950 font-bold border-orange-300',
    footer: 'bg-orange-200 text-orange-950 font-bold border-orange-400',
    footerLocked: 'bg-orange-300 text-orange-950 font-extrabold border-orange-500',
    border: 'border-orange-300',
  },
  remarks: {
    header: 'bg-slate-200 text-slate-900 border-slate-400',
    subHeader: 'bg-slate-100 text-slate-800 border-slate-300',
    cell: 'bg-slate-50/70 border-slate-200',
    locked: 'bg-slate-200/70 text-slate-900 font-bold border-slate-300',
    footer: 'bg-slate-200 text-slate-700 font-bold border-slate-400',
    footerLocked: 'bg-slate-300 text-slate-900 font-extrabold border-slate-500',
    border: 'border-slate-300',
  },
};

const SECTION_TITLES: Record<SectionKey, string> = {
  ops: 'Factory Operations',
  prod: 'Production Quantity (PCS)',
  shipPcs: 'Shipment Quantity (PCS)',
  shipKg: 'Shipment Quantity (KG)',
  shipSam: 'Shipment Quantity (SAM)',
  remarks: 'Remarks',
};

const n = (val: any): number => {
  const num = parseFloat(val);
  return isNaN(num) ? 0 : num;
};

const fmt = (val: number): string => {
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getEmptyMonth = (): MonthData => ({
  manPower: '',
  workingDays: '',
  availableHour: '',
  produceHour: '',
  totalMTO: '',
  efficiency: '',
  averageSMV: '',
  remarks: '',
  prodPcs: {},
  shipPcs: {},
  shipKg: {},
  shipSam: {},
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

export default function ProductionOperationsForm({
  selectedUnit,
  selectedYear,
  userRole,
}: ProductionOperationsFormProps) {
  const isViewer = userRole === 'viewer';
  const safeUnit = selectedUnit || 'UNKNOWN';
  const safeYear = selectedYear || '2025';
  const storageKey = `prod_ops_${safeUnit}_${safeYear}`;
  const unitInfo = getUnitInfo(safeUnit);

  const [buyers, setBuyers] = useState<Buyer[]>([
    { id: 'b1', name: '' },
    { id: 'b2', name: '' },
    { id: 'b3', name: '' },
  ]);

  const [data, setData] = useState<FormData>({});
  const [isSaved, setIsSaved] = useState(false);

  const [sections, setSections] = useState<Record<SectionKey, boolean>>({
    ops: true,
    prod: true,
    shipPcs: true,
    shipKg: true,
    shipSam: true,
    remarks: true,
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        
        if (parsed && Array.isArray(parsed.buyers) && parsed.buyers.length > 0) {
          setBuyers(parsed.buyers);
        } else {
          setBuyers([{ id: 'b1', name: '' }, { id: 'b2', name: '' }, { id: 'b3', name: '' }]);
        }

        if (parsed && parsed.data && typeof parsed.data === 'object') {
          const validatedData: FormData = {};
          MONTHS.forEach(m => {
            const rawMonth = parsed.data[m];
            validatedData[m] = rawMonth && typeof rawMonth === 'object' 
              ? {
                  manPower: rawMonth.manPower || '',
                  workingDays: rawMonth.workingDays || '',
                  availableHour: rawMonth.availableHour || '',
                  produceHour: rawMonth.produceHour || '',
                  totalMTO: rawMonth.totalMTO || '',
                  efficiency: rawMonth.efficiency || '',
                  averageSMV: rawMonth.averageSMV || '',
                  remarks: rawMonth.remarks || '',
                  prodPcs: rawMonth.prodPcs || {},
                  shipPcs: rawMonth.shipPcs || {},
                  shipKg: rawMonth.shipKg || {},
                  shipSam: rawMonth.shipSam || {},
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
      console.error('Failed to load or parse local storage data', e);
      const initialData: FormData = {};
      MONTHS.forEach(m => { initialData[m] = getEmptyMonth(); });
      setData(initialData);
      setBuyers([{ id: 'b1', name: '' }, { id: 'b2', name: '' }, { id: 'b3', name: '' }]);
    }
  }, [storageKey]);

  const handleSave = () => {
    if (isViewer) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ buyers, data }));
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (e) {
      alert('Failed to save data to local storage.');
    }
  };

  const updateMonthField = (month: string, field: keyof MonthData, value: string) => {
    if (isViewer) return;
    if (['manPower', 'workingDays', 'availableHour', 'produceHour', 'totalMTO', 'efficiency', 'averageSMV'].includes(field) && !isValidNumber(value)) return;
    
    setData(prev => ({
      ...prev,
      [month]: {
        ...(prev[month] || getEmptyMonth()),
        [field]: value,
      },
    }));
  };

  const updateBuyerQty = (month: string, section: 'prodPcs' | 'shipPcs' | 'shipKg' | 'shipSam', buyerId: string, value: string) => {
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
            [buyerId]: value,
          },
        },
      };
    });
  };

  const updateBuyerName = (id: string, name: string) => {
    if (isViewer) return;
    setBuyers(prev => prev.map(b => (b.id === id ? { ...b, name } : b)));
  };

  const addBuyer = () => {
    if (isViewer) return;
    const newId = `b${Date.now()}`;
    setBuyers(prev => [...prev, { id: newId, name: '' }]);
  };

  const removeBuyer = (id: string) => {
    if (isViewer) return;
    setBuyers(prev => prev.filter(b => b.id !== id));
  };

  const getSectionTotal = (row: MonthData, section: 'prodPcs' | 'shipPcs' | 'shipKg' | 'shipSam') => {
    if (!row || !row[section]) return 0;
    return buyers.reduce((sum, b) => sum + n(row[section][b.id]), 0);
  };

  const getBuyerYearTotal = (buyerId: string, section: 'prodPcs' | 'shipPcs' | 'shipKg' | 'shipSam') => {
    return MONTHS.reduce((sum, m) => {
      const row = data[m];
      if (!row || !row[section]) return sum;
      return sum + n(row[section][buyerId]);
    }, 0);
  };

  const getColumnYearTotal = (section: 'prodPcs' | 'shipPcs' | 'shipKg' | 'shipSam') => {
    return MONTHS.reduce((sum, m) => sum + getSectionTotal(data[m], section), 0);
  };

  const getFactoryYearTotal = (field: 'manPower' | 'workingDays' | 'availableHour' | 'produceHour' | 'totalMTO') => {
    return MONTHS.reduce((sum, m) => sum + n(data[m]?.[field]), 0);
  };

  const getAvgEfficiency = () => {
    let totalEff = 0;
    let count = 0;
    MONTHS.forEach(m => {
      const val = data[m]?.efficiency;
      if (val !== '' && val !== undefined) {
        totalEff += n(val);
        count++;
      }
    });
    return count > 0 ? (totalEff / count).toFixed(2) : '0.00';
  };

  const generateHTMLTemplate = (isPrint: boolean = false) => {
    const title = `Production & Operations Report`;
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

    let tableHeaders = '<tr><th style="border: 1px solid #000; padding: 5px; background-color: #f3f4f6;">Month</th>';
    
    if (sections.ops) {
      tableHeaders += `
        <th colspan="7" style="border: 1px solid #000; padding: 5px; background-color: #d1fae5; text-align: center; font-weight: bold;">FACTORY OPERATIONS</th>
      `;
    }
    if (sections.prod) tableHeaders += `<th colspan="${buyers.length + 1}" style="border: 1px solid #000; padding: 5px; background-color: #dbeafe; text-align: center; font-weight: bold;">PRODUCTION QUANTITY (PCS)</th>`;
    if (sections.shipPcs) tableHeaders += `<th colspan="${buyers.length + 1}" style="border: 1px solid #000; padding: 5px; background-color: #e0e7ff; text-align: center; font-weight: bold;">SHIPMENT QUANTITY (PCS)</th>`;
    if (sections.shipKg) tableHeaders += `<th colspan="${buyers.length + 1}" style="border: 1px solid #000; padding: 5px; background-color: #fef3c7; text-align: center; font-weight: bold;">SHIPMENT QUANTITY (KG)</th>`;
    if (sections.shipSam) tableHeaders += `<th colspan="${buyers.length + 1}" style="border: 1px solid #000; padding: 5px; background-color: #ffedd5; text-align: center; font-weight: bold;">SHIPMENT QUANTITY (SAM)</th>`;
    if (sections.remarks) tableHeaders += `<th style="border: 1px solid #000; padding: 5px; background-color: #f3f4f6; text-align: center; font-weight: bold;">REMARKS</th>`;
    tableHeaders += '</tr><tr><th style="border: 1px solid #000; padding: 5px; background-color: #f3f4f6;"></th>';

    if (sections.ops) {
      tableHeaders += `
        <th style="border: 1px solid #000; padding: 5px; background-color: #ecfdf5; font-size: 11px;">Man Power</th>
        <th style="border: 1px solid #000; padding: 5px; background-color: #ecfdf5; font-size: 11px;">Working Days</th>
        <th style="border: 1px solid #000; padding: 5px; background-color: #ecfdf5; font-size: 11px;">Available Hour</th>
        <th style="border: 1px solid #000; padding: 5px; background-color: #ecfdf5; font-size: 11px;">Produce Hour</th>
        <th style="border: 1px solid #000; padding: 5px; background-color: #ecfdf5; font-size: 11px;">Total MTO</th>
        <th style="border: 1px solid #000; padding: 5px; background-color: #ecfdf5; font-size: 11px;">Efficiency (%)</th>
        <th style="border: 1px solid #000; padding: 5px; background-color: #ecfdf5; font-size: 11px;">Avg SMV</th>
      `;
    }
    
    const buildBuyerHeaders = (bgColor: string) => {
      let h = '';
      buyers.forEach(b => {
        h += `<th style="border: 1px solid #000; padding: 5px; background-color: ${bgColor}; font-size: 11px;">${b.name || 'Unnamed'}</th>`;
      });
      h += `<th style="border: 1px solid #000; padding: 5px; background-color: ${bgColor}; font-weight: bold; font-size: 11px;">Total</th>`;
      return h;
    };

    if (sections.prod) tableHeaders += buildBuyerHeaders('#eff6ff');
    if (sections.shipPcs) tableHeaders += buildBuyerHeaders('#e0e7ff');
    if (sections.shipKg) tableHeaders += buildBuyerHeaders('#fffbeb');
    if (sections.shipSam) tableHeaders += buildBuyerHeaders('#fff7ed');
    
    if (sections.remarks) tableHeaders += '<th style="border: 1px solid #000; padding: 5px; background-color: #f3f4f6;"></th>';
    tableHeaders += '</tr>';

    let tbody = '';
    MONTHS.forEach(m => {
      const row = data[m] || getEmptyMonth();
      tbody += `<tr><td style="border: 1px solid #000; padding: 5px; font-weight: bold; font-size: 11px;">${m}</td>`;
      
      if (sections.ops) {
        tbody += `
          <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${row.manPower || ''}</td>
          <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${row.workingDays || ''}</td>
          <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${row.availableHour || ''}</td>
          <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${row.produceHour || ''}</td>
          <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${row.totalMTO || ''}</td>
          <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${row.efficiency || ''}</td>
          <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${row.averageSMV || ''}</td>
        `;
      }

      const buildBuyerCells = (section: 'prodPcs' | 'shipPcs' | 'shipKg' | 'shipSam') => {
        let c = '';
        buyers.forEach(b => {
          c += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${row[section]?.[b.id] || ''}</td>`;
        });
        c += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-size: 11px;">${fmt(getSectionTotal(row, section))}</td>`;
        return c;
      };

      if (sections.prod) tbody += buildBuyerCells('prodPcs');
      if (sections.shipPcs) tbody += buildBuyerCells('shipPcs');
      if (sections.shipKg) tbody += buildBuyerCells('shipKg');
      if (sections.shipSam) tbody += buildBuyerCells('shipSam');

      if (sections.remarks) tbody += `<td style="border: 1px solid #000; padding: 5px; font-size: 11px;">${row.remarks || ''}</td>`;
      tbody += `</tr>`;
    });

    let tfoot = '<tr style="background-color: #f3f4f6; font-weight: bold;"><td style="border: 1px solid #000; padding: 5px; font-size: 11px;">Total</td>';
    
    if (sections.ops) {
      tfoot += `
        <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getFactoryYearTotal('manPower'))}</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getFactoryYearTotal('workingDays'))}</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getFactoryYearTotal('availableHour'))}</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getFactoryYearTotal('produceHour'))}</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getFactoryYearTotal('totalMTO'))}</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${getAvgEfficiency()}</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">-</td>
      `;
    }

    const buildBuyerFooter = (section: 'prodPcs' | 'shipPcs' | 'shipKg' | 'shipSam') => {
      let c = '';
      buyers.forEach(b => {
        c += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getBuyerYearTotal(b.id, section))}</td>`;
      });
      c += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getColumnYearTotal(section))}</td>`;
      return c;
    };

    if (sections.prod) tfoot += buildBuyerFooter('prodPcs');
    if (sections.shipPcs) tfoot += buildBuyerFooter('shipPcs');
    if (sections.shipKg) tfoot += buildBuyerFooter('shipKg');
    if (sections.shipSam) tfoot += buildBuyerFooter('shipSam');

    if (sections.remarks) tfoot += '<td style="border: 1px solid #000; padding: 5px; font-size: 11px;">-</td>';
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
        <title>Production & Operations - ${safeUnit} - ${safeYear}</title>
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
          <thead>${tableHeaders}</thead>
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
    link.download = `Production_Operations_${safeUnit}_${safeYear}.xls`;
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

  // -------------------------------------------------------------------------
  // UI helpers
  // -------------------------------------------------------------------------
  const BUYER_SECTIONS = ['prod', 'shipPcs', 'shipKg', 'shipSam'] as const;

  const AddBuyerInline = () =>
    !isViewer ? (
      <button
        type="button"
        onClick={addBuyer}
        title="Add Buyer"
        className="no-print inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded border border-slate-900 bg-white text-slate-900 text-[11px] font-bold normal-case tracking-normal hover:bg-slate-900 hover:text-white transition-colors"
      >
        <Plus size={12} /> Add Buyer
      </button>
    ) : null;

  const opsColumns: { field: keyof MonthData; label: string }[] = [
    { field: 'manPower', label: 'Man Power' },
    { field: 'workingDays', label: 'Working Days' },
    { field: 'availableHour', label: 'Available Hour' },
    { field: 'produceHour', label: 'Produce Hour' },
    { field: 'totalMTO', label: 'Total MTO' },
    { field: 'efficiency', label: 'Efficiency (%)' },
    { field: 'averageSMV', label: 'Avg SMV' },
  ];

  const opsFooterFields = ['manPower', 'workingDays', 'availableHour', 'produceHour', 'totalMTO'] as const;

  return (
    <div className="w-full max-w-[95vw] mx-auto p-4 sm:p-6 bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Production &amp; Operations</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p className="text-sm text-slate-500">{unitInfo.fullName}</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
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

      <div className="mb-4 bg-slate-50 border border-slate-300 rounded-lg p-3 flex flex-wrap items-center gap-4 text-sm no-print">
        <span className="font-semibold text-slate-800 mr-2">Report Columns / Sections to Export &amp; Print:</span>
        
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={sections.ops} onChange={() => toggleSection('ops')} className="accent-emerald-600 w-4 h-4" />
          <span>Factory Operations</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={sections.prod} onChange={() => toggleSection('prod')} className="accent-blue-600 w-4 h-4" />
          <span>Production (pcs)</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={sections.shipPcs} onChange={() => toggleSection('shipPcs')} className="accent-indigo-600 w-4 h-4" />
          <span>Shipment (pcs)</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={sections.shipKg} onChange={() => toggleSection('shipKg')} className="accent-amber-600 w-4 h-4" />
          <span>Shipment (kg)</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={sections.shipSam} onChange={() => toggleSection('shipSam')} className="accent-orange-600 w-4 h-4" />
          <span>Shipment (SAM)</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={sections.remarks} onChange={() => toggleSection('remarks')} className="accent-gray-600 w-4 h-4" />
          <span>Remarks</span>
        </label>
      </div>

      {isViewer && (
        <div className="mb-4 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 no-print">
          <AlertCircle size={16} /> You are viewing this data in read-only mode. Contact an admin for edit access.
        </div>
      )}

      <div className="overflow-x-auto border-2 border-slate-300 rounded-lg shadow-sm">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="text-xs font-semibold">
            <tr>
              <th rowSpan={2} className="px-3 py-2 sticky left-0 bg-slate-200 text-slate-900 z-20 border border-slate-400 w-28 text-center font-bold uppercase tracking-wider">
                Month
              </th>

              {sections.ops && (
                <th colSpan={7} className={`px-2 py-2 border text-center font-bold uppercase tracking-wider ${THEMES.ops.header}`}>
                  {SECTION_TITLES.ops}
                </th>
              )}

              {BUYER_SECTIONS.map((secKey) => {
                if (!sections[secKey]) return null;
                const theme = THEMES[secKey];
                return (
                  <th key={`hdr-${secKey}`} colSpan={buyers.length + 1} className={`px-2 py-2 border text-center font-bold uppercase tracking-wider ${theme.header}`}>
                    <span className="inline-flex items-center justify-center flex-wrap">
                      {SECTION_TITLES[secKey]}
                      {secKey === 'prod' && <AddBuyerInline />}
                    </span>
                  </th>
                );
              })}

              {sections.remarks && (
                <th rowSpan={2} className={`px-2 py-2 border text-center align-middle font-bold uppercase tracking-wider min-w-[180px] ${THEMES.remarks.header}`}>
                  {SECTION_TITLES.remarks}
                </th>
              )}
            </tr>
            
            <tr>
              {sections.ops && (
                <>
                  {opsColumns.map((col) => (
                    <th
                      key={col.field}
                      className={`px-2 py-2 border text-center whitespace-nowrap ${THEMES.ops.subHeader} ${col.field === 'efficiency' ? 'font-extrabold' : ''}`}
                    >
                      {col.label}
                    </th>
                  ))}
                </>
              )}

              {BUYER_SECTIONS.map((secKey) => {
                if (!sections[secKey]) return null;
                const theme = THEMES[secKey];
                return (
                  <React.Fragment key={secKey}>
                    {buyers.map((b, bIdx) => (
                      <th key={b.id} className={`px-2 py-1.5 border text-center align-middle min-w-[120px] ${theme.subHeader}`}>
                        <div className="flex items-center justify-between w-full gap-1">
                          <input
                            type="text"
                            placeholder={`Buyer ${bIdx + 1}`}
                            value={b.name}
                            onChange={(e) => updateBuyerName(b.id, e.target.value)}
                            disabled={isViewer}
                            className={BUYER_INPUT_CLASS}
                          />
                          {!isViewer && buyers.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeBuyer(b.id)}
                              className="no-print flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded border border-red-300 bg-white text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                              title="Remove Buyer"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className={`px-2 py-2 border text-center whitespace-nowrap font-extrabold uppercase tracking-wide ${theme.locked}`}>
                      Total
                    </th>
                  </React.Fragment>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {MONTHS.map((month) => {
              const row = data[month] || getEmptyMonth();
              return (
                <tr key={month}>
                  <td className="px-3 py-1.5 font-bold text-slate-900 sticky left-0 bg-slate-100 z-10 border border-slate-300">
                    {month}
                  </td>
                  
                  {sections.ops && (
                    <>
                      {opsColumns.map((col) => (
                        <td key={`${month}-${col.field}`} className={`px-1.5 py-1.5 border ${THEMES.ops.cell}`}>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={row[col.field] as string}
                            onChange={(e) => updateMonthField(month, col.field, e.target.value)}
                            disabled={isViewer}
                            className={INPUT_CLASS}
                          />
                        </td>
                      ))}
                    </>
                  )}

                  {BUYER_SECTIONS.map((secKey) => {
                    if (!sections[secKey]) return null;
                    const dataKey = secKey === 'prod' ? 'prodPcs' : secKey;
                    const theme = THEMES[secKey];

                    return (
                      <React.Fragment key={secKey}>
                        {buyers.map(b => (
                          <td key={`${month}-${secKey}-${b.id}`} className={`px-1.5 py-1.5 border ${theme.cell}`}>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={row[dataKey]?.[b.id] || ''}
                              onChange={(e) => updateBuyerQty(month, dataKey, b.id, e.target.value)}
                              disabled={isViewer}
                              className={INPUT_CLASS}
                            />
                          </td>
                        ))}
                        <td className={`px-3 py-1.5 text-right border ${theme.locked}`}>
                          {fmt(getSectionTotal(row, dataKey))}
                        </td>
                      </React.Fragment>
                    );
                  })}

                  {sections.remarks && (
                    <td className={`px-1.5 py-1.5 border ${THEMES.remarks.cell}`}>
                      <input
                        type="text"
                        value={row.remarks}
                        onChange={(e) => updateMonthField(month, 'remarks', e.target.value)}
                        disabled={isViewer}
                        className={REMARKS_INPUT_CLASS}
                        placeholder="Notes..."
                      />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>

          <tfoot className="text-xs">
            <tr>
              <td className="px-3 py-2 sticky left-0 bg-slate-300 text-slate-900 font-extrabold uppercase tracking-wider z-10 border border-slate-500">
                Total
              </td>
              
              {sections.ops && (
                <>
                  {opsFooterFields.map((field) => (
                    <td key={`tot-${field}`} className={`px-3 py-2 text-right border ${THEMES.ops.footer}`}>
                      {fmt(getFactoryYearTotal(field))}
                    </td>
                  ))}
                  <td className={`px-3 py-2 text-right border ${THEMES.ops.footerLocked}`}>{getAvgEfficiency()}</td>
                  <td className={`px-3 py-2 text-right border ${THEMES.ops.footer} text-slate-500`}>-</td>
                </>
              )}

              {BUYER_SECTIONS.map((secKey) => {
                if (!sections[secKey]) return null;
                const dataKey = secKey === 'prod' ? 'prodPcs' : secKey;
                const theme = THEMES[secKey];

                return (
                  <React.Fragment key={secKey}>
                    {buyers.map(b => (
                      <td key={`total-${secKey}-${b.id}`} className={`px-3 py-2 text-right border ${theme.footer}`}>
                        {fmt(getBuyerYearTotal(b.id, dataKey))}
                      </td>
                    ))}
                    <td className={`px-3 py-2 text-right border ${theme.footerLocked}`}>
                      {fmt(getColumnYearTotal(dataKey))}
                    </td>
                  </React.Fragment>
                );
              })}

              {sections.remarks && (
                <td className={`px-3 py-2 text-right border ${THEMES.remarks.footer}`}>-</td>
              )}
            </tr>
          </tfoot>
        </table>
      </div>

      {!isViewer && (
        <div className="mt-4 no-print">
          <button
            onClick={addBuyer}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-900 text-slate-900 hover:text-white border border-slate-900 rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus size={16} /> Add Buyer
          </button>
        </div>
      )}
    </div>
  );
}
