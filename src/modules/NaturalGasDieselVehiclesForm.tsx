import React, { useState, useEffect } from 'react';
import { Save, Plus, X, Printer, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { UNIT_DIRECTORY } from '../utils/unitDirectory';

export interface NaturalGasDieselVehiclesFormProps {
  selectedUnit: string;
  selectedYear: string;
  userRole?: string;
  [key: string]: any;
}

interface MeterItem {
  id: string;
  name: string;
  subLabel: string;
}

interface MonthData {
  ngValues: Record<string, string>;
  totalTkNG: string;
  genDieselValues: Record<string, string>;
  boilerDieselValues: Record<string, string>;
  totalTkDiesel: string;
  vehDieselL: string;
  vehDieselTk: string;
  vehCngM3: string;
  vehCngTk: string;
  vehOctaneL: string;
  vehOctaneTk: string;
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
  ngValues: {},
  totalTkNG: '',
  genDieselValues: {},
  boilerDieselValues: {},
  totalTkDiesel: '',
  vehDieselL: '',
  vehDieselTk: '',
  vehCngM3: '',
  vehCngTk: '',
  vehOctaneL: '',
  vehOctaneTk: '',
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

export default function NaturalGasDieselVehiclesForm({
  selectedUnit,
  selectedYear,
  userRole,
}: NaturalGasDieselVehiclesFormProps) {
  const isViewer = userRole === 'viewer';
  const safeUnit = selectedUnit || 'UNKNOWN';
  const safeYear = selectedYear || '2025';
  const storageKey = `ng_diesel_veh_${safeUnit}_${safeYear}`;
  const elecSolarKey = `elec_solar_${safeUnit}_${safeYear}`;
  const unitInfo = getUnitInfo(safeUnit);

  const [ngMeters, setNgMeters] = useState<MeterItem[]>([
    { id: 'ng1', name: 'Meter 1', subLabel: '' },
    { id: 'ng2', name: 'Meter 2', subLabel: '' },
  ]);

  const [generators, setGenerators] = useState<MeterItem[]>([
    { id: 'g1', name: 'Generator 1', subLabel: '' },
    { id: 'g2', name: 'Generator 2', subLabel: '' },
  ]);

  const [boilers, setBoilers] = useState<MeterItem[]>([
    { id: 'b1', name: 'Boiler 1', subLabel: '' },
    { id: 'b2', name: 'Boiler 2', subLabel: '' },
  ]);

  const [data, setData] = useState<FormData>({});
  const [elecRatio, setElecRatio] = useState<Record<string, { dom: number; prod: number }>>({});
  const [isSaved, setIsSaved] = useState(false);
  
  const [energyFactors, setEnergyFactors] = useState({ 
    ngMjPerM3: 38.30, 
    ngKwhPerM3: 10.64, 
    dieselMjPerLiter: 35.80 
  });
  
  const [ngEnergyUnit, setNgEnergyUnit] = useState<'MJ' | 'kWh'>('MJ');

  const [sections, setSections] = useState({
    ng: true,
    diesel: true,
    genPct: true,
    vehicles: true,
    includeTK: true,
    showEnergy: true,
    remarks: true,
  });

  useEffect(() => {
    // Load factors
    try {
      const storedFactors = localStorage.getItem('sustainability_factors_by_year');
      if (storedFactors) {
        const parsed = JSON.parse(storedFactors);
        if (parsed && parsed[safeYear]) {
          setEnergyFactors({
            ngMjPerM3: parsed[safeYear].ngMjPerM3 || 38.30,
            ngKwhPerM3: parsed[safeYear].ngKwhPerM3 || 10.64,
            dieselMjPerLiter: parsed[safeYear].dieselMjPerLiter || 35.80,
          });
        }
      }
    } catch (e) {
      console.error('Failed to load energy factors', e);
    }

    // Load own data
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        
        if (parsed && Array.isArray(parsed.ngMeters) && parsed.ngMeters.length > 0) setNgMeters(parsed.ngMeters);
        else setNgMeters([{ id: 'ng1', name: 'Meter 1', subLabel: '' }, { id: 'ng2', name: 'Meter 2', subLabel: '' }]);

        if (parsed && Array.isArray(parsed.generators) && parsed.generators.length > 0) setGenerators(parsed.generators);
        else setGenerators([{ id: 'g1', name: 'Generator 1', subLabel: '' }, { id: 'g2', name: 'Generator 2', subLabel: '' }]);

        if (parsed && Array.isArray(parsed.boilers) && parsed.boilers.length > 0) setBoilers(parsed.boilers);
        else setBoilers([{ id: 'b1', name: 'Boiler 1', subLabel: '' }, { id: 'b2', name: 'Boiler 2', subLabel: '' }]);

        if (parsed && parsed.data && typeof parsed.data === 'object') {
          const validatedData: FormData = {};
          MONTHS.forEach(m => {
            const rawMonth = parsed.data[m];
            validatedData[m] = rawMonth && typeof rawMonth === 'object' 
              ? {
                  ngValues: rawMonth.ngValues || {},
                  totalTkNG: rawMonth.totalTkNG || '',
                  genDieselValues: rawMonth.genDieselValues || {},
                  boilerDieselValues: rawMonth.boilerDieselValues || {},
                  totalTkDiesel: rawMonth.totalTkDiesel || '',
                  vehDieselL: rawMonth.vehDieselL || '',
                  vehDieselTk: rawMonth.vehDieselTk || '',
                  vehCngM3: rawMonth.vehCngM3 || '',
                  vehCngTk: rawMonth.vehCngTk || '',
                  vehOctaneL: rawMonth.vehOctaneL || '',
                  vehOctaneTk: rawMonth.vehOctaneTk || '',
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
      console.error('Failed to load own local storage', e);
      const initialData: FormData = {};
      MONTHS.forEach(m => { initialData[m] = getEmptyMonth(); });
      setData(initialData);
    }

    try {
      const elecStored = localStorage.getItem(elecSolarKey);
      if (elecStored) {
        const parsedElec = JSON.parse(elecStored);
        if (parsedElec && parsedElec.data) {
          const ratios: Record<string, { dom: number; prod: number }> = {};
          MONTHS.forEach(m => {
            const row = parsedElec.data[m];
            if (row) {
              const dom = n(row.purchaseDomestic);
              const prod = n(row.purchaseProduction);
              const total = dom + prod;
              ratios[m] = {
                dom: total > 0 ? dom / total : 0,
                prod: total > 0 ? prod / total : 0
              };
            } else {
              ratios[m] = { dom: 0, prod: 0 };
            }
          });
          setElecRatio(ratios);
        }
      }
    } catch (e) {
      console.error('Failed to load electricity ratio', e);
    }
  }, [storageKey, elecSolarKey, safeYear]);

  const handleSave = () => {
    if (isViewer) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ ngMeters, generators, boilers, data }));
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (e) {
      alert('Failed to save data.');
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

  const updateNestedQty = (month: string, section: 'ngValues' | 'genDieselValues' | 'boilerDieselValues', id: string, value: string) => {
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

  const updateMeterName = (type: 'ng' | 'gen' | 'boiler', id: string, field: 'name' | 'subLabel', value: string) => {
    if (isViewer) return;
    const setter = type === 'ng' ? setNgMeters : type === 'gen' ? setGenerators : setBoilers;
    setter(prev => prev.map(m => (m.id === id ? { ...m, [field]: value } : m)));
  };

  const addMeter = (type: 'ng' | 'gen' | 'boiler') => {
    if (isViewer) return;
    const newId = `${type}${Date.now()}`;
    const setter = type === 'ng' ? setNgMeters : type === 'gen' ? setGenerators : setBoilers;
    const defaultName = type === 'ng' ? 'New Meter' : type === 'gen' ? 'New Generator' : 'New Boiler';
    setter(prev => [...prev, { id: newId, name: defaultName, subLabel: '' }]);
  };

  const removeMeter = (type: 'ng' | 'gen' | 'boiler', id: string) => {
    if (isViewer) return;
    const setter = type === 'ng' ? setNgMeters : type === 'gen' ? setGenerators : setBoilers;
    setter(prev => prev.filter(m => m.id !== id));
  };

  // Calculations
  const getTotalNG = (row: MonthData) => ngMeters.reduce((sum, m) => sum + n(row.ngValues?.[m.id]), 0);
  
  const getTotalNGEnergy = (row: MonthData) => {
    const total = getTotalNG(row);
    return ngEnergyUnit === 'MJ' ? total * energyFactors.ngMjPerM3 : total * energyFactors.ngKwhPerM3;
  };

  const getTotalGenDiesel = (row: MonthData) => generators.reduce((sum, m) => sum + n(row.genDieselValues?.[m.id]), 0);
  const getTotalBoilerDiesel = (row: MonthData) => boilers.reduce((sum, m) => sum + n(row.boilerDieselValues?.[m.id]), 0);
  
  const getDomDiesel = (month: string, row: MonthData) => {
    const total = getTotalGenDiesel(row);
    const ratio = elecRatio[month]?.dom || 0;
    return total * ratio;
  };
  
  const getProdDiesel = (month: string, row: MonthData) => {
    const total = getTotalGenDiesel(row);
    const ratio = elecRatio[month]?.prod || 0;
    return total * ratio;
  };
  
  const getTotalDiesel = (row: MonthData) => getTotalGenDiesel(row) + getTotalBoilerDiesel(row);
  const getTotalDieselMj = (row: MonthData) => getTotalDiesel(row) * energyFactors.dieselMjPerLiter;
  
  const getGenPct = (row: MonthData) => {
    const combined = getTotalDiesel(row);
    const gen = getTotalGenDiesel(row);
    return combined > 0 ? (gen / combined) * 100 : 0;
  };
  
  const getTotalDomDiesel = (month: string, row: MonthData) => getDomDiesel(month, row);
  const getTotalProdDiesel = (month: string, row: MonthData) => getProdDiesel(month, row) + getTotalBoilerDiesel(row);

  const getYearlySum = (getter: (m: string, r: MonthData) => number) => {
    return MONTHS.reduce((sum, m) => sum + getter(m, data[m] || getEmptyMonth()), 0);
  };

  const generateHTMLTemplate = (isPrint: boolean = false) => {
    const title = `Natural Gas, Diesel & Vehicles Report`;
    const logoHtml = `<img src="/epyllion-logo.png" alt="Epyllion" style="height: 40px; margin-bottom: 10px;" onerror="this.style.display='none'" />`;

    const letterhead = `
      <div style="text-align: center; margin-bottom: 20px;">
        ${logoHtml}
        <h1 style="color: #065f46; margin: 0; font-size: 24px;">Epyllion Group</h1>
        <h2 style="margin: 5px 0; font-size: 18px;">${unitInfo.fullName}</h2>
        <p style="margin: 0; font-size: 12px; color: #555;">${unitInfo.address}</p>
        <p style="margin: 8px 0 2px 0; font-size: 14px; font-weight: bold;">${title}</p>
        <p style="margin: 0; font-size: 12px; font-weight: bold; color: #065f46;">Reporting Year: ${safeYear}</p>
        <p style="margin: 4px 0 0 0; font-size: 11px; color: #555;">
          NG Factors: ${energyFactors.ngMjPerM3} MJ/m³ / ${energyFactors.ngKwhPerM3} kWh/m³ | Diesel Factor: ${energyFactors.dieselMjPerLiter} MJ/L
        </p>
      </div>
    `;

    const monthRowSpan = 2;

    let row1 = `<tr><th rowSpan="${monthRowSpan}" style="border: 1px solid #000; padding: 5px; background-color: #f3f4f6;">Month</th>`;
    let row2 = `<tr>`;

    if (sections.ng) {
      const ngCols = ngMeters.length + 1 + (sections.showEnergy ? 1 : 0) + (sections.includeTK ? 1 : 0);
      row1 += `<th colspan="${ngCols}" style="border: 1px solid #000; padding: 5px; background-color: #d1fae5; text-align: center; font-weight: bold;">NATURAL GAS (m³)</th>`;
      ngMeters.forEach(() => { row2 += `<th style="border: 1px solid #000; padding: 5px; background-color: #d1fae5; text-align: center; font-size: 11px;">&nbsp;</th>`; });
      row2 += `<th rowSpan="${monthRowSpan}" style="border: 1px solid #000; padding: 5px; background-color: #d1fae5; text-align: center; font-size: 11px;">Total NG (m³)</th>`;
      if (sections.showEnergy) {
        row2 += `<th rowSpan="${monthRowSpan}" style="border: 1px solid #000; padding: 5px; background-color: #d1fae5; text-align: center; font-size: 11px;">Total NG (${ngEnergyUnit})</th>`;
      }
      if (sections.includeTK) {
        row2 += `<th rowSpan="${monthRowSpan}" style="border: 1px solid #000; padding: 5px; background-color: #d1fae5; text-align: center; font-size: 11px;">Total Tk</th>`;
      }
    }

    if (sections.diesel) {
      const genCols = generators.length + 3;
      row1 += `<th colspan="${genCols}" style="border: 1px solid #000; padding: 5px; background-color: #dbeafe; text-align: center; font-weight: bold;">GENERATOR DIESEL (L)</th>`;
      
      generators.forEach(() => { row2 += `<th style="border: 1px solid #000; padding: 5px; background-color: #dbeafe; text-align: center; font-size: 11px;">&nbsp;</th>`; });
      row2 += `<th rowSpan="${monthRowSpan}" style="border: 1px solid #000; padding: 5px; background-color: #dbeafe; text-align: center; font-size: 11px;">Total Gen. Diesel</th>`;
      row2 += `<th rowSpan="${monthRowSpan}" style="border: 1px solid #000; padding: 5px; background-color: #dbeafe; text-align: center; font-size: 11px;">Domestic (L)</th>`;
      row2 += `<th rowSpan="${monthRowSpan}" style="border: 1px solid #000; padding: 5px; background-color: #dbeafe; text-align: center; font-size: 11px;">Production (L)</th>`;

      if (sections.genPct) {
        row1 += `<th rowSpan="${monthRowSpan}" style="border: 1px solid #000; padding: 5px; background-color: #e0e7ff; text-align: center; font-weight: bold;">GEN. DIESEL (%)</th>`;
      }

      const boilerCols = boilers.length + 1;
      row1 += `<th colspan="${boilerCols}" style="border: 1px solid #000; padding: 5px; background-color: #dbeafe; text-align: center; font-weight: bold;">BOILER DIESEL (L)</th>`;
      
      boilers.forEach(() => { row2 += `<th style="border: 1px solid #000; padding: 5px; background-color: #dbeafe; text-align: center; font-size: 11px;">&nbsp;</th>`; });
      row2 += `<th rowSpan="${monthRowSpan}" style="border: 1px solid #000; padding: 5px; background-color: #dbeafe; text-align: center; font-size: 11px;">Total Boiler Diesel</th>`;

      const combCols = 3 + (sections.showEnergy ? 1 : 0) + (sections.includeTK ? 1 : 0);
      row1 += `<th colspan="${combCols}" style="border: 1px solid #000; padding: 5px; background-color: #d1fae5; text-align: center; font-weight: bold;">(BOILER + GENERATOR) TOTAL DIESEL (L)</th>`;
      
      row2 += `<th rowSpan="${monthRowSpan}" style="border: 1px solid #000; padding: 5px; background-color: #d1fae5; text-align: center; font-size: 11px;">Total Diesel (L)</th>`;
      if (sections.showEnergy) {
        row2 += `<th rowSpan="${monthRowSpan}" style="border: 1px solid #000; padding: 5px; background-color: #d1fae5; text-align: center; font-size: 11px;">Total Diesel (MJ)</th>`;
      }
      if (sections.includeTK) {
        row2 += `<th rowSpan="${monthRowSpan}" style="border: 1px solid #000; padding: 5px; background-color: #d1fae5; text-align: center; font-size: 11px;">Total Tk</th>`;
      }
      row2 += `<th rowSpan="${monthRowSpan}" style="border: 1px solid #000; padding: 5px; background-color: #d1fae5; text-align: center; font-size: 11px;">Total Domestic</th>`;
      row2 += `<th rowSpan="${monthRowSpan}" style="border: 1px solid #000; padding: 5px; background-color: #d1fae5; text-align: center; font-size: 11px;">Total Production</th>`;
    }

    if (sections.vehicles) {
      const vCols = 3 + (sections.includeTK ? 3 : 0);
      row1 += `<th colspan="${vCols}" style="border: 1px solid #000; padding: 5px; background-color: #fef3c7; text-align: center; font-weight: bold;">VEHICLES FUEL</th>`;
      
      row2 += `<th rowSpan="${monthRowSpan}" style="border: 1px solid #000; padding: 5px; background-color: #fef3c7; text-align: center; font-size: 11px;">Diesel (L)</th>`;
      if (sections.includeTK) row2 += `<th rowSpan="${monthRowSpan}" style="border: 1px solid #000; padding: 5px; background-color: #fef3c7; text-align: center; font-size: 11px;">Diesel Tk</th>`;
      row2 += `<th rowSpan="${monthRowSpan}" style="border: 1px solid #000; padding: 5px; background-color: #fef3c7; text-align: center; font-size: 11px;">CNG (m³)</th>`;
      if (sections.includeTK) row2 += `<th rowSpan="${monthRowSpan}" style="border: 1px solid #000; padding: 5px; background-color: #fef3c7; text-align: center; font-size: 11px;">CNG Tk</th>`;
      row2 += `<th rowSpan="${monthRowSpan}" style="border: 1px solid #000; padding: 5px; background-color: #fef3c7; text-align: center; font-size: 11px;">Octane (L)</th>`;
      if (sections.includeTK) row2 += `<th rowSpan="${monthRowSpan}" style="border: 1px solid #000; padding: 5px; background-color: #fef3c7; text-align: center; font-size: 11px;">Octane Tk</th>`;
    }

    if (sections.remarks) {
      row1 += `<th rowSpan="${monthRowSpan}" style="border: 1px solid #000; padding: 5px; background-color: #f3f4f6; text-align: center; font-weight: bold;">REMARKS</th>`;
    }

    row1 += `</tr>`;
    row2 += `</tr>`;
    const tableHeadersHtml = row1 + row2;

    let tbody = '';
    MONTHS.forEach(m => {
      const row = data[m] || getEmptyMonth();
      tbody += `<tr><td style="border: 1px solid #000; padding: 5px; font-weight: bold; font-size: 11px;">${m}</td>`;

      if (sections.ng) {
        ngMeters.forEach(meter => {
          tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(n(row.ngValues?.[meter.id]), 2)}</td>`;
        });
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-size: 11px;">${fmt(getTotalNG(row), 2)}</td>`;
        if (sections.showEnergy) {
          tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-size: 11px;">${fmt(getTotalNGEnergy(row), 2)}</td>`;
        }
        if (sections.includeTK) tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(n(row.totalTkNG), 2)}</td>`;
      }

      if (sections.diesel) {
        generators.forEach(meter => {
          tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(n(row.genDieselValues?.[meter.id]), 2)}</td>`;
        });
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-size: 11px;">${fmt(getTotalGenDiesel(row), 2)}</td>`;
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getDomDiesel(m, row), 3)}</td>`;
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getProdDiesel(m, row), 3)}</td>`;

        if (sections.genPct) tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getGenPct(row), 4)}</td>`;

        boilers.forEach(meter => {
          tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(n(row.boilerDieselValues?.[meter.id]), 2)}</td>`;
        });
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-size: 11px;">${fmt(getTotalBoilerDiesel(row), 2)}</td>`;

        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-size: 11px;">${fmt(getTotalDiesel(row), 2)}</td>`;
        if (sections.showEnergy) {
          tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-weight: bold; font-size: 11px;">${fmt(getTotalDieselMj(row), 2)}</td>`;
        }
        if (sections.includeTK) tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(n(row.totalTkDiesel), 2)}</td>`;
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getTotalDomDiesel(m, row), 3)}</td>`;
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getTotalProdDiesel(m, row), 3)}</td>`;
      }

      if (sections.vehicles) {
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(n(row.vehDieselL), 2)}</td>`;
        if (sections.includeTK) tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(n(row.vehDieselTk), 2)}</td>`;
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(n(row.vehCngM3), 2)}</td>`;
        if (sections.includeTK) tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(n(row.vehCngTk), 2)}</td>`;
        tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(n(row.vehOctaneL), 2)}</td>`;
        if (sections.includeTK) tbody += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(n(row.vehOctaneTk), 2)}</td>`;
      }

      if (sections.remarks) {
        tbody += `<td style="border: 1px solid #000; padding: 5px; font-size: 11px;">${row.remarks || ''}</td>`;
      }
      tbody += `</tr>`;
    });

    let tfoot = '<tr style="background-color: #f3f4f6; font-weight: bold;"><td style="border: 1px solid #000; padding: 5px; font-size: 11px;">Total</td>';

    if (sections.ng) {
      ngMeters.forEach(meter => {
        let sum = 0;
        MONTHS.forEach(m => { sum += n(data[m]?.ngValues?.[meter.id]); });
        tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(sum, 2)}</td>`;
      });
      tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum((m, r) => getTotalNG(r)), 2)}</td>`;
      if (sections.showEnergy) {
        tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum((m, r) => getTotalNGEnergy(r)), 2)}</td>`;
      }
      if (sections.includeTK) tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum((m, r) => n(r.totalTkNG)), 2)}</td>`;
    }

    if (sections.diesel) {
      generators.forEach(meter => {
        let sum = 0;
        MONTHS.forEach(m => { sum += n(data[m]?.genDieselValues?.[meter.id]); });
        tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(sum, 2)}</td>`;
      });
      tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum((m, r) => getTotalGenDiesel(r)), 2)}</td>`;
      tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum((m, r) => getDomDiesel(m, r)), 3)}</td>`;
      tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum((m, r) => getProdDiesel(m, r)), 3)}</td>`;
      
      if (sections.genPct) {
        const annGen = getYearlySum((m, r) => getTotalGenDiesel(r));
        const annComb = getYearlySum((m, r) => getTotalDiesel(r));
        const pct = annComb > 0 ? (annGen / annComb) * 100 : 0;
        tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(pct, 4)}</td>`;
      }
      
      boilers.forEach(meter => {
        let sum = 0;
        MONTHS.forEach(m => { sum += n(data[m]?.boilerDieselValues?.[meter.id]); });
        tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(sum, 2)}</td>`;
      });
      tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum((m, r) => getTotalBoilerDiesel(r)), 2)}</td>`;
      
      tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum((m, r) => getTotalDiesel(r)), 2)}</td>`;
      if (sections.showEnergy) {
        tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum((m, r) => getTotalDieselMj(r)), 2)}</td>`;
      }
      if (sections.includeTK) tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum((m, r) => n(r.totalTkDiesel)), 2)}</td>`;
      tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum((m, r) => getTotalDomDiesel(m, r)), 3)}</td>`;
      tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum((m, r) => getTotalProdDiesel(m, r)), 3)}</td>`;
    }

    if (sections.vehicles) {
      tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum((m, r) => n(r.vehDieselL)), 2)}</td>`;
      if (sections.includeTK) tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum((m, r) => n(r.vehDieselTk)), 2)}</td>`;
      tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum((m, r) => n(r.vehCngM3)), 2)}</td>`;
      if (sections.includeTK) tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum((m, r) => n(r.vehCngTk)), 2)}</td>`;
      tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum((m, r) => n(r.vehOctaneL)), 2)}</td>`;
      if (sections.includeTK) tfoot += `<td style="border: 1px solid #000; padding: 5px; text-align: right; font-size: 11px;">${fmt(getYearlySum((m, r) => n(r.vehOctaneTk)), 2)}</td>`;
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
        <title>Natural Gas & Diesel - ${safeUnit} - ${safeYear}</title>
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
    link.download = `Natural_Gas_Diesel_Vehicles_${safeUnit}_${safeYear}.xls`;
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

  const isRatioSynced = Object.keys(elecRatio).length > 0;

  return (
    <div className="w-full max-w-[95vw] mx-auto p-4 sm:p-6 bg-white rounded-xl shadow-sm">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Natural Gas, Diesel &amp; Vehicles</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p className="text-sm text-slate-500">{unitInfo.fullName}</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Reporting Year: {safeYear}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
              NG: {energyFactors.ngMjPerM3} MJ/m³ ({energyFactors.ngKwhPerM3} kWh/m³) | Diesel: {energyFactors.dieselMjPerLiter} MJ/L
            </span>
            {isRatioSynced ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                <CheckCircle2 size={12} /> Electricity Ratio Synced
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                <AlertCircle size={12} /> Electricity Ratio Not Found
              </span>
            )}
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
        <span className="font-semibold text-slate-700 mr-2">Report Columns / Sections:</span>
        
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={sections.ng} onChange={() => setSections(p => ({...p, ng: !p.ng}))} className="accent-emerald-600 w-4 h-4" />
          <span>Natural Gas (m³)</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={sections.diesel} onChange={() => setSections(p => ({...p, diesel: !p.diesel}))} className="accent-blue-600 w-4 h-4" />
          <span>Generator &amp; Boiler Diesel (L)</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={sections.genPct} onChange={() => setSections(p => ({...p, genPct: !p.genPct}))} disabled={!sections.diesel} className="accent-indigo-600 w-4 h-4 disabled:opacity-50" />
          <span className={!sections.diesel ? 'text-slate-400' : ''}>Show Generator Diesel (%)</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={sections.vehicles} onChange={() => setSections(p => ({...p, vehicles: !p.vehicles}))} className="accent-amber-600 w-4 h-4" />
          <span>Vehicles Fuel</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={sections.includeTK} onChange={() => setSections(p => ({...p, includeTK: !p.includeTK}))} className="accent-emerald-600 w-4 h-4" />
          <span>Include All Tk (BDT) Columns</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={sections.showEnergy} onChange={() => setSections(p => ({...p, showEnergy: !p.showEnergy}))} className="accent-violet-600 w-4 h-4" />
          <span>Show Energy Conversion (MJ / kWh)</span>
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
              <th rowSpan={2} className="px-2 py-2 sticky left-0 bg-slate-50 z-20 border-r border-slate-200 w-24 text-center">Month</th>
              
              {sections.ng && (
                <th colSpan={ngMeters.length + 1 + (sections.showEnergy ? 1 : 0) + (sections.includeTK ? 1 : 0)} className="px-2 py-2 bg-emerald-100 text-emerald-900 border-r border-slate-200 text-center font-bold uppercase tracking-wider">
                  Natural Gas (m³)
                </th>
              )}

              {sections.diesel && (
                <th colSpan={generators.length + 3} className="px-2 py-2 bg-blue-100 text-blue-900 border-r border-slate-200 text-center font-bold uppercase tracking-wider">
                  Generator Diesel (L)
                </th>
              )}

              {sections.genPct && (
                <th rowSpan={2} className="px-2 py-2 bg-indigo-100 text-indigo-900 border-r border-slate-200 text-center font-bold uppercase tracking-wider">
                  Gen. Diesel (%)
                </th>
              )}

              {sections.diesel && (
                <th colSpan={boilers.length + 1} className="px-2 py-2 bg-blue-100 text-blue-900 border-r border-slate-200 text-center font-bold uppercase tracking-wider">
                  Boiler Diesel (L)
                </th>
              )}

              {sections.diesel && (
                <th colSpan={3 + (sections.showEnergy ? 1 : 0) + (sections.includeTK ? 1 : 0)} className="px-2 py-2 bg-emerald-100 text-emerald-900 border-r border-slate-200 text-center font-bold uppercase tracking-wider">
                  (Boiler + Generator) Total Diesel (L)
                </th>
              )}

              {sections.vehicles && (
                <th colSpan={3 + (sections.includeTK ? 3 : 0)} className="px-2 py-2 bg-amber-100 text-amber-900 border-r border-slate-200 text-center font-bold uppercase tracking-wider">
                  Vehicles Fuel
                </th>
              )}

              {sections.remarks && (
                <th rowSpan={2} className="px-2 py-2 bg-gray-100 text-gray-900 text-center font-bold uppercase tracking-wider">
                  Remarks
                </th>
              )}
            </tr>
            
            <tr>
              {sections.ng && (
                <>
                  {ngMeters.map((m) => (
                    <th key={m.id} className="px-2 py-1 text-center bg-emerald-50 min-w-[100px]">
                      <div className="flex flex-col items-center gap-1">
                        <input
                          type="text"
                          value={m.name}
                          onChange={(e) => updateMeterName('ng', m.id, 'name', e.target.value)}
                          disabled={isViewer}
                          className="w-full text-xs px-1 py-0.5 border border-slate-300 rounded text-center focus:outline-none focus:border-emerald-500 disabled:bg-transparent disabled:border-transparent"
                        />
                        <div className="flex items-center gap-1 w-full">
                          <input
                            type="text"
                            placeholder="Sub-label"
                            value={m.subLabel}
                            onChange={(e) => updateMeterName('ng', m.id, 'subLabel', e.target.value)}
                            disabled={isViewer}
                            className="w-full text-[10px] px-1 py-0.5 border border-slate-200 rounded text-center focus:outline-none focus:border-emerald-500 disabled:bg-transparent disabled:border-transparent text-slate-500"
                          />
                          {!isViewer && ngMeters.length > 1 && (
                            <button onClick={() => removeMeter('ng', m.id)} className="text-red-500 hover:text-red-700 no-print">
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </th>
                  ))}
                  <th className="px-2 py-2 text-center whitespace-nowrap bg-emerald-50/50 border-l border-slate-200">Total NG (m³)</th>
                  {sections.showEnergy && (
                    <th className="px-2 py-2 text-center whitespace-nowrap bg-emerald-50/50">
                      <select
                        value={ngEnergyUnit}
                        onChange={(e) => setNgEnergyUnit(e.target.value as 'MJ' | 'kWh')}
                        disabled={isViewer}
                        className="text-xs font-semibold bg-transparent border-none outline-none cursor-pointer text-center"
                      >
                        <option value="MJ">Total NG (MJ)</option>
                        <option value="kWh">Total NG (kWh)</option>
                      </select>
                    </th>
                  )}
                  {sections.includeTK && (
                    <th className="px-2 py-2 text-center whitespace-nowrap bg-emerald-50/50 border-l border-slate-200">Total Tk (BDT)</th>
                  )}
                </>
              )}

              {sections.diesel && (
                <>
                  {generators.map((m) => (
                    <th key={m.id} className="px-2 py-1 text-center bg-blue-50 min-w-[100px]">
                      <div className="flex flex-col items-center gap-1">
                        <input
                          type="text"
                          value={m.name}
                          onChange={(e) => updateMeterName('gen', m.id, 'name', e.target.value)}
                          disabled={isViewer}
                          className="w-full text-xs px-1 py-0.5 border border-slate-300 rounded text-center focus:outline-none focus:border-blue-500 disabled:bg-transparent disabled:border-transparent"
                        />
                        <div className="flex items-center gap-1 w-full">
                          <input
                            type="text"
                            placeholder="Sub-label"
                            value={m.subLabel}
                            onChange={(e) => updateMeterName('gen', m.id, 'subLabel', e.target.value)}
                            disabled={isViewer}
                            className="w-full text-[10px] px-1 py-0.5 border border-slate-200 rounded text-center focus:outline-none focus:border-blue-500 disabled:bg-transparent disabled:border-transparent text-slate-500"
                          />
                          {!isViewer && generators.length > 1 && (
                            <button onClick={() => removeMeter('gen', m.id)} className="text-red-500 hover:text-red-700 no-print">
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </th>
                  ))}

                  <th className="px-2 py-2 text-center whitespace-nowrap bg-blue-50/50 border-l border-slate-200">Gen. Total</th>
                  <th className="px-2 py-2 text-center whitespace-nowrap bg-blue-50/50">Gen. Dom.</th>
                  <th className="px-2 py-2 text-center whitespace-nowrap bg-blue-50/50">Gen. Prod.</th>
                </>
              )}

              {sections.diesel && (
                <>
                  {boilers.map((m) => (
                    <th key={m.id} className="px-2 py-1 text-center bg-blue-50 min-w-[100px]">
                      <div className="flex flex-col items-center gap-1">
                        <input
                          type="text"
                          value={m.name}
                          onChange={(e) => updateMeterName('boiler', m.id, 'name', e.target.value)}
                          disabled={isViewer}
                          className="w-full text-xs px-1 py-0.5 border border-slate-300 rounded text-center focus:outline-none focus:border-blue-500 disabled:bg-transparent disabled:border-transparent"
                        />
                        <div className="flex items-center gap-1 w-full">
                          <input
                            type="text"
                            placeholder="Sub-label"
                            value={m.subLabel}
                            onChange={(e) => updateMeterName('boiler', m.id, 'subLabel', e.target.value)}
                            disabled={isViewer}
                            className="w-full text-[10px] px-1 py-0.5 border border-slate-200 rounded text-center focus:outline-none focus:border-blue-500 disabled:bg-transparent disabled:border-transparent text-slate-500"
                          />
                          {!isViewer && boilers.length > 1 && (
                            <button onClick={() => removeMeter('boiler', m.id)} className="text-red-500 hover:text-red-700 no-print">
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </th>
                  ))}
                  <th className="px-2 py-2 text-center whitespace-nowrap bg-blue-50/50 border-l border-slate-200">Boiler Total</th>
                </>
              )}

              {sections.diesel && (
                <>
                  <th className="px-2 py-2 text-center whitespace-nowrap bg-emerald-50/50 border-l border-slate-200">Total Diesel (L)</th>
                  {sections.showEnergy && (
                    <th className="px-2 py-2 text-center whitespace-nowrap bg-emerald-50/50">Total Diesel (MJ)</th>
                  )}
                  {sections.includeTK && (
                    <th className="px-2 py-2 text-center whitespace-nowrap bg-emerald-50/50 border-l border-slate-200">Total Tk (BDT)</th>
                  )}
                  <th className="px-2 py-2 text-center whitespace-nowrap bg-emerald-50/50">Total Dom.</th>
                  <th className="px-2 py-2 text-center whitespace-nowrap bg-emerald-50/50">Total Prod.</th>
                </>
              )}

              {sections.vehicles && (
                <>
                  <th className="px-2 py-2 text-center whitespace-nowrap bg-amber-50/50">Diesel (L)</th>
                  {sections.includeTK && <th className="px-2 py-2 text-center whitespace-nowrap bg-amber-50/50">Diesel Tk</th>}
                  <th className="px-2 py-2 text-center whitespace-nowrap bg-amber-50/50">CNG (m³)</th>
                  {sections.includeTK && <th className="px-2 py-2 text-center whitespace-nowrap bg-amber-50/50">CNG Tk</th>}
                  <th className="px-2 py-2 text-center whitespace-nowrap bg-amber-50/50">Octane (L)</th>
                  {sections.includeTK && <th className="px-2 py-2 text-center whitespace-nowrap bg-amber-50/50">Octane Tk</th>}
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
                  
                  {sections.ng && (
                    <>
                      {ngMeters.map(m => (
                        <td key={`row-${month}-${m.id}`} className="px-1 py-1">
                          <input type="text" inputMode="decimal" value={row.ngValues?.[m.id] || ''} onChange={(e) => updateNestedQty(month, 'ngValues', m.id, e.target.value)} disabled={isViewer} className="w-20 px-2 py-1 text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" />
                        </td>
                      ))}
                      <td className="px-2 py-1 text-right font-bold text-emerald-700 bg-emerald-50/30 border-l border-slate-200">{fmt(getTotalNG(row), 2)}</td>
                      {sections.showEnergy && (
                        <td className="px-2 py-1 text-right font-bold text-emerald-700 bg-emerald-50/30">{fmt(getTotalNGEnergy(row), 2)}</td>
                      )}
                      {sections.includeTK && (
                        <td className="px-1 py-1 border-l border-slate-200"><input type="text" inputMode="decimal" value={row.totalTkNG} onChange={(e) => updateMonthField(month, 'totalTkNG', e.target.value)} disabled={isViewer} className="w-20 px-2 py-1 text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" /></td>
                      )}
                    </>
                  )}

                  {sections.diesel && (
                    <>
                      {generators.map(m => (
                        <td key={`row-${month}-${m.id}`} className="px-1 py-1">
                          <input type="text" inputMode="decimal" value={row.genDieselValues?.[m.id] || ''} onChange={(e) => updateNestedQty(month, 'genDieselValues', m.id, e.target.value)} disabled={isViewer} className="w-20 px-2 py-1 text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" />
                        </td>
                      ))}
                      <td className="px-2 py-1 text-right font-bold text-blue-700 bg-blue-50/30 border-l border-slate-200">{fmt(getTotalGenDiesel(row), 2)}</td>
                      <td className="px-2 py-1 text-right text-blue-700 bg-blue-50/10">{fmt(getDomDiesel(month, row), 3)}</td>
                      <td className="px-2 py-1 text-right text-blue-700 bg-blue-50/10">{fmt(getProdDiesel(month, row), 3)}</td>
                    </>
                  )}

                  {sections.genPct && (
                    <td className="px-2 py-1 text-right text-indigo-700 bg-indigo-50/30">{fmt(getGenPct(row), 4)}</td>
                  )}

                  {sections.diesel && (
                    <>
                      {boilers.map(m => (
                        <td key={`row-${month}-${m.id}`} className="px-1 py-1">
                          <input type="text" inputMode="decimal" value={row.boilerDieselValues?.[m.id] || ''} onChange={(e) => updateNestedQty(month, 'boilerDieselValues', m.id, e.target.value)} disabled={isViewer} className="w-20 px-2 py-1 text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" />
                        </td>
                      ))}
                      <td className="px-2 py-1 text-right font-bold text-blue-700 bg-blue-50/30">{fmt(getTotalBoilerDiesel(row), 2)}</td>
                    </>
                  )}

                  {sections.diesel && (
                    <>
                      <td className="px-2 py-1 text-right font-bold text-emerald-700 bg-emerald-50/30 border-l border-slate-200">{fmt(getTotalDiesel(row), 2)}</td>
                      {sections.showEnergy && (
                        <td className="px-2 py-1 text-right font-bold text-emerald-700 bg-emerald-50/30">{fmt(getTotalDieselMj(row), 2)}</td>
                      )}
                      {sections.includeTK && (
                        <td className="px-1 py-1 border-l border-slate-200"><input type="text" inputMode="decimal" value={row.totalTkDiesel} onChange={(e) => updateMonthField(month, 'totalTkDiesel', e.target.value)} disabled={isViewer} className="w-20 px-2 py-1 text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" /></td>
                      )}
                      <td className="px-2 py-1 text-right text-emerald-700 bg-emerald-50/10">{fmt(getTotalDomDiesel(month, row), 3)}</td>
                      <td className="px-2 py-1 text-right text-emerald-700 bg-emerald-50/10">{fmt(getTotalProdDiesel(month, row), 3)}</td>
                    </>
                  )}

                  {sections.vehicles && (
                    <>
                      <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.vehDieselL} onChange={(e) => updateMonthField(month, 'vehDieselL', e.target.value)} disabled={isViewer} className="w-20 px-2 py-1 text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" /></td>
                      {sections.includeTK && (
                        <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.vehDieselTk} onChange={(e) => updateMonthField(month, 'vehDieselTk', e.target.value)} disabled={isViewer} className="w-20 px-2 py-1 text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" /></td>
                      )}
                      <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.vehCngM3} onChange={(e) => updateMonthField(month, 'vehCngM3', e.target.value)} disabled={isViewer} className="w-20 px-2 py-1 text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" /></td>
                      {sections.includeTK && (
                        <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.vehCngTk} onChange={(e) => updateMonthField(month, 'vehCngTk', e.target.value)} disabled={isViewer} className="w-20 px-2 py-1 text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" /></td>
                      )}
                      <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.vehOctaneL} onChange={(e) => updateMonthField(month, 'vehOctaneL', e.target.value)} disabled={isViewer} className="w-20 px-2 py-1 text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" /></td>
                      {sections.includeTK && (
                        <td className="px-1 py-1"><input type="text" inputMode="decimal" value={row.vehOctaneTk} onChange={(e) => updateMonthField(month, 'vehOctaneTk', e.target.value)} disabled={isViewer} className="w-20 px-2 py-1 text-right border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded bg-transparent outline-none text-xs" /></td>
                      )}
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
              
              {sections.ng && (
                <>
                  {ngMeters.map(m => {
                    let sum = 0;
                    MONTHS.forEach(month => { sum += n(data[month]?.ngValues?.[m.id]); });
                    return <td key={`tot-${m.id}`} className="px-2 py-2 text-right text-emerald-800">{fmt(sum, 2)}</td>;
                  })}
                  <td className="px-2 py-2 text-right text-emerald-800 bg-emerald-100/50 border-l border-slate-200">{fmt(getYearlySum((m, r) => getTotalNG(r)), 2)}</td>
                  {sections.showEnergy && (
                    <td className="px-2 py-2 text-right text-emerald-800 bg-emerald-100/50">{fmt(getYearlySum((m, r) => getTotalNGEnergy(r)), 2)}</td>
                  )}
                  {sections.includeTK && (
                    <td className="px-2 py-2 text-right text-emerald-800 border-l border-slate-200">{fmt(getYearlySum((m, r) => n(r.totalTkNG)), 2)}</td>
                  )}
                </>
              )}

              {sections.diesel && (
                <>
                  {generators.map(m => {
                    let sum = 0;
                    MONTHS.forEach(month => { sum += n(data[month]?.genDieselValues?.[m.id]); });
                    return <td key={`tot-${m.id}`} className="px-2 py-2 text-right text-blue-800">{fmt(sum, 2)}</td>;
                  })}
                  <td className="px-2 py-2 text-right text-blue-800 bg-blue-100/50 border-l border-slate-200">{fmt(getYearlySum((m, r) => getTotalGenDiesel(r)), 2)}</td>
                  <td className="px-2 py-2 text-right text-blue-800 bg-blue-100/50">{fmt(getYearlySum((m, r) => getDomDiesel(m, r)), 3)}</td>
                  <td className="px-2 py-2 text-right text-blue-800 bg-blue-100/50">{fmt(getYearlySum((m, r) => getProdDiesel(m, r)), 3)}</td>
                </>
              )}

              {sections.genPct && (
                <td className="px-2 py-2 text-right text-indigo-800 bg-indigo-100/50">
                  {fmt((getYearlySum((m, r) => getTotalDiesel(r)) > 0 ? (getYearlySum((m, r) => getTotalGenDiesel(r)) / getYearlySum((m, r) => getTotalDiesel(r))) * 100 : 0), 4)}
                </td>
              )}

              {sections.diesel && (
                <>
                  {boilers.map(m => {
                    let sum = 0;
                    MONTHS.forEach(month => { sum += n(data[month]?.boilerDieselValues?.[m.id]); });
                    return <td key={`tot-${m.id}`} className="px-2 py-2 text-right text-blue-800">{fmt(sum, 2)}</td>;
                  })}
                  <td className="px-2 py-2 text-right text-blue-800 bg-blue-100/50">{fmt(getYearlySum((m, r) => getTotalBoilerDiesel(r)), 2)}</td>
                </>
              )}

              {sections.diesel && (
                <>
                  <td className="px-2 py-2 text-right text-emerald-800 bg-emerald-100/50 border-l border-slate-200">{fmt(getYearlySum((m, r) => getTotalDiesel(r)), 2)}</td>
                  {sections.showEnergy && (
                    <td className="px-2 py-2 text-right text-emerald-800 bg-emerald-100/50">{fmt(getYearlySum((m, r) => getTotalDieselMj(r)), 2)}</td>
                  )}
                  {sections.includeTK && (
                    <td className="px-2 py-2 text-right text-emerald-800 border-l border-slate-200">{fmt(getYearlySum((m, r) => n(r.totalTkDiesel)), 2)}</td>
                  )}
                  <td className="px-2 py-2 text-right text-emerald-800 bg-emerald-100/50">{fmt(getYearlySum((m, r) => getTotalDomDiesel(m, r)), 3)}</td>
                  <td className="px-2 py-2 text-right text-emerald-800 bg-emerald-100/50">{fmt(getYearlySum((m, r) => getTotalProdDiesel(m, r)), 3)}</td>
                </>
              )}

              {sections.vehicles && (
                <>
                  <td className="px-2 py-2 text-right text-amber-800">{fmt(getYearlySum((m, r) => n(r.vehDieselL)), 2)}</td>
                  {sections.includeTK && <td className="px-2 py-2 text-right text-amber-800">{fmt(getYearlySum((m, r) => n(r.vehDieselTk)), 2)}</td>}
                  <td className="px-2 py-2 text-right text-amber-800">{fmt(getYearlySum((m, r) => n(r.vehCngM3)), 2)}</td>
                  {sections.includeTK && <td className="px-2 py-2 text-right text-amber-800">{fmt(getYearlySum((m, r) => n(r.vehCngTk)), 2)}</td>}
                  <td className="px-2 py-2 text-right text-amber-800">{fmt(getYearlySum((m, r) => n(r.vehOctaneL)), 2)}</td>
                  {sections.includeTK && <td className="px-2 py-2 text-right text-amber-800">{fmt(getYearlySum((m, r) => n(r.vehOctaneTk)), 2)}</td>}
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
          {sections.ng && (
            <button onClick={() => addMeter('ng')} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-semibold transition-colors">
              <Plus size={16} /> Add NG Meter
            </button>
          )}
          {sections.diesel && (
            <>
              <button onClick={() => addMeter('gen')} className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-sm font-semibold transition-colors">
                <Plus size={16} /> Add Generator
              </button>
              <button onClick={() => addMeter('boiler')} className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-sm font-semibold transition-colors">
                <Plus size={16} /> Add Boiler
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
