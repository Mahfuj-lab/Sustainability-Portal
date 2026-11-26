import React, { useState, useEffect } from 'react';
import { Save, Plus, X, Printer, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { UNIT_DIRECTORY } from '../utils/unitDirectory';

export interface PurchaseElectricitySolarFormProps {
  selectedUnit: string;
  selectedYear: string;
  userRole?: string;
  [key: string]: any;
}

interface Meter {
  id: string;
  name: string;
}

interface MonthData {
  offPeak: Record<string, string>;
  peak: Record<string, string>;
  flat: Record<string, string>;
  totalTK: string;
  purchaseDomestic: string;
  purchaseProduction: string;
  solar: Record<string, string>;
  generators: Record<string, string>;
  remarks: string;
}

type FormData = Record<string, MonthData>;

type SectionKey = 'purchase' | 'solar' | 'generated' | 'remarks';

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
  offPeak: {},
  peak: {},
  flat: {},
  totalTK: '',
  purchaseDomestic: '',
  purchaseProduction: '',
  solar: {},
  generators: {},
  remarks: '',
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

export default function PurchaseElectricitySolarForm({
  selectedUnit,
  selectedYear,
  userRole,
}: PurchaseElectricitySolarFormProps) {
  const isViewer = userRole === 'viewer';
  const safeUnit = selectedUnit || 'UNKNOWN';
  const safeYear = selectedYear || '2025';
  const storageKey = `elec_solar_${safeUnit}_${safeYear}`;
  const unitInfo = getUnitInfo(safeUnit);

  const [meters, setMeters] = useState<Meter[]>([
    { id: 'm1', name: 'Meter 1' },
    { id: 'm2', name: 'Meter 2' },
  ]);

  const [solarMeters, setSolarMeters] = useState<Meter[]>([
    { id: 's1', name: 'Solar Meter 1' },
    { id: 's2', name: 'Solar Meter 2' },
  ]);

  const [generators, setGenerators] = useState<Meter[]>([
    { id: 'g1', name: 'Generator 1' },
    { id: 'g2', name: 'Generator 2' },
  ]);

  const [data, setData] = useState<FormData>({});
  const [isSaved, setIsSaved] = useState(false);

  const [sections, setSections] = useState<Record<SectionKey, boolean>>({
    purchase: true,
    solar: true,
    generated: true,
    remarks: true,
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        
        if (parsed && Array.isArray(parsed.meters) && parsed.meters.length > 0) setMeters(parsed.meters);
        else setMeters([{ id: 'm1', name: 'Meter 1' }, { id: 'm2', name: 'Meter 2' }]);

        if (parsed && Array.isArray(parsed.solarMeters) && parsed.solarMeters.length > 0) setSolarMeters(parsed.solarMeters);
        else setSolarMeters([{ id: 's1', name: 'Solar Meter 1' }, { id: 's2', name: 'Solar Meter 2' }]);

        if (parsed && Array.isArray(parsed.generators) && parsed.generators.length > 0) setGenerators(parsed.generators);
        else setGenerators([{ id: 'g1', name: 'Generator 1' }, { id: 'g2', name: 'Generator 2' }]);

        if (parsed && parsed.data && typeof parsed.data === 'object') {
          const validatedData: FormData = {};
          MONTHS.forEach(m => {
            const rawMonth = parsed.data[m];
            validatedData[m] = rawMonth && typeof rawMonth === 'object' 
              ? {
                  offPeak: rawMonth.offPeak || {},
                  peak: rawMonth.peak || {},
                  flat: rawMonth.flat || {},
                  totalTK: rawMonth.totalTK || '',
                  purchaseDomestic: rawMonth.purchaseDomestic || '',
                  purchaseProduction: rawMonth.purchaseProduction || '',
                  solar: rawMonth.solar || {},
                  generators: rawMonth.generators || {},
                  remarks: rawMonth.remarks || '',
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
      console.error('Failed to load local storage', e);
      const initialData: FormData = {};
      MONTHS.forEach(m => { initialData[m] = getEmptyMonth(); });
      setData(initialData);
    }
  }, [storageKey]);

  const handleSave = () => {
    if (isViewer) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ meters, solarMeters, generators, data }));
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (e) {
      alert('Failed to save data to local storage.');
    }
  };

  const updateMonthField = (month: string, field: keyof MonthData, value: string) => {
    if (isViewer) return;
    if (['totalTK', 'purchaseDomestic', 'purchaseProduction'].includes(field) && !isValidNumber(value)) return;
    setData(prev => ({
      ...prev,
      [month]: {
        ...(prev[month] || getEmptyMonth()),
        [field]: value,
      },
    }));
  };

  const updateNestedQty = (month: string, section: 'offPeak' | 'peak' | 'flat' | 'solar' | 'generators', id: string, value: string) => {
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
            [id]: value,
          },
        },
      };
    });
  };

  const updateMeterName = (type: 'meters' | 'solarMeters' | 'generators', id: string, name: string) => {
    if (isViewer) return;
    const setter = type === 'meters' ? setMeters : type === 'solarMeters' ? setSolarMeters : setGenerators;
    setter(prev => prev.map(m => (m.id === id ? { ...m, name } : m)));
  };

  const addMeter = (type: 'meters' | 'solarMeters' | 'generators') => {
    if (isViewer) return;
    const newId = `${type.charAt(0)}${Date.now()}`;
    const setter = type === 'meters' ? setMeters : type === 'solarMeters' ? setSolarMeters : setGenerators;
    const defaultName = type === 'meters' ? 'New Meter' : type === 'solarMeters' ? 'New Solar Meter' : 'New Generator';
    setter(prev => [...prev, { id: newId, name: defaultName }]);
  };

  const removeMeter = (type: 'meters' | 'solarMeters' | 'generators', id: string) => {
    if (isViewer) return;
    const setter = type === 'meters' ? setMeters : type === 'solarMeters' ? setSolarMeters : setGenerators;
    setter(prev => prev.filter(m => m.id !== id));
  };

  // Calculations
  const getPurchaseTotal = (row: MonthData) => {
    return meters.reduce((sum, m) => sum + n(row.offPeak?.[m.id]) + n(row.peak?.[m.id]) + n(row.flat?.[m.id]), 0);
  };

  const getSolarTotal = (row: MonthData) => {
    return solarMeters.reduce((sum, m) => sum + n(row.solar?.[m.id]), 0);
  };

  const getGeneratedTotal = (row: MonthData) => {
    return generators.reduce((sum, m) => sum + n(row.generators?.[m.id]), 0);
  };

  const getSolarAllocation = (row: MonthData, type: 'domestic' | 'production') => {
    const totalPurchaseAlloc = n(row.purchaseDomestic) + n(row.purchaseProduction);
    const solarTotal = getSolarTotal(row);
    if (totalPurchaseAlloc > 0) {
      const ratio = type === 'domestic' ? n(row.purchaseDomestic) / totalPurchaseAlloc : n(row.purchaseProduction) / totalPurchaseAlloc;
      return solarTotal * ratio;
    }
    return 0;
  };

  const getGeneratedAllocation = (row: MonthData, type: 'domestic' | 'production') => {
    const totalPurchaseAlloc = n(row.purchaseDomestic) + n(row.purchaseProduction);
    const genTotal = getGeneratedTotal(row);
    if (totalPurchaseAlloc > 0) {
      const ratio = type === 'domestic' ? n(row.purchaseDomestic) / totalPurchaseAlloc : n(row.purchaseProduction) / totalPurchaseAlloc;
      return genTotal * ratio;
    }
    return 0;
  };

  const getYearlySum = (section: 'purchaseTotal' | 'totalTK' | 'purchaseDomestic' | 'purchaseProduction' | 'solarTotal' | 'solarDomestic' | 'solarProduction' | 'genTotal' | 'genDomestic' | 'genProduction') => {
    return MONTHS.reduce((sum, m) => {
      const row = data[m] || getEmptyMonth();
      if (section === 'purchaseTotal') return sum + getPurchaseTotal(row);
      if (section === 'totalTK') return sum + n(row.totalTK);
      if (section === 'purchaseDomestic') return sum + n(row.purchaseDomestic);
      if (section === 'purchaseProduction') return sum + n(row.purchaseProduction);
      if (section === 'solarTotal') return sum + getSolarTotal(row);
      if (section === 'solarDomestic') return sum + getSolarAllocation(row, 'domestic');
      if (section === 'solarProduction') return sum + getSolarAllocation(row, 'production');
      if (section === 'genTotal') return sum + getGeneratedTotal(row);
      if (section === 'genDomestic') return sum + getGeneratedAllocation(row, 'domestic');
      if (section === 'genProduction') return sum + getGeneratedAllocation(row, 'production');
      return sum;
    }, 0);
  };

  const getMeterYearlyTotal = (meterId: string, subCol: 'offPeak' | 'peak' | 'flat') => {
    return MONTHS.reduce((sum, m) => sum + n(data[m]?.[subCol]?.[meterId]), 0);
  };

  const getSolarMeterYearlyTotal = (meterId: string) => {
    return MONTHS.reduce((sum, m) => sum + n(data[m]?.solar?.[meterId]), 0);
  };

  const getGenMeterYearlyTotal = (meterId: string) => {
    return MONTHS.reduce((sum, m) => sum + n(data[m]?.generators?.[meterId]), 0);
  };

  const generateHTMLTemplate = (isPrint: boolean = false) => {
    const title = `Purchase Electricity & Solar Report`;
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
    
    if (sections.purchase) {
      tableHeaders += `<th colspan="${(meters.length * 3) + 4}" style="border: 1px solid #000; padding: 5px; background-color: #fef3c7; text-align: center; font-weight: bold;">PURCHASE ELECTRICITY (KWH)</th>`;
    }
    if (sections.solar) {
      tableHeaders += `<th colspan="${solarMeters.length + 4}" style="border: 1px solid #000; padding: 5px; background-color: #dbeafe; text-align: center; font-weight: bold;">SOLAR ELECTRICITY (KWH)</th>`;
    }
    if (sections.generated) {
      tableHeaders += `<th colspan="${generators.length + 4}" style="border: 1px solid #000; padding: 5px; background-color: #ffedd5; text-align: center; font-weight: bold;">GENERATED ELECTRICITY (KWH)</th>`;
    }
    if (sections.remarks) {
      tableHeaders += `<th style="border: 1px solid #000; padding: 5px; background-color: #f3f4f6; text-align: center; font-weight: bold;">REMARKS</th>`;
    }
    tableHeaders += '</tr><tr><th style="border: 1px solid #000; padding: 5px; background-color: #f3f4f6;"></th>';

    // Sub-headers row
    if (sections.purchase) {
      meters.forEach(m => {
        tableHeaders += `<th colspan="3" style="border: 1px solid #000; padding: 5px; background-color: #fef3c7; text-align: center; font-size: 11px;">${m.name}</th>`;
      });
      tableHeaders += `<th rowspan="2" style="border: 1px solid #000; padding: 5px; background-color: #fef3c7; text-align: center; font-size: 11px;">Total Purchase</th>`;
      tableHeaders += `<th rowspan="2" style="border: 1px solid #000; padding: 5px; background-color: #fef3c7; text-align: center; font-size: 11px;">Total TK (BDT)</th>`;
      tableHeaders += `<th rowspan="2" style="border: 1px solid #000; padding: 5px; background-color: #fef3c7; text-align: center; font-size: 11px;">Domestic Use</th>`;
      tableHeaders += `<th rowspan="2" style="border: 1px solid #000; padding: 5px; background-color: #fef3c7; text-align: center; font-size: 11px;">Production Use</th>`;
    }
    if (sections.solar) {
      solarMeters.forEach(m => {
        tableHeaders += `<th rowspan="2" style="border: 1px solid #000; padding: 5px; background-color: #dbeafe; text-align: center; font-size: 11px;">${m.name}</th>`;
      });
      tableHeaders += `<th rowspan="2" style="border: 1px solid #000; padding: 5px; background-color: #dbeafe; text-align: center; font-size: 11px;">Total Solar</th>`;
      tableHeaders += `<th rowspan="2" style="border: 1px solid #000; padding: 5px; background-color: #dbeafe; text-align: center; font-size: 11px;">Domestic Use</th>`;
      tableHeaders += `<th rowspan="2" style="border: 1px solid #000; padding: 5px; background-color: #dbeafe; text-align: center; font-size: 11px;">Production Use</th>`;
    }
    if (sections.generated) {
      generators.forEach(m => {
        tableHeaders += `<th rowspan="2" style="border: 1px solid #000; padding: 5px; background-color: #ffedd5; text-align: center; font-size: 11px;">${m.name}</th>`;
      });
      tableHeaders += `<th rowspan="2" style="border: 1px solid #000; padding: 5px; background-color: #ffedd5; text-align: center; font-size: 11px;">Total Generated</th>`;
      tableHeaders += `<th rowspan="2" style="border: 1px solid #000; padding: 5px; background-color: #ffedd5; text-align: center; font-size: 11px;">Domestic Use</th>`;
      tableHeaders += `<th rowspan="2" style="border: 1px solid #000; padding: 5px; background-color: #ffedd5; text-align: center; font-size: 11px;">Production Use</th>`;
    }
    if (sections.remarks) {
      tableHeaders += `<th rowspan="2" style="border: 1px solid #000; padding: 5px; background-color: #f3f4f6;"></th>`;
    }
    tableHeaders += '</tr><tr>';

    if (sections.purchase) {
      meters.forEach(() => {
        tableHeaders += `
          <th style="border: 1px solid #000; padding: 3px; background-color: #fef3c7; font-size: 10px;">Off Peak</th>
          <th style="border: 1px solid #000; padding: 3px; background-color: #fef3c7; font-size: 10px;">Peak</th>
          <th style="border: 1px solid #000; padding: 3px; background-color: #fef3c7; font-size: 10px;">Flat Rate</th>
        `;
      });
    }
    tableHeaders += '</tr>';

    let tbody = '';
    MONTHS.forEach(m => {
      const row = data[m] || getEmptyMonth();
      tbody += `<tr><td style="border: 1px solid #000; padding: 5px; font-weight: bold; font-size: 11px;">${m}</td>`;
      
      if (sections.purchase) {
        meters.forEach(meter => {
          tbody += `
            <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${row.offPeak?.[meter.id] || ''}</td>
            <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${row.peak?.[meter.id] || ''}</td>
            <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${row.flat?.[meter.id] || ''}</td>
          `;
        });
        tbody += `
          <td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-size: 11px;">${fmt(getPurchaseTotal(row))}</td>
          <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${row.totalTK || ''}</td>
          <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${row.purchaseDomestic || ''}</td>
          <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${row.purchaseProduction || ''}</td>
        `;
      }

      if (sections.solar) {
        solarMeters.forEach(meter => {
          tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${row.solar?.[meter.id] || ''}</td>`;
        });
        tbody += `
          <td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-size: 11px;">${fmt(getSolarTotal(row))}</td>
          <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getSolarAllocation(row, 'domestic'))}</td>
          <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getSolarAllocation(row, 'production'))}</td>
        `;
      }

      if (sections.generated) {
        generators.forEach(meter => {
          tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${row.generators?.[meter.id] || ''}</td>`;
        });
        tbody += `
          <td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-size: 11px;">${fmt(getGeneratedTotal(row))}</td>
          <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getGeneratedAllocation(row, 'domestic'))}</td>
          <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getGeneratedAllocation(row, 'production'))}</td>
        `;
      }

      if (sections.remarks) {
        tbody += `<td style="border: 1px solid #000; padding: 5px; font-size: 11px;">${row.remarks || ''}</td>`;
      }
      tbody += `</tr>`;
    });

    let tfoot = '<tr style="background-color: #f3f4f6; font-weight: bold;"><td style="border: 1px solid #000; padding: 5px; font-size: 11px;">Total</td>';
    
    if (sections.purchase) {
      meters.forEach(meter => {
        tfoot += `
          <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getMeterYearlyTotal(meter.id, 'offPeak'))}</td>
          <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getMeterYearlyTotal(meter.id, 'peak'))}</td>
          <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getMeterYearlyTotal(meter.id, 'flat'))}</td>
        `;
      });
      tfoot += `
        <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum('purchaseTotal'))}</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum('totalTK'))}</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum('purchaseDomestic'))}</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum('purchaseProduction'))}</td>
      `;
    }

    if (sections.solar) {
      solarMeters.forEach(meter => {
        tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getSolarMeterYearlyTotal(meter.id))}</td>`;
      });
      tfoot += `
        <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum('solarTotal'))}</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum('solarDomestic'))}</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum('solarProduction'))}</td>
      `;
    }

    if (sections.generated) {
      generators.forEach(meter => {
        tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getGenMeterYearlyTotal(meter.id))}</td>`;
      });
      tfoot += `
        <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum('genTotal'))}</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum('genDomestic'))}</td>
        <td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum('genProduction'))}</td>
      `;
    }

    if (sections.remarks) {
      tfoot += `<td style="border: 1px solid #000; padding: 5px; font-size: 11px;">-</td>`;
    }
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
        <title>Purchase Electricity & Solar - ${safeUnit} - ${safeYear}</title>
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
    link.download = `Purchase_Electricity_Solar_${safeUnit}_${safeYear}.xls`;
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

  return (
    <div className="w-full max-w-[95vw] mx-auto p-4 sm:p-6 bg-white rounded-xl shadow-sm">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Purchase Electricity &amp; Solar</h1>
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

      <div className="mb-4 bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-wrap items-center gap-4 text-sm no-print">
        <span className="font-semibold text-slate-700 mr-2">Report Columns / Sections to Export &amp; Print:</span>
        
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={sections.purchase} onChange={() => toggleSection('purchase')} className="accent-amber-600 w-4 h-4" />
          <span>Purchase Electricity (kWh)</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={sections.solar} onChange={() => toggleSection('solar')} className="accent-blue-600 w-4 h-4" />
          <span>Solar Electricity (kWh)</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={sections.generated} onChange={() => toggleSection('generated')} className="accent-orange-600 w-4 h-4" />
          <span>Generated Electricity (kWh)</span>
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

      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600 font-semibold">
            <tr>
              <th className="px-2 py-2 sticky left-0 bg-slate-50 z-20 border-r border-slate-200 w-24 text-center" rowSpan={2}>Month</th>
              {sections.purchase && (
                <th colSpan={(meters.length * 3) + 4} className="px-2 py-2 bg-amber-100 text-amber-900 border-r border-slate-200 text-center font-bold uppercase tracking-wider">
                  Purchase Electricity (kWh)
                </th>
              )}
              {sections.solar && (
                <th colSpan={solarMeters.length + 3} className="px-2 py-2 bg-blue-100 text-blue-900 border-r border-slate-200 text-center font-bold uppercase tracking-wider">
                  Solar Electricity (kWh)
                </th>
              )}
              {sections.generated && (
                <th colSpan={generators.length + 3} className="px-2 py-2 bg-orange-100 text-orange-900 border-r border-slate-200 text-center font-bold uppercase tracking-wider">
                  Generated Electricity (kWh)
                </th>
              )}
              {sections.remarks && (
                <th className="px-2 py-2 bg-gray-100 text-gray-900 text-center font-bold uppercase tracking-wider" rowSpan={2}>
                  Remarks
                </th>
              )}
            </tr>
            
            <tr>
              {sections.purchase && (
                <>
                  {meters.map((m, idx) => (
                    <React.Fragment key={m.id}>
                      <th colSpan={3} className="px-2 py-1 text-center bg-amber-50 min-w-[120px]">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <input
                            type="text"
                            value={m.name}
                            onChange={(e) => updateMeterName('meters', m.id, e.target.value)}
                            disabled={isViewer}
                            className="w-full text-xs px-1 py-0.5 border border-slate-300 rounded text-center focus:outline-none focus:border-amber-500 disabled:bg-transparent disabled:border-transparent"
                          />
                          {!isViewer && meters.length > 1 && (
                            <button onClick={() => removeMeter('meters', m.id)} className="text-red-500 hover:text-red-700 no-print">
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </th>
                    </React.Fragment>
                  ))}
                  <th rowSpan={2} className="px-2 py-2 text-center whitespace-nowrap bg-amber-50/50 border-l border-slate-200">Total Purchase</th>
                  <th rowSpan={2} className="px-2 py-2 text-center whitespace-nowrap bg-amber-50/50">Total TK</th>
                  <th rowSpan={2} className="px-2 py-2 text-center whitespace-nowrap bg-amber-50/50">Domestic Use</th>
                  <th rowSpan={2} className="px-2 py-2 text-center whitespace-nowrap bg-amber-50/50 border-r border-slate-200">Production Use</th>
                </>
              )}

              {sections.solar && (
                <>
                  {solarMeters.map((m) => (
                    <th key={m.id} rowSpan={2} className="px-2 py-1 text-center bg-blue-50 min-w-[100px]">
                      <div className="flex flex-col items-center gap-1">
                        <input
                          type="text"
                          value={m.name}
                          onChange={(e) => updateMeterName('solarMeters', m.id, e.target.value)}
                          disabled={isViewer}
                          className="w-full text-xs px-1 py-0.5 border border-slate-300 rounded text-center focus:outline-none focus:border-blue-500 disabled:bg-transparent disabled:border-transparent"
                        />
                        {!isViewer && solarMeters.length > 1 && (
                          <button onClick={() => removeMeter('solarMeters', m.id)} className="text-red-500 hover:text-red-700 no-print">
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                  <th rowSpan={2} className="px-2 py-2 text-center whitespace-nowrap bg-blue-50/50 border-l border-slate-200">Total Solar</th>
                  <th rowSpan={2} className="px-2 py-2 text-center whitespace-nowrap bg-blue-50/50">Domestic Use (Auto)</th>
                  <th rowSpan={2} className="px-2 py-2 text-center whitespace-nowrap bg-blue-50/50 border-r border-slate-200">Production Use (Auto)</th>
                </>
              )}

              {sections.generated && (
                <>
                  {generators.map((m) => (
                    <th key={m.id} rowSpan={2} className="px-2 py-1 text-center bg-orange-50 min-w-[100px]">
                      <div className="flex flex-col items-center gap-1">
                        <input
                          type="text"
                          value={m.name}
                          onChange={(e) => updateMeterName('generators', m.id, e.target.value)}
                          disabled={isViewer}
                          className="w-full text-xs px-1 py-0.5 border border-slate-300 rounded text-center focus:outline-none focus:border-orange-500 disabled:bg-transparent disabled:border-transparent"
                        />
                        {!isViewer && generators.length > 1 && (
                          <button onClick={() => removeMeter('generators', m.id)} className="text-red-500 hover:text-red-700 no-print">
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                  <th rowSpan={2} className="px-2 py-2 text-center whitespace-nowrap bg-orange-50/50 border-l border-slate-200">Total Generated</th>
                  <th rowSpan={2} className="px-2 py-2 text-center whitespace-nowrap bg-orange-50/50">Domestic Use (Auto)</th>
                  <th rowSpan={2} className="px-2 py-2 text-center whitespace-nowrap bg-orange-50/50 border-r border-slate-200">Production Use (Auto)</th>
                </>
              )}
            </tr>
            <tr>
              {sections.purchase && (
                <>
                  {meters.map((m) => (
                    <React.Fragment key={`sub-${m.id}`}>
                      <th className="px-1 py-1 text-center text-[10px] bg-amber-50/30 border-l border-slate-200">Off Peak</th>
                      <th className="px-1 py-1 text-center text-[10px] bg-amber-50/30">Peak</th>
                      <th className="px-1 py-1 text-center text-[10px] bg-amber-50/30">Flat Rate</th>
                    </React.Fragment>
                  ))}
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {MONTHS.map((month, idx) => {
              const row = data[month] || getEmptyMonth();
              return (
                <tr key={month} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="px-2 py-1 font-semibold text-slate-700 sticky left-0 bg-inherit z-10 border-r border-slate-200">{month}</td>
                  
                  {sections.purchase && (
                    <>
                      {meters.map(m => (
                        <React.Fragment key={`row-${month}-${m.id}`}>
                          <td className="px-1 py-1 border-l border-slate-200"><input type="text" inputMode="decimal" value={row.offPeak?.[m.id] || ''} onChange={(e) => updateNestedQty(month, 'offPeak', m.id, e.target.value)} disabled={isViewer} className="w-16 px-1 py-1 text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" /></td>
                          <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.peak?.[m.id] || ''} onChange={(e) => updateNestedQty(month, 'peak', m.id, e.target.value)} disabled={isViewer} className="w-16 px-1 py-1 text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" /></td>
                          <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.flat?.[m.id] || ''} onChange={(e) => updateNestedQty(month, 'flat', m.id, e.target.value)} disabled={isViewer} className="w-16 px-1 py-1 text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" /></td>
                        </React.Fragment>
                      ))}
                      <td className="px-2 py-1 text-right font-bold text-amber-700 bg-amber-50/30 border-l border-slate-200">{fmt(getPurchaseTotal(row))}</td>
                      <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.totalTK} onChange={(e) => updateMonthField(month, 'totalTK', e.target.value)} disabled={isViewer} className="w-20 px-2 py-1 text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" /></td>
                      <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.purchaseDomestic} onChange={(e) => updateMonthField(month, 'purchaseDomestic', e.target.value)} disabled={isViewer} className="w-20 px-2 py-1 text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" /></td>
                      <td className="px-1 py-1 border-r border-slate-200"><input type="text" inputMode="decimal" value={row.purchaseProduction} onChange={(e) => updateMonthField(month, 'purchaseProduction', e.target.value)} disabled={isViewer} className="w-20 px-2 py-1 text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" /></td>
                    </>
                  )}

                  {sections.solar && (
                    <>
                      {solarMeters.map(m => (
                        <td key={`row-${month}-${m.id}`} className="px-1 py-1">
                          <input type="text" inputMode="decimal" value={row.solar?.[m.id] || ''} onChange={(e) => updateNestedQty(month, 'solar', m.id, e.target.value)} disabled={isViewer} className="w-20 px-2 py-1 text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" />
                        </td>
                      ))}
                      <td className="px-2 py-1 text-right font-bold text-blue-700 bg-blue-50/30 border-l border-slate-200">{fmt(getSolarTotal(row))}</td>
                      <td className="px-2 py-1 text-right text-blue-700 bg-blue-50/10">{fmt(getSolarAllocation(row, 'domestic'))}</td>
                      <td className="px-2 py-1 text-right text-blue-700 bg-blue-50/10 border-r border-slate-200">{fmt(getSolarAllocation(row, 'production'))}</td>
                    </>
                  )}

                  {sections.generated && (
                    <>
                      {generators.map(m => (
                        <td key={`row-${month}-${m.id}`} className="px-1 py-1">
                          <input type="text" inputMode="decimal" value={row.generators?.[m.id] || ''} onChange={(e) => updateNestedQty(month, 'generators', m.id, e.target.value)} disabled={isViewer} className="w-20 px-2 py-1 text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" />
                        </td>
                      ))}
                      <td className="px-2 py-1 text-right font-bold text-orange-700 bg-orange-50/30 border-l border-slate-200">{fmt(getGeneratedTotal(row))}</td>
                      <td className="px-2 py-1 text-right text-orange-700 bg-orange-50/10">{fmt(getGeneratedAllocation(row, 'domestic'))}</td>
                      <td className="px-2 py-1 text-right text-orange-700 bg-orange-50/10 border-r border-slate-200">{fmt(getGeneratedAllocation(row, 'production'))}</td>
                    </>
                  )}

                  {sections.remarks && (
                    <td className="px-1 py-1">
                      <input type="text" value={row.remarks} onChange={(e) => updateMonthField(month, 'remarks', e.target.value)} disabled={isViewer} className="w-full min-w-[120px] px-2 py-1 border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" placeholder="Notes..." />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-xs">
            <tr>
              <td className="px-2 py-2 sticky left-0 bg-slate-100 z-10 border-r border-slate-300">Total</td>
              
              {sections.purchase && (
                <>
                  {meters.map(m => (
                    <React.Fragment key={`tot-${m.id}`}>
                      <td className="px-1 py-2 text-right border-l border-slate-200">{fmt(getMeterYearlyTotal(m.id, 'offPeak'))}</td>
                      <td className="px-1 py-2 text-right">{fmt(getMeterYearlyTotal(m.id, 'peak'))}</td>
                      <td className="px-1 py-2 text-right">{fmt(getMeterYearlyTotal(m.id, 'flat'))}</td>
                    </React.Fragment>
                  ))}
                  <td className="px-2 py-2 text-right text-amber-800 bg-amber-100/50 border-l border-slate-200">{fmt(getYearlySum('purchaseTotal'))}</td>
                  <td className="px-2 py-2 text-right text-amber-800">{fmt(getYearlySum('totalTK'))}</td>
                  <td className="px-2 py-2 text-right text-amber-800">{fmt(getYearlySum('purchaseDomestic'))}</td>
                  <td className="px-2 py-2 text-right text-amber-800 border-r border-slate-300">{fmt(getYearlySum('purchaseProduction'))}</td>
                </>
              )}

              {sections.solar && (
                <>
                  {solarMeters.map(m => (
                    <td key={`tot-${m.id}`} className="px-2 py-2 text-right text-blue-800">{fmt(getSolarMeterYearlyTotal(m.id))}</td>
                  ))}
                  <td className="px-2 py-2 text-right text-blue-800 bg-blue-100/50 border-l border-slate-200">{fmt(getYearlySum('solarTotal'))}</td>
                  <td className="px-2 py-2 text-right text-blue-800 bg-blue-100/50">{fmt(getYearlySum('solarDomestic'))}</td>
                  <td className="px-2 py-2 text-right text-blue-800 bg-blue-100/50 border-r border-slate-300">{fmt(getYearlySum('solarProduction'))}</td>
                </>
              )}

              {sections.generated && (
                <>
                  {generators.map(m => (
                    <td key={`tot-${m.id}`} className="px-2 py-2 text-right text-orange-800">{fmt(getGenMeterYearlyTotal(m.id))}</td>
                  ))}
                  <td className="px-2 py-2 text-right text-orange-800 bg-orange-100/50 border-l border-slate-200">{fmt(getYearlySum('genTotal'))}</td>
                  <td className="px-2 py-2 text-right text-orange-800 bg-orange-100/50">{fmt(getYearlySum('genDomestic'))}</td>
                  <td className="px-2 py-2 text-right text-orange-800 bg-orange-100/50 border-r border-slate-300">{fmt(getYearlySum('genProduction'))}</td>
                </>
              )}

              {sections.remarks && (
                <td className="px-2 py-2 text-right text-slate-400">-</td>
              )}
            </tr>
          </tfoot>
        </table>
      </div>

      {!isViewer && (
        <div className="mt-4 flex flex-wrap gap-3 no-print">
          {sections.purchase && (
            <button onClick={() => addMeter('meters')} className="flex items-center gap-2 px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-sm font-semibold transition-colors">
              <Plus size={16} /> Add Meter
            </button>
          )}
          {sections.solar && (
            <button onClick={() => addMeter('solarMeters')} className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-sm font-semibold transition-colors">
              <Plus size={16} /> Add Solar Meter
            </button>
          )}
          {sections.generated && (
            <button onClick={() => addMeter('generators')} className="flex items-center gap-2 px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-lg text-sm font-semibold transition-colors">
              <Plus size={16} /> Add Generator
            </button>
          )}
        </div>
      )}
    </div>
  );
}
