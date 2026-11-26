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
  averageSMV: string;
  remarks: string;
  prodPcs: Record<string, string>;
  shipPcs: Record<string, string>;
  shipKg: Record<string, string>;
  shipSam: Record<string, string>;
}

type FormData = Record<string, MonthData>;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

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
  const [exportMode, setExportMode] = useState<string>('all');

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
    if (['manPower', 'workingDays', 'availableHour', 'produceHour', 'totalMTO', 'averageSMV'].includes(field) && !isValidNumber(value)) return;
    
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

  const getEfficiency = (row: MonthData) => {
    const avail = n(row?.availableHour);
    const prod = n(row?.produceHour);
    return avail > 0 ? ((prod / avail) * 100).toFixed(2) : '0.00';
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
    let totalAvail = 0;
    let totalProd = 0;
    MONTHS.forEach(m => {
      totalAvail += n(data[m]?.availableHour);
      totalProd += n(data[m]?.produceHour);
    });
    return totalAvail > 0 ? ((totalProd / totalAvail) * 100).toFixed(2) : '0.00';
  };

  const generateHTMLTable = (includeOperations: boolean, includeProd: boolean, includeShipPcs: boolean, includeShipKg: boolean, includeShipSam: boolean) => {
    const title = `Production & Operations Report - ${safeYear}`;

    const letterhead = `
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #065f46; margin: 0; font-size: 24px;">Epyllion Group</h1>
        <h2 style="margin: 5px 0; font-size: 18px;">${unitInfo.fullName}</h2>
        <p style="margin: 0; font-size: 12px; color: #555;">${unitInfo.address}</p>
        <p style="margin: 5px 0; font-size: 14px; font-weight: bold;">${title}</p>
        <p style="margin: 2px 0; font-size: 12px; font-weight: bold; color: #065f46;">Reporting Year: ${safeYear}</p>
      </div>
    `;

    let tableHeaders = '<tr><th style="border: 1px solid #000; padding: 5px; background-color: #f3f4f6;">Month</th>';
    
    if (includeOperations) {
      tableHeaders += `
        <th style="border: 1px solid #000; padding: 5px; background-color: #ecfdf5;">Man Power</th>
        <th style="border: 1px solid #000; padding: 5px; background-color: #ecfdf5;">Working Days</th>
        <th style="border: 1px solid #000; padding: 5px; background-color: #ecfdf5;">Available Hour</th>
        <th style="border: 1px solid #000; padding: 5px; background-color: #ecfdf5;">Produce Hour</th>
        <th style="border: 1px solid #000; padding: 5px; background-color: #ecfdf5;">Total MTO</th>
        <th style="border: 1px solid #000; padding: 5px; background-color: #ecfdf5;">Efficiency (%)</th>
        <th style="border: 1px solid #000; padding: 5px; background-color: #ecfdf5;">Avg SMV</th>
      `;
    }
    
    const buildBuyerHeaders = (bgColor: string) => {
      let h = '';
      buyers.forEach(b => {
        h += `<th style="border: 1px solid #000; padding: 5px; background-color: ${bgColor};">${b.name || 'Unnamed'}</th>`;
      });
      h += `<th style="border: 1px solid #000; padding: 5px; background-color: ${bgColor}; font-weight: bold;">Total</th>`;
      return h;
    };

    if (includeProd) tableHeaders += buildBuyerHeaders('#eff6ff');
    if (includeShipPcs) tableHeaders += buildBuyerHeaders('#e0e7ff');
    if (includeShipKg) tableHeaders += buildBuyerHeaders('#fffbeb');
    if (includeShipSam) tableHeaders += buildBuyerHeaders('#fff7ed');
    
    tableHeaders += '<th style="border: 1px solid #000; padding: 5px; background-color: #f3f4f6;">Remarks</th></tr>';

    let tbody = '';
    MONTHS.forEach(m => {
      const row = data[m] || getEmptyMonth();
      tbody += `<tr><td style="border: 1px solid #000; padding: 5px; font-weight: bold;">${m}</td>`;
      
      if (includeOperations) {
        tbody += `
          <td style="border: 1px solid #000; padding: 5px; text-align: right;">${row.manPower || ''}</td>
          <td style="border: 1px solid #000; padding: 5px; text-align: right;">${row.workingDays || ''}</td>
          <td style="border: 1px solid #000; padding: 5px; text-align: right;">${row.availableHour || ''}</td>
          <td style="border: 1px solid #000; padding: 5px; text-align: right;">${row.produceHour || ''}</td>
          <td style="border: 1px solid #000; padding: 5px; text-align: right;">${row.totalMTO || ''}</td>
          <td style="border: 1px solid #000; padding: 5px; text-align: right;">${getEfficiency(row)}</td>
          <td style="border: 1px solid #000; padding: 5px; text-align: right;">${row.averageSMV || ''}</td>
        `;
      }

      const buildBuyerCells = (section: 'prodPcs' | 'shipPcs' | 'shipKg' | 'shipSam') => {
        let c = '';
        buyers.forEach(b => {
          c += `<td style="border: 1px solid #000; padding: 5px; text-align: right;">${row[section]?.[b.id] || ''}</td>`;
        });
        c += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold;">${fmt(getSectionTotal(row, section))}</td>`;
        return c;
      };

      if (includeProd) tbody += buildBuyerCells('prodPcs');
      if (includeShipPcs) tbody += buildBuyerCells('shipPcs');
      if (includeShipKg) tbody += buildBuyerCells('shipKg');
      if (includeShipSam) tbody += buildBuyerCells('shipSam');

      tbody += `<td style="border: 1px solid #000; padding: 5px;">${row.remarks || ''}</td></tr>`;
    });

    let tfoot = '<tr style="background-color: #f3f4f6; font-weight: bold;"><td style="border: 1px solid #000; padding: 5px;">Total</td>';
    
    if (includeOperations) {
      tfoot += `
        <td style="border: 1px solid #000; padding: 5px; text-align: right;">${fmt(getFactoryYearTotal('manPower'))}</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: right;">${fmt(getFactoryYearTotal('workingDays'))}</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: right;">${fmt(getFactoryYearTotal('availableHour'))}</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: right;">${fmt(getFactoryYearTotal('produceHour'))}</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: right;">${fmt(getFactoryYearTotal('totalMTO'))}</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: right;">${getAvgEfficiency()}</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: right;">-</td>
      `;
    }

    const buildBuyerFooter = (section: 'prodPcs' | 'shipPcs' | 'shipKg' | 'shipSam') => {
      let c = '';
      buyers.forEach(b => {
        c += `<td style="border: 1px solid #000; padding: 5px; text-align: right;">${fmt(getBuyerYearTotal(b.id, section))}</td>`;
      });
      c += `<td style="border: 1px solid #000; padding: 5px; text-align: right;">${fmt(getColumnYearTotal(section))}</td>`;
      return c;
    };

    if (includeProd) tfoot += buildBuyerFooter('prodPcs');
    if (includeShipPcs) tfoot += buildBuyerFooter('shipPcs');
    if (includeShipKg) tfoot += buildBuyerFooter('shipKg');
    if (includeShipSam) tfoot += buildBuyerFooter('shipSam');

    tfoot += '<td style="border: 1px solid #000; padding: 5px;">-</td></tr>';

    return `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; }
          table { border-collapse: collapse; width: 100%; font-size: 12px; }
          th, td { border: 1px solid #000; padding: 4px; }
        </style>
      </head>
      <body>
        ${letterhead}
        <table>
          <thead>${tableHeaders}</thead>
          <tbody>${tbody}</tbody>
          <tfoot>${tfoot}</tfoot>
        </table>
      </body>
      </html>
    `;
  };

  const handleExport = () => {
    let includeOps = false;
    let includeProd = false;
    let includeShipPcs = false;
    let includeShipKg = false;
    let includeShipSam = false;

    switch (exportMode) {
      case 'all':
        includeOps = true;
        includeProd = true;
        includeShipPcs = true;
        includeShipKg = true;
        includeShipSam = true;
        break;
      case 'prod_pcs':
        includeOps = true;
        includeProd = true;
        break;
      case 'ship_pcs':
        includeShipPcs = true;
        break;
      case 'ship_kg':
        includeShipKg = true;
        break;
      case 'ship_sam':
        includeShipSam = true;
        break;
      case 'ship_all':
        includeShipPcs = true;
        includeShipKg = true;
        includeShipSam = true;
        break;
    }

    const html = generateHTMLTable(includeOps, includeProd, includeShipPcs, includeShipKg, includeShipSam);
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

  return (
    <div className="w-full max-w-[95vw] mx-auto p-4 sm:p-6 bg-white rounded-xl shadow-sm print:shadow-none print:p-0">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: landscape; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-header { display: block !important; margin-bottom: 20px; text-align: center; }
          table { width: 100% !important; font-size: 10px !important; }
          th, td { padding: 4px !important; }
        }
      `}} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Production &amp; Operations</h1>
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
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              <Save size={16} /> Save Data ({safeYear})
            </button>
          )}
          {isSaved && (
            <span className="flex items-center gap-1 text-sm text-emerald-700 font-medium ml-2">
              <CheckCircle2 size={16} /> Saved
            </span>
          )}

          <div className="flex items-center rounded-lg border border-slate-300 overflow-hidden bg-white shadow-sm ml-2">
            <select
              value={exportMode}
              onChange={(e) => setExportMode(e.target.value)}
              className="text-sm px-3 py-2 bg-transparent outline-none border-r border-slate-300"
            >
              <option value="all">All Sections (Ops + Prod + All Shipments)</option>
              <option value="prod_pcs">Factory Operations + Production (pcs)</option>
              <option value="ship_pcs">Shipment Quantity (pcs) Only</option>
              <option value="ship_kg">Shipment Quantity (kg) Only</option>
              <option value="ship_sam">Shipment Quantity (SAM) Only</option>
              <option value="ship_all">All Shipments (pcs + kg + SAM)</option>
            </select>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold transition-colors"
            >
              <FileSpreadsheet size={16} /> Download Excel (.xls)
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-semibold shadow-sm transition-colors ml-2"
          >
            <Printer size={16} /> Print / Save PDF
          </button>
        </div>
      </div>

      <div className="hidden print-header">
        <h1 style={{ color: '#065f46', margin: 0, fontSize: '24px' }}>Epyllion Group</h1>
        <h2 style={{ margin: '5px 0', fontSize: '18px' }}>{unitInfo.fullName}</h2>
        <p style={{ margin: 0, fontSize: '12px', color: '#555' }}>{unitInfo.address}</p>
        <p style={{ margin: '5px 0', fontSize: '14px', fontWeight: 'bold' }}>Production &amp; Operations - {safeYear}</p>
        <p style={{ margin: '2px 0', fontSize: '12px', fontWeight: 'bold', color: '#065f46' }}>Reporting Year: {safeYear}</p>
      </div>

      {isViewer && (
        <div className="mb-4 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 no-print">
          <AlertCircle size={16} /> You are viewing this data in read-only mode. Contact an admin for edit access.
        </div>
      )}

      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600 font-semibold">
            <tr>
              <th className="px-2 py-2 sticky left-0 bg-slate-50 z-20 border-r border-slate-200 w-24 text-center">Month</th>
              <th colSpan={7} className="px-2 py-2 bg-emerald-50 text-emerald-800 border-r border-slate-200 text-center font-bold">Group 1: Factory Operations</th>
              <th colSpan={buyers.length + 1} className="px-2 py-2 bg-blue-50 text-blue-800 border-r border-slate-200 text-center font-bold">
                Group 2: Production Quantity (pcs)
              </th>
              <th colSpan={buyers.length + 1} className="px-2 py-2 bg-indigo-50 text-indigo-800 border-r border-slate-200 text-center font-bold">
                Group 3: Shipment Quantity (pcs)
              </th>
              <th colSpan={buyers.length + 1} className="px-2 py-2 bg-amber-50 text-amber-800 border-r border-slate-200 text-center font-bold">
                Group 4: Shipment Quantity (kg)
              </th>
              <th colSpan={buyers.length + 1} className="px-2 py-2 bg-orange-50 text-orange-800 border-r border-slate-200 text-center font-bold">
                Group 5: Shipment Quantity (SAM)
              </th>
              <th className="px-2 py-2 bg-gray-100 text-gray-800 text-center font-bold">Group 6: Remarks</th>
            </tr>
            
            <tr>
              <th className="px-2 py-2 sticky left-0 bg-slate-50 z-20 border-r border-slate-200"></th>
              
              <th className="px-2 py-2 text-center whitespace-nowrap">Man Power</th>
              <th className="px-2 py-2 text-center whitespace-nowrap">Working Days</th>
              <th className="px-2 py-2 text-center whitespace-nowrap">Available Hour</th>
              <th className="px-2 py-2 text-center whitespace-nowrap">Produce Hour</th>
              <th className="px-2 py-2 text-center whitespace-nowrap">Total MTO</th>
              <th className="px-2 py-2 text-center whitespace-nowrap bg-emerald-50/50">Efficiency (%)</th>
              <th className="px-2 py-2 text-center whitespace-nowrap border-r border-slate-200">Avg SMV</th>

              {['prodPcs', 'shipPcs', 'shipKg', 'shipSam'].map((section) => (
                <React.Fragment key={section}>
                  {buyers.map((b, bIdx) => (
                    <th key={b.id} className="px-2 py-1 text-center align-top min-w-[100px]">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center justify-between w-full gap-1">
                          <input
                            type="text"
                            placeholder={`Buyer ${bIdx + 1}`}
                            value={b.name}
                            onChange={(e) => updateBuyerName(b.id, e.target.value)}
                            disabled={isViewer}
                            className="w-full text-xs px-1 py-0.5 border border-slate-300 rounded text-center focus:outline-none focus:border-emerald-500 disabled:bg-transparent disabled:border-transparent"
                          />
                          {!isViewer && buyers.length > 1 && (
                            <button
                              onClick={() => removeBuyer(b.id)}
                              className="text-red-500 hover:text-red-700 no-print"
                              title="Remove Buyer"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </th>
                  ))}
                  <th className="px-2 py-2 text-center whitespace-nowrap font-bold bg-slate-100 border-r border-slate-200">Total</th>
                </React.Fragment>
              ))}

              <th className="px-2 py-2 text-center align-top min-w-[150px]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {MONTHS.map((month, idx) => {
              const row = data[month] || getEmptyMonth();
              return (
                <tr key={month} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="px-2 py-1 font-semibold text-slate-700 sticky left-0 bg-inherit z-10 border-r border-slate-200">{month}</td>
                  
                  <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.manPower} onChange={(e) => updateMonthField(month, 'manPower', e.target.value)} disabled={isViewer} className="w-20 px-2 py-1 text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" /></td>
                  <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.workingDays} onChange={(e) => updateMonthField(month, 'workingDays', e.target.value)} disabled={isViewer} className="w-20 px-2 py-1 text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" /></td>
                  <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.availableHour} onChange={(e) => updateMonthField(month, 'availableHour', e.target.value)} disabled={isViewer} className="w-20 px-2 py-1 text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" /></td>
                  <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.produceHour} onChange={(e) => updateMonthField(month, 'produceHour', e.target.value)} disabled={isViewer} className="w-20 px-2 py-1 text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" /></td>
                  <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.totalMTO} onChange={(e) => updateMonthField(month, 'totalMTO', e.target.value)} disabled={isViewer} className="w-20 px-2 py-1 text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" /></td>
                  <td className="px-2 py-1 text-right font-medium text-emerald-700 bg-emerald-50/30">{getEfficiency(row)}</td>
                  <td className="px-1 py-1 border-r border-slate-200"><input type="text" inputMode="decimal" value={row.averageSMV} onChange={(e) => updateMonthField(month, 'averageSMV', e.target.value)} disabled={isViewer} className="w-20 px-2 py-1 text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" /></td>

                  {buyers.map(b => (
                    <td key={`${month}-prod-${b.id}`} className="px-1 py-1">
                      <input type="text" inputMode="decimal" value={row.prodPcs?.[b.id] || ''} onChange={(e) => updateBuyerQty(month, 'prodPcs', b.id, e.target.value)} disabled={isViewer} className="w-20 px-2 py-1 text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" />
                    </td>
                  ))}
                  <td className="px-2 py-1 text-right font-bold text-blue-700 bg-blue-50/30 border-r border-slate-200">{fmt(getSectionTotal(row, 'prodPcs'))}</td>

                  {buyers.map(b => (
                    <td key={`${month}-shippcs-${b.id}`} className="px-1 py-1">
                      <input type="text" inputMode="decimal" value={row.shipPcs?.[b.id] || ''} onChange={(e) => updateBuyerQty(month, 'shipPcs', b.id, e.target.value)} disabled={isViewer} className="w-20 px-2 py-1 text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" />
                    </td>
                  ))}
                  <td className="px-2 py-1 text-right font-bold text-indigo-700 bg-indigo-50/30 border-r border-slate-200">{fmt(getSectionTotal(row, 'shipPcs'))}</td>

                  {buyers.map(b => (
                    <td key={`${month}-shipkg-${b.id}`} className="px-1 py-1">
                      <input type="text" inputMode="decimal" value={row.shipKg?.[b.id] || ''} onChange={(e) => updateBuyerQty(month, 'shipKg', b.id, e.target.value)} disabled={isViewer} className="w-20 px-2 py-1 text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" />
                    </td>
                  ))}
                  <td className="px-2 py-1 text-right font-bold text-amber-700 bg-amber-50/30 border-r border-slate-200">{fmt(getSectionTotal(row, 'shipKg'))}</td>

                  {buyers.map(b => (
                    <td key={`${month}-shipsam-${b.id}`} className="px-1 py-1">
                      <input type="text" inputMode="decimal" value={row.shipSam?.[b.id] || ''} onChange={(e) => updateBuyerQty(month, 'shipSam', b.id, e.target.value)} disabled={isViewer} className="w-20 px-2 py-1 text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" />
                    </td>
                  ))}
                  <td className="px-2 py-1 text-right font-bold text-orange-700 bg-orange-50/30 border-r border-slate-200">{fmt(getSectionTotal(row, 'shipSam'))}</td>

                  <td className="px-1 py-1">
                    <input type="text" value={row.remarks} onChange={(e) => updateMonthField(month, 'remarks', e.target.value)} disabled={isViewer} className="w-full min-w-[120px] px-2 py-1 border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" placeholder="Notes..." />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-xs">
            <tr>
              <td className="px-2 py-2 sticky left-0 bg-slate-100 z-10 border-r border-slate-300">Total</td>
              
              <td className="px-2 py-2 text-right">{fmt(getFactoryYearTotal('manPower'))}</td>
              <td className="px-2 py-2 text-right">{fmt(getFactoryYearTotal('workingDays'))}</td>
              <td className="px-2 py-2 text-right">{fmt(getFactoryYearTotal('availableHour'))}</td>
              <td className="px-2 py-2 text-right">{fmt(getFactoryYearTotal('produceHour'))}</td>
              <td className="px-2 py-2 text-right">{fmt(getFactoryYearTotal('totalMTO'))}</td>
              <td className="px-2 py-2 text-right text-emerald-800 bg-emerald-100/50">{getAvgEfficiency()}</td>
              <td className="px-2 py-2 text-right border-r border-slate-300 text-slate-400">-</td>

              {buyers.map(b => (
                <td key={`total-prod-${b.id}`} className="px-2 py-2 text-right text-blue-800">{fmt(getBuyerYearTotal(b.id, 'prodPcs'))}</td>
              ))}
              <td className="px-2 py-2 text-right text-blue-900 bg-blue-100/50 border-r border-slate-300">{fmt(getColumnYearTotal('prodPcs'))}</td>

              {buyers.map(b => (
                <td key={`total-shippcs-${b.id}`} className="px-2 py-2 text-right text-indigo-800">{fmt(getBuyerYearTotal(b.id, 'shipPcs'))}</td>
              ))}
              <td className="px-2 py-2 text-right text-indigo-900 bg-indigo-100/50 border-r border-slate-300">{fmt(getColumnYearTotal('shipPcs'))}</td>

              {buyers.map(b => (
                <td key={`total-shipkg-${b.id}`} className="px-2 py-2 text-right text-amber-800">{fmt(getBuyerYearTotal(b.id, 'shipKg'))}</td>
              ))}
              <td className="px-2 py-2 text-right text-amber-900 bg-amber-100/50 border-r border-slate-300">{fmt(getColumnYearTotal('shipKg'))}</td>

              {buyers.map(b => (
                <td key={`total-shipsam-${b.id}`} className="px-2 py-2 text-right text-orange-800">{fmt(getBuyerYearTotal(b.id, 'shipSam'))}</td>
              ))}
              <td className="px-2 py-2 text-right text-orange-900 bg-orange-100/50 border-r border-slate-300">{fmt(getColumnYearTotal('shipSam'))}</td>

              <td className="px-2 py-2 text-right text-slate-400">-</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {!isViewer && (
        <div className="mt-4 no-print">
          <button
            onClick={addBuyer}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus size={16} /> Add Buyer
          </button>
        </div>
      )}
    </div>
  );
}
