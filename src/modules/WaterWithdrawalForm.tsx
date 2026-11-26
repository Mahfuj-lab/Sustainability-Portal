import React, { useState, useEffect } from 'react';
import { Save, Plus, X, Printer, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { UNIT_DIRECTORY } from '../utils/unitDirectory';

export interface WaterWithdrawalFormProps {
  selectedUnit: string;
  selectedYear: string;
  userRole?: string;
  [key: string]: any;
}

interface MeterItem {
  id: string;
  name: string;
}

interface MonthData {
  municipalValues: Record<string, string>;
  municipalDomestic: string;
  municipalProduction: string;
  groundValues: Record<string, string>;
  groundDomestic: string;
  groundProduction: string;
  reuseValues: Record<string, string>;
  condensateRecovery: string;
  rainCollect: string;
  rainUse: string;
  boilerBlowdown: string;
  remarks: string;
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

const fmt = (val: number, decimals: number = 2): string => {
  return val.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const getEmptyMonth = (): MonthData => ({
  municipalValues: {},
  municipalDomestic: '',
  municipalProduction: '',
  groundValues: {},
  groundDomestic: '',
  groundProduction: '',
  reuseValues: {},
  condensateRecovery: '',
  rainCollect: '',
  rainUse: '',
  boilerBlowdown: '',
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

export default function WaterWithdrawalForm({
  selectedUnit,
  selectedYear,
  userRole,
}: WaterWithdrawalFormProps) {
  const isViewer = userRole === 'viewer';
  const safeUnit = selectedUnit || 'UNKNOWN';
  const safeYear = selectedYear || '2025';
  const storageKey = `water_withdrawal_${safeUnit}_${safeYear}`;
  const unitInfo = getUnitInfo(safeUnit);

  const [municipalMeters, setMunicipalMeters] = useState<MeterItem[]>([
    { id: 'm1', name: 'Meter 1' },
    { id: 'm2', name: 'Meter 2' },
  ]);

  const [groundMeters, setGroundMeters] = useState<MeterItem[]>([
    { id: 'g1', name: 'Meter 1' },
    { id: 'g2', name: 'Meter 2' },
  ]);

  const [reuseMeters, setReuseMeters] = useState<MeterItem[]>([
    { id: 'r1', name: 'Meter 1' },
    { id: 'r2', name: 'Meter 2' },
  ]);

  const [data, setData] = useState<FormData>({});
  const [isSaved, setIsSaved] = useState(false);

  const [sections, setSections] = useState({
    municipal: true,
    ground: true,
    extraction: true,
    reuse: true,
    rain: true,
    discharge: true,
    remarks: true,
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        
        if (parsed && Array.isArray(parsed.municipalMeters) && parsed.municipalMeters.length > 0) {
          setMunicipalMeters(parsed.municipalMeters);
        } else {
          setMunicipalMeters([{ id: 'm1', name: 'Meter 1' }, { id: 'm2', name: 'Meter 2' }]);
        }

        if (parsed && Array.isArray(parsed.groundMeters) && parsed.groundMeters.length > 0) {
          setGroundMeters(parsed.groundMeters);
        } else {
          setGroundMeters([{ id: 'g1', name: 'Meter 1' }, { id: 'g2', name: 'Meter 2' }]);
        }

        if (parsed && Array.isArray(parsed.reuseMeters) && parsed.reuseMeters.length > 0) {
          setReuseMeters(parsed.reuseMeters);
        } else {
          setReuseMeters([{ id: 'r1', name: 'Meter 1' }, { id: 'r2', name: 'Meter 2' }]);
        }

        if (parsed && parsed.data && typeof parsed.data === 'object') {
          const validatedData: FormData = {};
          MONTHS.forEach(m => {
            const rawMonth = parsed.data[m];
            validatedData[m] = rawMonth && typeof rawMonth === 'object' 
              ? {
                  municipalValues: rawMonth.municipalValues || {},
                  municipalDomestic: rawMonth.municipalDomestic || '',
                  municipalProduction: rawMonth.municipalProduction || '',
                  groundValues: rawMonth.groundValues || {},
                  groundDomestic: rawMonth.groundDomestic || '',
                  groundProduction: rawMonth.groundProduction || '',
                  reuseValues: rawMonth.reuseValues || {},
                  condensateRecovery: rawMonth.condensateRecovery || '',
                  rainCollect: rawMonth.rainCollect || '',
                  rainUse: rawMonth.rainUse || '',
                  boilerBlowdown: rawMonth.boilerBlowdown || '',
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
      localStorage.setItem(storageKey, JSON.stringify({ 
        municipalMeters, 
        groundMeters, 
        reuseMeters, 
        data 
      }));
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (e) {
      alert('Failed to save data to local storage.');
    }
  };

  const updateMonthField = (month: string, field: keyof MonthData, value: string) => {
    if (isViewer) return;
    if (typeof value === 'string' && !isValidNumber(value) && field !== 'remarks') return;
    setData(prev => ({
      ...prev,
      [month]: {
        ...(prev[month] || getEmptyMonth()),
        [field]: value,
      },
    }));
  };

  const updateNestedQty = (month: string, section: 'municipalValues' | 'groundValues' | 'reuseValues', id: string, value: string) => {
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

  const updateMeterName = (type: 'municipal' | 'ground' | 'reuse', id: string, name: string) => {
    if (isViewer) return;
    const setter = type === 'municipal' ? setMunicipalMeters : type === 'ground' ? setGroundMeters : setReuseMeters;
    setter(prev => prev.map(m => (m.id === id ? { ...m, name } : m)));
  };

  const addMeter = (type: 'municipal' | 'ground' | 'reuse') => {
    if (isViewer) return;
    const newId = `${type.charAt(0)}${Date.now()}`;
    const setter = type === 'municipal' ? setMunicipalMeters : type === 'ground' ? setGroundMeters : setReuseMeters;
    const defaultName = `Meter ${type === 'municipal' ? municipalMeters.length + 1 : type === 'ground' ? groundMeters.length + 1 : reuseMeters.length + 1}`;
    setter(prev => [...prev, { id: newId, name: defaultName }]);
  };

  const removeMeter = (type: 'municipal' | 'ground' | 'reuse', id: string) => {
    if (isViewer) return;
    const setter = type === 'municipal' ? setMunicipalMeters : type === 'ground' ? setGroundMeters : setReuseMeters;
    setter(prev => prev.filter(m => m.id !== id));
  };

  const getMunicipalTotal = (row: MonthData) => municipalMeters.reduce((sum, m) => sum + n(row.municipalValues?.[m.id]), 0);
  const getGroundTotal = (row: MonthData) => groundMeters.reduce((sum, m) => sum + n(row.groundValues?.[m.id]), 0);
  const getReuseTotal = (row: MonthData) => reuseMeters.reduce((sum, m) => sum + n(row.reuseValues?.[m.id]), 0) + n(row.condensateRecovery);

  const getGrandTotalExtraction = (row: MonthData) => getMunicipalTotal(row) + getGroundTotal(row);
  const getTotalDomestic = (row: MonthData) => n(row.municipalDomestic) + n(row.groundDomestic);
  const getTotalProduction = (row: MonthData) => n(row.municipalProduction) + n(row.groundProduction);
  
  const getDomesticWaterLoss = (row: MonthData) => getTotalDomestic(row) * 0.10;
  const getTotalDischarge = (row: MonthData) => (getTotalDomestic(row) - getDomesticWaterLoss(row)) + n(row.boilerBlowdown);

  const getYearlySum = (getter: (m: string, r: MonthData) => number) => {
    return MONTHS.reduce((sum, m) => sum + getter(m, data[m] || getEmptyMonth()), 0);
  };

  const generateHTMLTemplate = (isPrint: boolean = false) => {
    const title = `Water Withdrawal Report`;
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

    const monthRowSpan = 3;

    let headerRow1 = `<tr><th rowSpan="${monthRowSpan}" style="border: 1px solid #000; padding: 5px; background-color: #f3f4f6;">Month</th>`;
    let headerRow2 = `<tr>`;
    let headerRow3 = `<tr>`;

    if (sections.municipal) {
      headerRow1 += `<th colspan="${municipalMeters.length + 3}" style="border: 1px solid #000; padding: 5px; background-color: #fef3c7; text-align: center; font-weight: bold;">MUNICIPAL WATER (m³)</th>`;
      municipalMeters.forEach(() => {
        headerRow2 += `<th rowSpan="2" style="border: 1px solid #000; padding: 5px; background-color: #fef3c7; text-align: center; font-size: 11px;">&nbsp;</th>`;
      });
      headerRow2 += `<th rowSpan="2" style="border: 1px solid #000; padding: 5px; background-color: #fef3c7; text-align: center; font-size: 11px;">Total Municipal</th>`;
      headerRow2 += `<th rowSpan="2" style="border: 1px solid #000; padding: 5px; background-color: #fef3c7; text-align: center; font-size: 11px;">Domestic</th>`;
      headerRow2 += `<th rowSpan="2" style="border: 1px solid #000; padding: 5px; background-color: #fef3c7; text-align: center; font-size: 11px;">Production</th>`;
    }

    if (sections.ground) {
      headerRow1 += `<th colspan="${groundMeters.length + 3}" style="border: 1px solid #000; padding: 5px; background-color: #e0f2fe; text-align: center; font-weight: bold;">GROUND WATER (m³)</th>`;
      groundMeters.forEach(() => {
        headerRow2 += `<th rowSpan="2" style="border: 1px solid #000; padding: 5px; background-color: #e0f2fe; text-align: center; font-size: 11px;">&nbsp;</th>`;
      });
      headerRow2 += `<th rowSpan="2" style="border: 1px solid #000; padding: 5px; background-color: #e0f2fe; text-align: center; font-size: 11px;">Total Ground Water</th>`;
      headerRow2 += `<th rowSpan="2" style="border: 1px solid #000; padding: 5px; background-color: #e0f2fe; text-align: center; font-size: 11px;">Domestic</th>`;
      headerRow2 += `<th rowSpan="2" style="border: 1px solid #000; padding: 5px; background-color: #e0f2fe; text-align: center; font-size: 11px;">Production</th>`;
    }

    if (sections.extraction) {
      headerRow1 += `<th colspan="3" style="border: 1px solid #000; padding: 5px; background-color: #d1fae5; text-align: center; font-weight: bold;">TOTAL WATER EXTRACTION (m³)</th>`;
      headerRow2 += `<th rowSpan="2" style="border: 1px solid #000; padding: 5px; background-color: #d1fae5; text-align: center; font-size: 11px;">Grand Total</th>`;
      headerRow2 += `<th rowSpan="2" style="border: 1px solid #000; padding: 5px; background-color: #d1fae5; text-align: center; font-size: 11px;">Total Domestic</th>`;
      headerRow2 += `<th rowSpan="2" style="border: 1px solid #000; padding: 5px; background-color: #d1fae5; text-align: center; font-size: 11px;">Total Production</th>`;
    }

    if (sections.reuse) {
      headerRow1 += `<th colspan="${reuseMeters.length + 2}" style="border: 1px solid #000; padding: 5px; background-color: #ccfbf1; text-align: center; font-weight: bold;">WATER REUSE (m³)</th>`;
      reuseMeters.forEach(() => {
        headerRow2 += `<th rowSpan="2" style="border: 1px solid #000; padding: 5px; background-color: #ccfbf1; text-align: center; font-size: 11px;">&nbsp;</th>`;
      });
      headerRow2 += `<th rowSpan="2" style="border: 1px solid #000; padding: 5px; background-color: #ccfbf1; text-align: center; font-size: 11px;">Condensate Recovery</th>`;
      headerRow2 += `<th rowSpan="2" style="border: 1px solid #000; padding: 5px; background-color: #ccfbf1; text-align: center; font-size: 11px;">Total Reuse</th>`;
    }

    if (sections.rain) {
      headerRow1 += `<th colspan="2" style="border: 1px solid #000; padding: 5px; background-color: #e0e7ff; text-align: center; font-weight: bold;">RAINWATER HARVESTING (m³)</th>`;
      headerRow2 += `<th rowSpan="2" style="border: 1px solid #000; padding: 5px; background-color: #e0e7ff; text-align: center; font-size: 11px;">Collect</th>`;
      headerRow2 += `<th rowSpan="2" style="border: 1px solid #000; padding: 5px; background-color: #e0e7ff; text-align: center; font-size: 11px;">Use</th>`;
    }

    if (sections.discharge) {
      headerRow1 += `<th colspan="3" style="border: 1px solid #000; padding: 5px; background-color: #ffe4e6; text-align: center; font-weight: bold;">WATER DISCHARGE (m³)</th>`;
      headerRow2 += `<th rowSpan="2" style="border: 1px solid #000; padding: 5px; background-color: #ffe4e6; text-align: center; font-size: 11px;">Domestic Water Loss<br/><span style="font-size: 9px; font-weight: normal;">(Total Domestic Water - 10%)</span></th>`;
      headerRow2 += `<th rowSpan="2" style="border: 1px solid #000; padding: 5px; background-color: #ffe4e6; text-align: center; font-size: 11px;">Boiler Blowdown Water</th>`;
      headerRow2 += `<th rowSpan="2" style="border: 1px solid #000; padding: 5px; background-color: #ffe4e6; text-align: center; font-size: 11px;">Total Discharge Water<br/><span style="font-size: 9px; font-weight: normal;">(Discharge = Domestic Water - 10% of Domestic + Boiler Blowdown)</span></th>`;
    }

    if (sections.remarks) {
      headerRow1 += `<th rowSpan="${monthRowSpan}" style="border: 1px solid #000; padding: 5px; background-color: #f3f4f6; text-align: center; font-weight: bold;">REMARKS</th>`;
    }

    headerRow1 += `</tr>`;
    headerRow2 += `</tr>`;

    // Only add third row if we have municipal or ground meters (they need sub-headers)
    let tableHeadersHtml = headerRow1 + headerRow2;
    
    if (sections.municipal || sections.ground) {
      if (sections.municipal) {
        municipalMeters.forEach((m) => {
          headerRow3 += `<th style="border: 1px solid #000; padding: 5px; background-color: #fef3c7; text-align: center; font-size: 11px;">${m.name}</th>`;
        });
      }
      if (sections.ground) {
        groundMeters.forEach((m) => {
          headerRow3 += `<th style="border: 1px solid #000; padding: 5px; background-color: #e0f2fe; text-align: center; font-size: 11px;">${m.name}</th>`;
        });
      }
      headerRow3 += `</tr>`;
      tableHeadersHtml += headerRow3;
    }

    let tbody = '';
    MONTHS.forEach(m => {
      const row = data[m] || getEmptyMonth();
      tbody += `<tr><td style="border: 1px solid #000; padding: 5px; font-weight: bold; font-size: 11px;">${m}</td>`;

      if (sections.municipal) {
        municipalMeters.forEach(meter => {
          tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(n(row.municipalValues?.[meter.id]), 2)}</td>`;
        });
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-size: 11px; background-color: #fef3c7;">${fmt(getMunicipalTotal(row), 2)}</td>`;
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(n(row.municipalDomestic), 2)}</td>`;
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(n(row.municipalProduction), 2)}</td>`;
      }

      if (sections.ground) {
        groundMeters.forEach(meter => {
          tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(n(row.groundValues?.[meter.id]), 2)}</td>`;
        });
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-size: 11px; background-color: #e0f2fe;">${fmt(getGroundTotal(row), 2)}</td>`;
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(n(row.groundDomestic), 2)}</td>`;
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(n(row.groundProduction), 2)}</td>`;
      }

      if (sections.extraction) {
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-size: 11px; background-color: #d1fae5;">${fmt(getGrandTotalExtraction(row), 2)}</td>`;
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-size: 11px; background-color: #d1fae5;">${fmt(getTotalDomestic(row), 2)}</td>`;
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-size: 11px; background-color: #d1fae5;">${fmt(getTotalProduction(row), 2)}</td>`;
      }

      if (sections.reuse) {
        reuseMeters.forEach(meter => {
          tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(n(row.reuseValues?.[meter.id]), 2)}</td>`;
        });
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(n(row.condensateRecovery), 2)}</td>`;
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-size: 11px; background-color: #ccfbf1;">${fmt(getReuseTotal(row), 2)}</td>`;
      }

      if (sections.rain) {
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(n(row.rainCollect), 2)}</td>`;
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(n(row.rainUse), 2)}</td>`;
      }

      if (sections.discharge) {
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getDomesticWaterLoss(row), 2)}</td>`;
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(n(row.boilerBlowdown), 2)}</td>`;
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-size: 11px; background-color: #ffe4e6;">${fmt(getTotalDischarge(row), 2)}</td>`;
      }

      if (sections.remarks) {
        tbody += `<td style="border: 1px solid #000; padding: 5px; font-size: 11px;">${row.remarks || ''}</td>`;
      }
      tbody += `</tr>`;
    });

    let tfoot = '<tr style="background-color: #f3f4f6; font-weight: bold;"><td style="border: 1px solid #000; padding: 5px; font-size: 11px;">Total</td>';

    if (sections.municipal) {
      municipalMeters.forEach(meter => {
        let sum = 0;
        MONTHS.forEach(m => { sum += n(data[m]?.municipalValues?.[meter.id]); });
        tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(sum, 2)}</td>`;
      });
      tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px; background-color: #fef3c7;">${fmt(getYearlySum((m, r) => getMunicipalTotal(r)), 2)}</td>`;
      tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum((m, r) => n(r.municipalDomestic)), 2)}</td>`;
      tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum((m, r) => n(r.municipalProduction)), 2)}</td>`;
    }

    if (sections.ground) {
      groundMeters.forEach(meter => {
        let sum = 0;
        MONTHS.forEach(m => { sum += n(data[m]?.groundValues?.[meter.id]); });
        tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(sum, 2)}</td>`;
      });
      tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px; background-color: #e0f2fe;">${fmt(getYearlySum((m, r) => getGroundTotal(r)), 2)}</td>`;
      tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum((m, r) => n(r.groundDomestic)), 2)}</td>`;
      tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum((m, r) => n(r.groundProduction)), 2)}</td>`;
    }

    if (sections.extraction) {
      tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px; background-color: #d1fae5;">${fmt(getYearlySum((m, r) => getGrandTotalExtraction(r)), 2)}</td>`;
      tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px; background-color: #d1fae5;">${fmt(getYearlySum((m, r) => getTotalDomestic(r)), 2)}</td>`;
      tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px; background-color: #d1fae5;">${fmt(getYearlySum((m, r) => getTotalProduction(r)), 2)}</td>`;
    }

    if (sections.reuse) {
      reuseMeters.forEach(meter => {
        let sum = 0;
        MONTHS.forEach(m => { sum += n(data[m]?.reuseValues?.[meter.id]); });
        tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(sum, 2)}</td>`;
      });
      tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum((m, r) => n(r.condensateRecovery)), 2)}</td>`;
      tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px; background-color: #ccfbf1;">${fmt(getYearlySum((m, r) => getReuseTotal(r)), 2)}</td>`;
    }

    if (sections.rain) {
      tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum((m, r) => n(r.rainCollect)), 2)}</td>`;
      tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum((m, r) => n(r.rainUse)), 2)}</td>`;
    }

    if (sections.discharge) {
      tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum((m, r) => getDomesticWaterLoss(r)), 2)}</td>`;
      tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum((m, r) => n(r.boilerBlowdown)), 2)}</td>`;
      tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px; background-color: #ffe4e6;">${fmt(getYearlySum((m, r) => getTotalDischarge(r)), 2)}</td>`;
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
        <title>Water Withdrawal - ${safeUnit} - ${safeYear}</title>
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
          <thead>${tableHeadersHtml}</thead>
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
    link.download = `Water_Withdrawal_${safeUnit}_${safeYear}.xls`;
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

  return (
    <div className="w-full max-w-[95vw] mx-auto p-4 sm:p-6 bg-white rounded-xl shadow-sm">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Water Withdrawal</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
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
        <span className="font-semibold text-slate-700 mr-2">Report Sections:</span>
        
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={sections.municipal} onChange={() => setSections(p => ({...p, municipal: !p.municipal}))} className="accent-yellow-600 w-4 h-4" />
          <span>Municipal Water</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={sections.ground} onChange={() => setSections(p => ({...p, ground: !p.ground}))} className="accent-sky-600 w-4 h-4" />
          <span>Ground Water</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={sections.extraction} onChange={() => setSections(p => ({...p, extraction: !p.extraction}))} className="accent-emerald-600 w-4 h-4" />
          <span>Total Extraction</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={sections.reuse} onChange={() => setSections(p => ({...p, reuse: !p.reuse}))} className="accent-teal-600 w-4 h-4" />
          <span>Water Reuse</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={sections.rain} onChange={() => setSections(p => ({...p, rain: !p.rain}))} className="accent-indigo-600 w-4 h-4" />
          <span>Rainwater Harvesting</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={sections.discharge} onChange={() => setSections(p => ({...p, discharge: !p.discharge}))} className="accent-rose-600 w-4 h-4" />
          <span>Water Discharge</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={sections.remarks} onChange={() => setSections(p => ({...p, remarks: !p.remarks}))} className="accent-gray-600 w-4 h-4" />
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
              <th rowSpan={3} className="px-2 py-2 sticky left-0 bg-slate-50 z-20 border-r border-slate-200 w-24 text-center">Month</th>
              
              {sections.municipal && (
                <th colSpan={municipalMeters.length + 3} className="px-2 py-2 bg-yellow-100 text-yellow-900 border-r border-slate-200 text-center font-bold uppercase tracking-wider">
                  Municipal Water (m³)
                </th>
              )}

              {sections.ground && (
                <th colSpan={groundMeters.length + 3} className="px-2 py-2 bg-sky-100 text-sky-900 border-r border-slate-200 text-center font-bold uppercase tracking-wider">
                  Ground Water (m³)
                </th>
              )}

              {sections.extraction && (
                <th colSpan={3} className="px-2 py-2 bg-emerald-100 text-emerald-900 border-r border-slate-200 text-center font-bold uppercase tracking-wider">
                  Total Water Extraction (m³)
                </th>
              )}

              {sections.reuse && (
                <th colSpan={reuseMeters.length + 2} className="px-2 py-2 bg-teal-100 text-teal-900 border-r border-slate-200 text-center font-bold uppercase tracking-wider">
                  Water Reuse (m³)
                </th>
              )}

              {sections.rain && (
                <th colSpan={2} className="px-2 py-2 bg-indigo-100 text-indigo-900 border-r border-slate-200 text-center font-bold uppercase tracking-wider">
                  Rainwater Harvesting (m³)
                </th>
              )}

              {sections.discharge && (
                <th colSpan={3} className="px-2 py-2 bg-rose-100 text-rose-900 border-r border-slate-200 text-center font-bold uppercase tracking-wider">
                  Water Discharge (m³)
                </th>
              )}

              {sections.remarks && (
                <th rowSpan={3} className="px-2 py-2 bg-gray-100 text-gray-900 text-center font-bold uppercase tracking-wider">
                  Remarks
                </th>
              )}
            </tr>
            
            <tr>
              {sections.municipal && (
                <>
                  {municipalMeters.map((m) => (
                    <th key={m.id} rowSpan={2} className="px-2 py-1 text-center bg-yellow-50 min-w-[100px]">
                      <div className="flex flex-col items-center gap-1">
                        <input
                          type="text"
                          value={m.name}
                          onChange={(e) => updateMeterName('municipal', m.id, e.target.value)}
                          disabled={isViewer}
                          className="w-full text-xs px-1 py-0.5 border border-slate-300 rounded text-center focus:outline-none focus:border-yellow-500 disabled:bg-transparent disabled:border-transparent"
                        />
                        {!isViewer && municipalMeters.length > 1 && (
                          <button onClick={() => removeMeter('municipal', m.id)} className="text-red-500 hover:text-red-700 no-print">
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                  <th rowSpan={2} className="px-2 py-2 text-center whitespace-nowrap bg-yellow-50/50 border-l border-slate-200">Total Municipal</th>
                  <th rowSpan={2} className="px-2 py-2 text-center whitespace-nowrap bg-yellow-50/50">Domestic</th>
                  <th rowSpan={2} className="px-2 py-2 text-center whitespace-nowrap bg-yellow-50/50">Production</th>
                </>
              )}

              {sections.ground && (
                <>
                  {groundMeters.map((m) => (
                    <th key={m.id} rowSpan={2} className="px-2 py-1 text-center bg-sky-50 min-w-[100px]">
                      <div className="flex flex-col items-center gap-1">
                        <input
                          type="text"
                          value={m.name}
                          onChange={(e) => updateMeterName('ground', m.id, e.target.value)}
                          disabled={isViewer}
                          className="w-full text-xs px-1 py-0.5 border border-slate-300 rounded text-center focus:outline-none focus:border-sky-500 disabled:bg-transparent disabled:border-transparent"
                        />
                        {!isViewer && groundMeters.length > 1 && (
                          <button onClick={() => removeMeter('ground', m.id)} className="text-red-500 hover:text-red-700 no-print">
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                  <th rowSpan={2} className="px-2 py-2 text-center whitespace-nowrap bg-sky-50/50 border-l border-slate-200">Total Ground Water</th>
                  <th rowSpan={2} className="px-2 py-2 text-center whitespace-nowrap bg-sky-50/50">Domestic</th>
                  <th rowSpan={2} className="px-2 py-2 text-center whitespace-nowrap bg-sky-50/50">Production</th>
                </>
              )}

              {sections.extraction && (
                <>
                  <th rowSpan={2} className="px-2 py-2 text-center whitespace-nowrap bg-emerald-50/50 border-l border-slate-200">Grand Total</th>
                  <th rowSpan={2} className="px-2 py-2 text-center whitespace-nowrap bg-emerald-50/50">Total Domestic</th>
                  <th rowSpan={2} className="px-2 py-2 text-center whitespace-nowrap bg-emerald-50/50">Total Production</th>
                </>
              )}

              {sections.reuse && (
                <>
                  {reuseMeters.map((m) => (
                    <th key={m.id} rowSpan={2} className="px-2 py-1 text-center bg-teal-50 min-w-[100px]">
                      <div className="flex flex-col items-center gap-1">
                        <input
                          type="text"
                          value={m.name}
                          onChange={(e) => updateMeterName('reuse', m.id, e.target.value)}
                          disabled={isViewer}
                          className="w-full text-xs px-1 py-0.5 border border-slate-300 rounded text-center focus:outline-none focus:border-teal-500 disabled:bg-transparent disabled:border-transparent"
                        />
                        {!isViewer && reuseMeters.length > 1 && (
                          <button onClick={() => removeMeter('reuse', m.id)} className="text-red-500 hover:text-red-700 no-print">
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                  <th rowSpan={2} className="px-2 py-2 text-center whitespace-nowrap bg-teal-50/50 border-l border-slate-200">Condensate Recovery</th>
                  <th rowSpan={2} className="px-2 py-2 text-center whitespace-nowrap bg-teal-50/50">Total Reuse</th>
                </>
              )}

              {sections.rain && (
                <>
                  <th rowSpan={2} className="px-2 py-2 text-center whitespace-nowrap bg-indigo-50/50">Collect</th>
                  <th rowSpan={2} className="px-2 py-2 text-center whitespace-nowrap bg-indigo-50/50">Use</th>
                </>
              )}

              {sections.discharge && (
                <>
                  <th rowSpan={2} className="px-2 py-2 text-center bg-rose-50/50 border-l border-slate-200 min-w-[130px]">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs">Domestic Water Loss</span>
                      <span className="text-[10px] text-slate-500 font-normal">(Total Domestic Water - 10%)</span>
                    </div>
                  </th>
                  <th rowSpan={2} className="px-2 py-2 text-center whitespace-nowrap bg-rose-50/50 min-w-[120px]">Boiler Blowdown Water</th>
                  <th rowSpan={2} className="px-2 py-2 text-center bg-rose-50/50 min-w-[160px]">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs">Total Discharge Water</span>
                      <span className="text-[10px] text-slate-500 font-normal">(Discharge = Domestic Water - 10% of Domestic + Boiler Blowdown)</span>
                    </div>
                  </th>
                </>
              )}
            </tr>
            
            {(sections.municipal || sections.ground) && (
              <tr>
                {sections.municipal && (
                  <>
                    {municipalMeters.map((m) => (
                      <th key={`sub-${m.id}`} className="px-1 py-1 text-center text-[10px] bg-yellow-50/30">
                        {m.name}
                      </th>
                    ))}
                  </>
                )}
                {sections.ground && (
                  <>
                    {groundMeters.map((m) => (
                      <th key={`sub-${m.id}`} className="px-1 py-1 text-center text-[10px] bg-sky-50/30">
                        {m.name}
                      </th>
                    ))}
                  </>
                )}
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {MONTHS.map((month, idx) => {
              const row = data[month] || getEmptyMonth();
              return (
                <tr key={month} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="px-2 py-1 font-semibold text-slate-700 sticky left-0 bg-inherit z-10 border-r border-slate-200">{month}</td>
                  
                  {sections.municipal && (
                    <>
                      {municipalMeters.map(m => (
                        <td key={`row-${month}-${m.id}`} className="px-1 py-1 bg-yellow-50/10">
                          <input type="text" inputMode="decimal" value={row.municipalValues?.[m.id] || ''} onChange={(e) => updateNestedQty(month, 'municipalValues', m.id, e.target.value)} disabled={isViewer} className="w-20 px-2 py-1 text-right border border-transparent hover:border-slate-300 focus:border-yellow-500 rounded bg-transparent outline-none text-xs" />
                        </td>
                      ))}
                      <td className="px-2 py-1 text-right font-bold text-yellow-700 bg-yellow-50/30 border-l border-slate-200">{fmt(getMunicipalTotal(row), 2)}</td>
                      <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.municipalDomestic} onChange={(e) => updateMonthField(month, 'municipalDomestic', e.target.value)} disabled={isViewer} className="w-20 px-2 py-1 text-right border border-transparent hover:border-slate-300 focus:border-yellow-500 rounded bg-transparent outline-none text-xs" /></td>
                      <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.municipalProduction} onChange={(e) => updateMonthField(month, 'municipalProduction', e.target.value)} disabled={isViewer} className="w-20 px-2 py-1 text-right border border-transparent hover:border-slate-300 focus:border-yellow-500 rounded bg-transparent outline-none text-xs" /></td>
                    </>
                  )}

                  {sections.ground && (
                    <>
                      {groundMeters.map(m => (
                        <td key={`row-${month}-${m.id}`} className="px-1 py-1 bg-sky-50/10">
                          <input type="text" inputMode="decimal" value={row.groundValues?.[m.id] || ''} onChange={(e) => updateNestedQty(month, 'groundValues', m.id, e.target.value)} disabled={isViewer} className="w-20 px-2 py-1 text-right border border-transparent hover:border-slate-300 focus:border-sky-500 rounded bg-transparent outline-none text-xs" />
                        </td>
                      ))}
                      <td className="px-2 py-1 text-right font-bold text-sky-700 bg-sky-50/30 border-l border-slate-200">{fmt(getGroundTotal(row), 2)}</td>
                      <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.groundDomestic} onChange={(e) => updateMonthField(month, 'groundDomestic', e.target.value)} disabled={isViewer} className="w-20 px-2 py-1 text-right border border-transparent hover:border-slate-300 focus:border-sky-500 rounded bg-transparent outline-none text-xs" /></td>
                      <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.groundProduction} onChange={(e) => updateMonthField(month, 'groundProduction', e.target.value)} disabled={isViewer} className="w-20 px-2 py-1 text-right border border-transparent hover:border-slate-300 focus:border-sky-500 rounded bg-transparent outline-none text-xs" /></td>
                    </>
                  )}

                  {sections.extraction && (
                    <>
                      <td className="px-2 py-1 text-right font-bold text-emerald-700 bg-emerald-50/30 border-l border-slate-200">{fmt(getGrandTotalExtraction(row), 2)}</td>
                      <td className="px-2 py-1 text-right font-bold text-emerald-700 bg-emerald-50/30">{fmt(getTotalDomestic(row), 2)}</td>
                      <td className="px-2 py-1 text-right font-bold text-emerald-700 bg-emerald-50/30">{fmt(getTotalProduction(row), 2)}</td>
                    </>
                  )}

                  {sections.reuse && (
                    <>
                      {reuseMeters.map(m => (
                        <td key={`row-${month}-${m.id}`} className="px-1 py-1 bg-teal-50/10">
                          <input type="text" inputMode="decimal" value={row.reuseValues?.[m.id] || ''} onChange={(e) => updateNestedQty(month, 'reuseValues', m.id, e.target.value)} disabled={isViewer} className="w-20 px-2 py-1 text-right border border-transparent hover:border-slate-300 focus:border-teal-500 rounded bg-transparent outline-none text-xs" />
                        </td>
                      ))}
                      <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.condensateRecovery} onChange={(e) => updateMonthField(month, 'condensateRecovery', e.target.value)} disabled={isViewer} className="w-20 px-2 py-1 text-right border border-transparent hover:border-slate-300 focus:border-teal-500 rounded bg-transparent outline-none text-xs" /></td>
                      <td className="px-2 py-1 text-right font-bold text-teal-700 bg-teal-50/30 border-l border-slate-200">{fmt(getReuseTotal(row), 2)}</td>
                    </>
                  )}

                  {sections.rain && (
                    <>
                      <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.rainCollect} onChange={(e) => updateMonthField(month, 'rainCollect', e.target.value)} disabled={isViewer} className="w-20 px-2 py-1 text-right border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded bg-transparent outline-none text-xs" /></td>
                      <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.rainUse} onChange={(e) => updateMonthField(month, 'rainUse', e.target.value)} disabled={isViewer} className="w-20 px-2 py-1 text-right border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded bg-transparent outline-none text-xs" /></td>
                    </>
                  )}

                  {sections.discharge && (
                    <>
                      <td className="px-2 py-1 text-right text-rose-700 bg-rose-50/30 border-l border-slate-200">{fmt(getDomesticWaterLoss(row), 2)}</td>
                      <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.boilerBlowdown} onChange={(e) => updateMonthField(month, 'boilerBlowdown', e.target.value)} disabled={isViewer} className="w-20 px-2 py-1 text-right border border-transparent hover:border-slate-300 focus:border-rose-500 rounded bg-transparent outline-none text-xs" /></td>
                      <td className="px-2 py-1 text-right font-bold text-rose-700 bg-rose-50/30">{fmt(getTotalDischarge(row), 2)}</td>
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
              
              {sections.municipal && (
                <>
                  {municipalMeters.map(m => {
                    let sum = 0;
                    MONTHS.forEach(month => { sum += n(data[month]?.municipalValues?.[m.id]); });
                    return <td key={`tot-${m.id}`} className="px-2 py-2 text-right text-yellow-800 bg-yellow-100/20">{fmt(sum, 2)}</td>;
                  })}
                  <td className="px-2 py-2 text-right text-yellow-800 bg-yellow-100/50">{fmt(getYearlySum((m, r) => getMunicipalTotal(r)), 2)}</td>
                  <td className="px-2 py-2 text-right text-yellow-800 bg-yellow-100/20">{fmt(getYearlySum((m, r) => n(r.municipalDomestic)), 2)}</td>
                  <td className="px-2 py-2 text-right text-yellow-800 bg-yellow-100/20">{fmt(getYearlySum((m, r) => n(r.municipalProduction)), 2)}</td>
                </>
              )}

              {sections.ground && (
                <>
                  {groundMeters.map(m => {
                    let sum = 0;
                    MONTHS.forEach(month => { sum += n(data[month]?.groundValues?.[m.id]); });
                    return <td key={`tot-${m.id}`} className="px-2 py-2 text-right text-sky-800 bg-sky-100/20">{fmt(sum, 2)}</td>;
                  })}
                  <td className="px-2 py-2 text-right text-sky-800 bg-sky-100/50">{fmt(getYearlySum((m, r) => getGroundTotal(r)), 2)}</td>
                  <td className="px-2 py-2 text-right text-sky-800 bg-sky-100/20">{fmt(getYearlySum((m, r) => n(r.groundDomestic)), 2)}</td>
                  <td className="px-2 py-2 text-right text-sky-800 bg-sky-100/20">{fmt(getYearlySum((m, r) => n(r.groundProduction)), 2)}</td>
                </>
              )}

              {sections.extraction && (
                <>
                  <td className="px-2 py-2 text-right text-emerald-800 bg-emerald-100/50">{fmt(getYearlySum((m, r) => getGrandTotalExtraction(r)), 2)}</td>
                  <td className="px-2 py-2 text-right text-emerald-800 bg-emerald-100/50">{fmt(getYearlySum((m, r) => getTotalDomestic(r)), 2)}</td>
                  <td className="px-2 py-2 text-right text-emerald-800 bg-emerald-100/50">{fmt(getYearlySum((m, r) => getTotalProduction(r)), 2)}</td>
                </>
              )}

              {sections.reuse && (
                <>
                  {reuseMeters.map(m => {
                    let sum = 0;
                    MONTHS.forEach(month => { sum += n(data[month]?.reuseValues?.[m.id]); });
                    return <td key={`tot-${m.id}`} className="px-2 py-2 text-right text-teal-800 bg-teal-100/20">{fmt(sum, 2)}</td>;
                  })}
                  <td className="px-2 py-2 text-right text-teal-800 bg-teal-100/20">{fmt(getYearlySum((m, r) => n(r.condensateRecovery)), 2)}</td>
                  <td className="px-2 py-2 text-right text-teal-800 bg-teal-100/50">{fmt(getYearlySum((m, r) => getReuseTotal(r)), 2)}</td>
                </>
              )}

              {sections.rain && (
                <>
                  <td className="px-2 py-2 text-right text-indigo-800 bg-indigo-100/50">{fmt(getYearlySum((m, r) => n(r.rainCollect)), 2)}</td>
                  <td className="px-2 py-2 text-right text-indigo-800 bg-indigo-100/50">{fmt(getYearlySum((m, r) => n(r.rainUse)), 2)}</td>
                </>
              )}

              {sections.discharge && (
                <>
                  <td className="px-2 py-2 text-right text-rose-800 bg-rose-100/50">{fmt(getYearlySum((m, r) => getDomesticWaterLoss(r)), 2)}</td>
                  <td className="px-2 py-2 text-right text-rose-800 bg-rose-100/20">{fmt(getYearlySum((m, r) => n(r.boilerBlowdown)), 2)}</td>
                  <td className="px-2 py-2 text-right text-rose-800 bg-rose-100/50">{fmt(getYearlySum((m, r) => getTotalDischarge(r)), 2)}</td>
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
          {sections.municipal && (
            <button onClick={() => addMeter('municipal')} className="flex items-center gap-2 px-4 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200 rounded-lg text-sm font-semibold transition-colors">
              <Plus size={16} /> Add Municipal Meter
            </button>
          )}
          {sections.ground && (
            <button onClick={() => addMeter('ground')} className="flex items-center gap-2 px-4 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg text-sm font-semibold transition-colors">
              <Plus size={16} /> Add Ground Water Meter
            </button>
          )}
          {sections.reuse && (
            <button onClick={() => addMeter('reuse')} className="flex items-center gap-2 px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-lg text-sm font-semibold transition-colors">
              <Plus size={16} /> Add Reuse Meter
            </button>
          )}
        </div>
      )}
    </div>
  );
}
