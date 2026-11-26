import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Save, CheckCircle2, 
  Factory, Layers, Download
} from 'lucide-react';
// @ts-ignore
import { UNIT_DIRECTORY } from '../utils/unitDirectory';

// ============================================================
// PROPS
// ============================================================
interface FactoryProfileProps {
  activeSubModule: string;
  selectedUnit: string;
  unitFullName: string;
  userRole: string;
  restGet: (path: string) => Promise<any>;
  restSet: (path: string, data: any) => Promise<any>;
}

// ============================================================
// TYPES & DEFAULTS
// ============================================================
interface CustomField { id: string; label: string; value: string; }
interface Contact { id: string; name: string; designation: string; phone: string; email: string; }
interface Floor { id: string; name: string; sections: { id: string; name: string }[]; }
interface Machine { id: string; name: string; qty: number; }

const DEFAULT_MACHINES = [
  "Lock Stitch Auto (1-Needle)", "Flat lock flat bed", "Lock Stitch Vertical", 
  "Lock Stitch (2-Needle)", "Chain Stitch (1-Needle)", "Scolop Stitch", 
  "Chain Stitch (3-Needle)", "Over Lock (3-Thread)", "Over Lock (4-Thread)", 
  "Cutting Machine", "Over Lock (6-Thread)", "Over Lock (Thread Less)", 
  "Cylinder Bed Normal (FL)", "Cylinder Bed Small (FL)", "Cylinder Bed Auto (FL)", 
  "Flat Bed (FL)", "Flat Lock Auto Hemming (FL)", "Winda Fabric Shrinking & Forming Machine", 
  "Feed of the Arm (FOA)", "Kansai Special (MNCS)", "Kansai Back Tape", 
  "Cycle Stitch", "Button Hole", "Button Stitch", "Bar Tack", 
  "Snap Button (YKK)", "Snap Button (Nagi Shing)", "Rib Cutter", 
  "Fusing (Heat Seal)", "Boiler", "Compressor Machine", "Needle Detector Machine", 
  "Juki Pump", "Deep Pump", "Water Pump", "Heat Press Machine", "Band Knife Machine"
];

const getInitialFloors = (): Floor[] => [
  { id: 'ground', name: 'Ground Floor', sections: [] },
  { id: '1st', name: '1st Floor', sections: [] },
  { id: '2nd', name: '2nd Floor', sections: [] },
  { id: '3rd', name: '3rd Floor', sections: [] },
  { id: 'roof', name: 'Rooftop', sections: [] },
];

const getInitialMachines = (): Machine[] => 
  DEFAULT_MACHINES.map((name, i) => ({ id: `m_${i}_${Date.now()}`, name, qty: 0 }));

// ============================================================
// COMPONENT
// ============================================================
const FactoryProfile: React.FC<FactoryProfileProps> = ({ 
  activeSubModule, selectedUnit, unitFullName, userRole, restGet, restSet 
}) => {
  const isViewer = userRole === 'viewer';
  const [loading, setLoading] = useState(false); 
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState('');
  
  const [basicInfo, setBasicInfo] = useState<any>({});
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [premises, setPremises] = useState<any>({});
  const [workingHour, setWorkingHour] = useState<any>({});
  const [floors, setFloors] = useState<Floor[]>(getInitialFloors);
  const [machines, setMachines] = useState<Machine[]>(getInitialMachines);
  
  const [customBasic, setCustomBasic] = useState<CustomField[]>([]);
  const [customPremises, setCustomPremises] = useState<CustomField[]>([]);
  const [customWorking, setCustomWorking] = useState<CustomField[]>([]);

  const processOptions = ["Knitting", "Dyeing", "Washing", "Cutting", "Sewing", "Finishing", "Printing", "Embroidery"];

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        if (!selectedUnit || !activeSubModule) return;
        
        const path = `units/${selectedUnit}/factory_profile/${activeSubModule}`;
        const data = await restGet(path);
        
        if (data && typeof data === 'object' && isMounted) {
          if (activeSubModule === 'fp_basic_info') {
            setBasicInfo(data.basicInfo && typeof data.basicInfo === 'object' ? data.basicInfo : {});
            setContacts(Array.isArray(data.contacts) ? data.contacts : []);
            setCustomBasic(Array.isArray(data.customFields) ? data.customFields : []);
          } else if (activeSubModule === 'fp_premises') {
            setPremises(data.premises && typeof data.premises === 'object' ? data.premises : {});
            setCustomPremises(Array.isArray(data.customFields) ? data.customFields : []);
          } else if (activeSubModule === 'fp_working_hour') {
            setWorkingHour(data.workingHour && typeof data.workingHour === 'object' ? data.workingHour : {});
            setCustomWorking(Array.isArray(data.customFields) ? data.customFields : []);
          } else if (activeSubModule === 'fp_floor_glance') {
            setFloors(Array.isArray(data.floors) ? data.floors : getInitialFloors());
          } else if (activeSubModule === 'fp_machinery_list') {
            setMachines(Array.isArray(data.machines) && data.machines.length > 0 ? data.machines : getInitialMachines());
          }
        } else if (isMounted) {
          if (activeSubModule === 'fp_basic_info') {
            setBasicInfo({}); setContacts([]); setCustomBasic([]);
          } else if (activeSubModule === 'fp_premises') {
            setPremises({}); setCustomPremises([]);
          } else if (activeSubModule === 'fp_working_hour') {
            setWorkingHour({}); setCustomWorking([]);
          } else if (activeSubModule === 'fp_floor_glance') {
            setFloors(getInitialFloors());
          } else if (activeSubModule === 'fp_machinery_list') {
            setMachines(getInitialMachines());
          }
        }
      } catch (err) {
        console.error("Error fetching factory profile data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [selectedUnit, activeSubModule]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const path = `units/${selectedUnit}/factory_profile/${activeSubModule}`;
      let payload: any = {};
      
      if (activeSubModule === 'fp_basic_info') {
        payload = { basicInfo, contacts, customFields: customBasic };
      } else if (activeSubModule === 'fp_premises') {
        payload = { premises, customFields: customPremises };
      } else if (activeSubModule === 'fp_working_hour') {
        payload = { workingHour, customFields: customWorking };
      } else if (activeSubModule === 'fp_floor_glance') {
        payload = { floors };
      } else if (activeSubModule === 'fp_machinery_list') {
        payload = { machines };
      }

      await restSet(path, payload);
      setToast('Saved successfully!');
      setTimeout(() => setToast(''), 3000);
    } catch (err: any) {
      console.error(err);
      alert("Save failed: " + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const generatePDF = async () => {
    setExporting(true);
    try {
      const [basicData, premisesData, workingData, floorsData, machinesData] = await Promise.all([
        restGet(`units/${selectedUnit}/factory_profile/fp_basic_info`),
        restGet(`units/${selectedUnit}/factory_profile/fp_premises`),
        restGet(`units/${selectedUnit}/factory_profile/fp_working_hour`),
        restGet(`units/${selectedUnit}/factory_profile/fp_floor_glance`),
        restGet(`units/${selectedUnit}/factory_profile/fp_machinery_list`)
      ]);

      const exportBasic = activeSubModule === 'fp_basic_info' ? { basicInfo, contacts, customFields: customBasic } : (basicData || {});
      const exportPremises = activeSubModule === 'fp_premises' ? { premises, customFields: customPremises } : (premisesData || {});
      const exportWorking = activeSubModule === 'fp_working_hour' ? { workingHour, customFields: customWorking } : (workingData || {});
      const exportFloors = activeSubModule === 'fp_floor_glance' ? { floors } : (floorsData || { floors: getInitialFloors() });
      const exportMachines = activeSubModule === 'fp_machinery_list' ? { machines } : (machinesData || { machines: getInitialMachines() });

      const bInfo = exportBasic.basicInfo || {};
      const bContacts = exportBasic.contacts || [];
      const bCustom = exportBasic.customFields || [];
      const pData = exportPremises.premises || {};
      const pCustom = exportPremises.customFields || [];
      const wData = exportWorking.workingHour || {};
      const wCustom = exportWorking.customFields || [];
      const fData = exportFloors.floors || [];
      const mData = exportMachines.machines || [];

      // Resolve full name and address from directory
      const fullUnitName = UNIT_DIRECTORY[selectedUnit]?.fullName || unitFullName || selectedUnit;
      const fullUnitAddress = UNIT_DIRECTORY[selectedUnit]?.address || '';
      
      const logoSrc = window.location.origin + '/epyllion.png';

      const renderRow = (label: string, value: any) => `
        <tr>
          <td style="border: 1px solid #cbd5e1; padding: 6px 10px; font-weight: 600; width: 40%; background-color: #f8fafc; color: #334155; font-size: 10px;">${label}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 10px; color: #1e293b; font-size: 10px;">${value || '-'}</td>
        </tr>
      `;

      let html = `
        <html>
          <head>
            <title>Factory Profile - ${selectedUnit}</title>
            <style>
              @media print {
                @page { size: A4; margin: 15mm; }
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .page-break { page-break-before: always; }
              }
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 20px; color: #0f172a; }
              
              /* UPDATED HEADER LAYOUT */
              .header-container { position: relative; border-bottom: 2px solid #10b981; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: center; align-items: center; min-height: 80px; }
              .header-logo { position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 100px; height: auto; }
              .header-center { text-align: center; width: 100%; padding: 0 110px; }
              .header-title { margin: 0; font-size: 20px; color: #065f46; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; }
              .header-address { margin: 2px 0 0 0; font-size: 10px; color: #475569; }
              .header-subtitle { margin: 2px 0 0 0; font-size: 11px; color: #64748b; font-weight: bold; text-transform: uppercase; }
              .header-meta { margin-top: 4px; font-size: 9px; color: #64748b; }
              /* END HEADER LAYOUT */

              .section-title { font-size: 14px; font-weight: bold; color: #065f46; background-color: #ecfdf5; padding: 6px 10px; border-left: 4px solid #10b981; margin: 20px 0 10px 0; text-transform: uppercase; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
              th { border: 1px solid #cbd5e1; padding: 6px 10px; background-color: #f1f5f9; font-size: 10px; text-align: left; color: #475569; }
            </style>
          </head>
          <body>
            <div class="header-container">
                          <img src="${logoSrc}" onerror="this.style.display='none'" alt="Epyllion Group Logo" class="header-logo" style="height: 85px; width: auto; object-fit: contain;" />

              <div class="header-center">
                <h1 class="header-title">${fullUnitName}</h1>
                ${fullUnitAddress ? `<p class="header-address">${fullUnitAddress}</p>` : ''}
                <h2 class="header-subtitle">Unit Code: ${selectedUnit} | FACTORY PROFILE</h2>
                <div class="header-meta">Exported on: ${new Date().toLocaleString()}</div>
              </div>
            </div>

            <!-- SECTION 1: BASIC INFO -->
            <div class="section-title">1. Basic Information</div>
            <table>
              ${renderRow('Name of the Facility', bInfo.name)}
              ${renderRow('Facility Address', bInfo.address)}
              ${renderRow('Zip Code', bInfo.zip)}
              ${renderRow('Name of the Owner', bInfo.owner)}
              ${renderRow('Years in Operation', bInfo.yearsOperation)}
              ${renderRow('Number of Line/Table', bInfo.lines)}
              ${renderRow('Name of major buyer', bInfo.buyer)}
              ${renderRow('Monthly Production Capacity', bInfo.capacity)}
              ${renderRow('Full Time Doctor', bInfo.doctor)}
              ${renderRow('Doctor Details', bInfo.doctorDetails)}
              ${renderRow('Full Time Nurse', bInfo.nurse)}
              ${renderRow('Nurse Details', bInfo.nurseDetails)}
              ${renderRow('Child Care with Wash Facility', bInfo.childCare)}
              ${renderRow('Child Care Capacity', bInfo.childCareCapacity)}
              ${renderRow('Dining Area', bInfo.dining)}
              ${renderRow('Dining Seating Capacity', bInfo.diningCapacity)}
              ${renderRow('First Aid Box Quantity', bInfo.firstAid)}
              ${renderRow('Total First Aider', bInfo.firstAider)}
              ${renderRow('Drinking Water Facility', bInfo.drinkingWater)}
              ${renderRow('Water Capacity/Method', bInfo.waterCapacity)}
              ${renderRow('Number of Complain Box', bInfo.complainBox)}
              ${renderRow('Contract workers', bInfo.contractWorkers)}
              ${renderRow('How Many Contract Workers', bInfo.contractCount)}
              ${bCustom.map((cf: any) => renderRow(cf.label, cf.value)).join('')}
            </table>

            <div style="font-weight: bold; font-size: 11px; margin: 15px 0 5px 0; color: #334155;">Contact Persons</div>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Designation</th>
                  <th>Tel/Cell</th>
                  <th>E-mail</th>
                </tr>
              </thead>
              <tbody>
                ${bContacts.length > 0 ? bContacts.map((c: any) => `
                  <tr>
                    <td style="border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 10px;">${c.name || '-'}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 10px;">${c.designation || '-'}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 10px;">${c.phone || '-'}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 10px;">${c.email || '-'}</td>
                  </tr>
                `).join('') : '<tr><td colspan="4" style="border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 10px; text-align: center;">No contacts added</td></tr>'}
              </tbody>
            </table>

            <!-- SECTION 2: PREMISES -->
            <div class="section-title page-break">2. Factory Premises</div>
            <table>
              ${renderRow('Total Land Area', pData.landArea)}
              ${renderRow('Total Numbers of Buildings', pData.buildings)}
              ${renderRow('Total Numbers of Floors', pData.floors)}
              ${renderRow('Centralized Fire Detection', pData.fireDetect)}
              ${renderRow('Fire Hydrant System', pData.hydrant)}
              ${renderRow('Water Reserve Tank', pData.reserveTank)}
              ${renderRow('Water Reserve Tank Capacity', pData.reserveTankCapacity)}
              ${renderRow('Fire Door Status', pData.fireDoor)}
              ${renderRow('Number of Exits', pData.exits)}
              ${renderRow('Total ETP Area', pData.etpArea)}
              ${renderRow('Total ETP Capacity', pData.etpCapacity)}
              ${renderRow('Eye wash station', pData.eyeWash)}
              ${renderRow('Total Production Area (SFT)', pData.prodArea)}
              ${renderRow('Total Cutting Area (SFT)', pData.cutArea)}
              ${renderRow('Total Sewing Area (SFT)', pData.sewArea)}
              ${renderRow('Total Finishing Area (SFT)', pData.finishArea)}
              ${renderRow('Total Warehouse Area (SFT)', pData.warehouseArea)}
              ${renderRow('Fabrics Warehouse Area (SFT)', pData.fabricsWHArea)}
              ${renderRow('Finished Goods Warehouse (SFT)', pData.finishedWHArea)}
              ${renderRow('Accessories Warehouse (SFT)', pData.accWHArea)}
              ${renderRow('Dining Area (SFT)', pData.diningArea)}
              ${renderRow('Utility Area (SFT)', pData.utilityArea)}
              ${renderRow('Other Areas (SFT)', pData.otherArea)}
              ${renderRow('Total Factory Area', pData.totalFactoryArea)}
              ${pCustom.map((cf: any) => renderRow(cf.label, cf.value)).join('')}
            </table>

            <!-- SECTION 3: WORKING HOUR -->
            <div class="section-title page-break">3. Working Hour & Payment System</div>
            <table>
              ${renderRow('Working Days per Week', wData.daysWeek)}
              ${renderRow('Working Hour Per Day', wData.hoursDay)}
              ${renderRow('Overtime Hours', wData.overtime)}
              ${renderRow('Break/Lunch Hour', wData.breakHour)}
              ${renderRow('Wage/Payment System', wData.wageSystem)}
              ${renderRow('Monthly Salary Date', wData.salaryDate)}
              ${renderRow('Overtime Payment Date', wData.overtimeDate)}
              ${wCustom.map((cf: any) => renderRow(cf.label, cf.value)).join('')}
            </table>

            <!-- SECTION 4: FLOOR GLANCE -->
            <div class="section-title page-break">4. Floor At a Glance</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 30%;">Floor Name</th>
                  <th>Sections / Departments</th>
                </tr>
              </thead>
              <tbody>
                ${fData.length > 0 ? fData.map((f: any) => `
                  <tr>
                    <td style="border: 1px solid #cbd5e1; padding: 6px 10px; font-weight: 600; font-size: 10px; vertical-align: top;">${f.name || '-'}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 10px; vertical-align: top;">
                      ${(f.sections || []).map((s: any) => s.name).filter(Boolean).join(', ') || '-'}
                    </td>
                  </tr>
                `).join('') : '<tr><td colspan="2" style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: center;">No floors defined</td></tr>'}
              </tbody>
            </table>

            <!-- SECTION 5: MACHINERY -->
            <div class="section-title page-break">5. Machinery List</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 10%;">S/L</th>
                  <th>Name of Machine</th>
                  <th style="width: 20%; text-align: right;">Total Qty</th>
                </tr>
              </thead>
              <tbody>
                ${mData.map((m: any, i: number) => `
                  <tr>
                    <td style="border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 10px;">${i + 1}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 10px;">${m.name || '-'}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 10px; text-align: right;">${m.qty || 0}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" style="border: 1px solid #cbd5e1; padding: 8px 10px; font-weight: bold; text-align: right; background-color: #f1f5f9; font-size: 11px;">Total Machinery Qty:</td>
                  <td style="border: 1px solid #cbd5e1; padding: 8px 10px; font-weight: bold; text-align: right; background-color: #f1f5f9; font-size: 11px;">${mData.reduce((sum: number, m: any) => sum + (Number(m.qty) || 0), 0)}</td>
                </tr>
              </tfoot>
            </table>
            
            <div style="margin-top: 40px; text-align: center; font-size: 10px; color: #94a3b8;">
              This is a system-generated document from the Sustainability Portal.
            </div>
          </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to generate PDF report.');
    } finally {
      setExporting(false);
    }
  };

  const handleBasicChange = (key: string, val: any) => setBasicInfo((prev: any) => ({ ...prev, [key]: val }));
  const handlePremisesChange = (key: string, val: any) => setPremises((prev: any) => ({ ...prev, [key]: val }));
  const handleWorkingChange = (key: string, val: any) => setWorkingHour((prev: any) => ({ ...prev, [key]: val }));
  
  const addContact = () => setContacts([...contacts, { id: Date.now().toString(), name: '', designation: '', phone: '', email: '' }]);
  const updateContact = (id: string, field: keyof Contact, val: string) => setContacts(contacts.map(c => c.id === id ? { ...c, [field]: val } : c));
  const removeContact = (id: string) => setContacts(contacts.filter(c => c.id !== id));

  const addCustomField = (setter: React.Dispatch<React.SetStateAction<CustomField[]>>) => {
    setter(prev => [...prev, { id: Date.now().toString(), label: '', value: '' }]);
  };
  const updateCustomField = (setter: React.Dispatch<React.SetStateAction<CustomField[]>>, id: string, field: 'label'|'value', val: string) => {
    setter(prev => prev.map(f => f.id === id ? { ...f, [field]: val } : f));
  };
  const removeCustomField = (setter: React.Dispatch<React.SetStateAction<CustomField[]>>, id: string) => {
    setter(prev => prev.filter(f => f.id !== id));
  };

  const addFloor = () => setFloors([...floors, { id: Date.now().toString(), name: 'New Floor', sections: [] }]);
  const updateFloorName = (id: string, name: string) => setFloors(floors.map(f => f.id === id ? { ...f, name } : f));
  const addFloorSection = (floorId: string) => setFloors(floors.map(f => {
    if (f.id === floorId) return { ...f, sections: [...f.sections, { id: Date.now().toString(), name: '' }] };
    return f;
  }));
  const updateFloorSection = (floorId: string, sectionId: string, name: string) => setFloors(floors.map(f => {
    if (f.id === floorId) return { ...f, sections: f.sections.map(s => s.id === sectionId ? { ...s, name } : s) };
    return f;
  }));
  const removeFloorSection = (floorId: string, sectionId: string) => setFloors(floors.map(f => {
    if (f.id === floorId) return { ...f, sections: f.sections.filter(s => s.id !== sectionId) };
    return f;
  }));
  const removeFloor = (id: string) => setFloors(floors.filter(f => f.id !== id));

  const addMachineRow = () => setMachines([...machines, { id: Date.now().toString(), name: '', qty: 0 }]);
  const updateMachine = (id: string, field: keyof Machine, val: any) => setMachines(machines.map(m => m.id === id ? { ...m, [field]: val } : m));
  const removeMachine = (id: string) => setMachines(machines.filter(m => m.id !== id));

  const subModuleTitles: Record<string, string> = {
    fp_basic_info: 'Basic Information',
    fp_premises: 'Factory Premises',
    fp_working_hour: 'Working Hour & Payment System',
    fp_floor_glance: 'Floor At a Glance',
    fp_machinery_list: 'Machinery List'
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 mb-1 uppercase tracking-wide">
            <Factory size={14} /> Factory Profile
          </div>
          <h2 className="text-xl font-bold text-gray-800">
            {subModuleTitles[activeSubModule] || 'Profile'}
          </h2>
          <p className="text-sm text-gray-500 font-medium mt-1">
            {unitFullName} ({selectedUnit})
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={generatePDF}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 rounded-lg text-sm font-semibold shadow-sm transition-colors border border-gray-200"
          >
            <Download size={16} /> {exporting ? 'Generating...' : 'Download Full Profile (PDF)'}
          </button>
          {!isViewer && (
            <button 
              onClick={handleSave} 
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
            >
              <Save size={16} /> {saving ? 'Saving...' : 'Save Data'}
            </button>
          )}
        </div>
      </div>

      {toast && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg flex items-center gap-2 text-sm font-medium shadow-sm animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={18} /> {toast}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-8 relative min-h-[400px]">
        
        {loading && (
          <div className="absolute top-0 left-0 w-full h-1 bg-emerald-100 overflow-hidden rounded-t-xl">
            <div className="w-full h-full bg-emerald-500 animate-pulse"></div>
          </div>
        )}

        {activeSubModule === 'fp_basic_info' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Name of the Facility (As per license)</label><input disabled={isViewer} value={basicInfo?.name || ''} onChange={e => handleBasicChange('name', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50 outline-none focus:border-emerald-500" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Facility Address</label><input disabled={isViewer} value={basicInfo?.address || ''} onChange={e => handleBasicChange('address', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50 outline-none focus:border-emerald-500" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Zip Code</label><input disabled={isViewer} value={basicInfo?.zip || ''} onChange={e => handleBasicChange('zip', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50 outline-none focus:border-emerald-500" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Name of the Owner</label><input disabled={isViewer} value={basicInfo?.owner || ''} onChange={e => handleBasicChange('owner', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50 outline-none focus:border-emerald-500" /></div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-800 border-b pb-2 flex-1">Factory Contact Persons</h3>
                {!isViewer && <button onClick={addContact} className="ml-4 flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"><Plus size={14} /> Add Contact Person</button>}
              </div>
              <div className="space-y-3">
                {contacts.map((c) => (
                  <div key={c.id} className="flex flex-col md:flex-row gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <input disabled={isViewer} placeholder="Name" value={c.name || ''} onChange={e => updateContact(c.id, 'name', e.target.value)} className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm disabled:bg-gray-100" />
                    <input disabled={isViewer} placeholder="Designation" value={c.designation || ''} onChange={e => updateContact(c.id, 'designation', e.target.value)} className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm disabled:bg-gray-100" />
                    <input disabled={isViewer} placeholder="Tel/Cell" value={c.phone || ''} onChange={e => updateContact(c.id, 'phone', e.target.value)} className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm disabled:bg-gray-100" />
                    <input disabled={isViewer} placeholder="E-mail" value={c.email || ''} onChange={e => updateContact(c.id, 'email', e.target.value)} className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm disabled:bg-gray-100" />
                    {!isViewer && <button onClick={() => removeContact(c.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16} /></button>}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-3 border-b pb-2">Process</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {processOptions.map(p => (
                  <label key={p} className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" disabled={isViewer} checked={(basicInfo?.processes || []).includes(p)} onChange={e => {
                      const current = basicInfo?.processes || [];
                      handleBasicChange('processes', e.target.checked ? [...current, p] : current.filter((x: string) => x !== p));
                    }} className="rounded text-emerald-600 focus:ring-emerald-500" />
                    {p}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Years in Operation (Establishment Year)</label><input disabled={isViewer} value={basicInfo?.yearsOperation || ''} onChange={e => handleBasicChange('yearsOperation', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Number of Line/Table</label><input disabled={isViewer} value={basicInfo?.lines || ''} onChange={e => handleBasicChange('lines', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Name of major buyer</label><input disabled={isViewer} value={basicInfo?.buyer || ''} onChange={e => handleBasicChange('buyer', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Monthly Production Capacity</label><input disabled={isViewer} value={basicInfo?.capacity || ''} onChange={e => handleBasicChange('capacity', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" /></div>
              
              <div className="col-span-full border-t pt-4"><h4 className="text-xs font-bold text-gray-800 mb-4 uppercase">Health & Safety Facilities</h4></div>
              
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Time Doctor</label><select disabled={isViewer} value={basicInfo?.doctor || ''} onChange={e => handleBasicChange('doctor', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50"><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Doctor Details</label><input disabled={isViewer} value={basicInfo?.doctorDetails || ''} onChange={e => handleBasicChange('doctorDetails', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Time Nurse</label><select disabled={isViewer} value={basicInfo?.nurse || ''} onChange={e => handleBasicChange('nurse', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50"><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Nurse Details</label><input disabled={isViewer} value={basicInfo?.nurseDetails || ''} onChange={e => handleBasicChange('nurseDetails', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Child Care with Wash Facility</label><select disabled={isViewer} value={basicInfo?.childCare || ''} onChange={e => handleBasicChange('childCare', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50"><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Child Care Capacity</label><input disabled={isViewer} value={basicInfo?.childCareCapacity || ''} onChange={e => handleBasicChange('childCareCapacity', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Dining Area</label><select disabled={isViewer} value={basicInfo?.dining || ''} onChange={e => handleBasicChange('dining', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50"><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Dining Seating Capacity</label><input disabled={isViewer} value={basicInfo?.diningCapacity || ''} onChange={e => handleBasicChange('diningCapacity', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">First Aid Box Quantity</label><input disabled={isViewer} value={basicInfo?.firstAid || ''} onChange={e => handleBasicChange('firstAid', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Total First Aider</label><input disabled={isViewer} value={basicInfo?.firstAider || ''} onChange={e => handleBasicChange('firstAider', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Drinking Water Facility</label><select disabled={isViewer} value={basicInfo?.drinkingWater || ''} onChange={e => handleBasicChange('drinkingWater', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50"><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Water Capacity/Method</label><input disabled={isViewer} value={basicInfo?.waterCapacity || ''} onChange={e => handleBasicChange('waterCapacity', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Number of Complain Box</label><input disabled={isViewer} value={basicInfo?.complainBox || ''} onChange={e => handleBasicChange('complainBox', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Contract workers</label><select disabled={isViewer} value={basicInfo?.contractWorkers || ''} onChange={e => handleBasicChange('contractWorkers', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50"><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">How Many Contract Workers</label><input disabled={isViewer} value={basicInfo?.contractCount || ''} onChange={e => handleBasicChange('contractCount', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" /></div>
            </div>

            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-800">Additional Custom Fields</h3>
                {!isViewer && <button onClick={() => addCustomField(setCustomBasic)} className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"><Plus size={14} /> Add New Index / Field</button>}
              </div>
              <div className="space-y-3">
                {customBasic.map(f => (
                  <div key={f.id} className="flex gap-3">
                    <input disabled={isViewer} placeholder="Field Label" value={f.label || ''} onChange={e => updateCustomField(setCustomBasic, f.id, 'label', e.target.value)} className="w-1/3 px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50 font-medium text-gray-700" />
                    <input disabled={isViewer} placeholder="Value" value={f.value || ''} onChange={e => updateCustomField(setCustomBasic, f.id, 'value', e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" />
                    {!isViewer && <button onClick={() => removeCustomField(setCustomBasic, f.id)} className="text-red-500 hover:text-red-700 p-2"><Trash2 size={16} /></button>}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeSubModule === 'fp_premises' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Total Land Area</label><input disabled={isViewer} value={premises?.landArea || ''} onChange={e => handlePremisesChange('landArea', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Total Numbers of Buildings</label><input disabled={isViewer} value={premises?.buildings || ''} onChange={e => handlePremisesChange('buildings', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Total Numbers of Floors</label><input disabled={isViewer} value={premises?.floors || ''} onChange={e => handlePremisesChange('floors', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Centralized Fire Detection (Y/N)</label><select disabled={isViewer} value={premises?.fireDetect || ''} onChange={e => handlePremisesChange('fireDetect', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50"><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Fire Hydrant System (Y/N)</label><select disabled={isViewer} value={premises?.hydrant || ''} onChange={e => handlePremisesChange('hydrant', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50"><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Water Reserve Tank (Y/N)</label><select disabled={isViewer} value={premises?.reserveTank || ''} onChange={e => handlePremisesChange('reserveTank', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50"><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Water Reserve Tank Capacity</label><input disabled={isViewer} value={premises?.reserveTankCapacity || ''} onChange={e => handlePremisesChange('reserveTankCapacity', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Fire Door Status (Y/N)</label><select disabled={isViewer} value={premises?.fireDoor || ''} onChange={e => handlePremisesChange('fireDoor', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50"><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Number of Exits (Each Floor)</label><input disabled={isViewer} value={premises?.exits || ''} onChange={e => handlePremisesChange('exits', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Total ETP Area</label><input disabled={isViewer} value={premises?.etpArea || ''} onChange={e => handlePremisesChange('etpArea', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Total ETP Capacity</label><input disabled={isViewer} value={premises?.etpCapacity || ''} onChange={e => handlePremisesChange('etpCapacity', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Eye wash station for print/spot room (Y/N)</label><select disabled={isViewer} value={premises?.eyeWash || ''} onChange={e => handlePremisesChange('eyeWash', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50"><option value="">Select...</option><option value="Yes">Yes</option><option value="No">No</option></select></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Total Production Area (SFT)</label><input disabled={isViewer} value={premises?.prodArea || ''} onChange={e => handlePremisesChange('prodArea', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Total Cutting Area (SFT)</label><input disabled={isViewer} value={premises?.cutArea || ''} onChange={e => handlePremisesChange('cutArea', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Total Sewing Area (SFT)</label><input disabled={isViewer} value={premises?.sewArea || ''} onChange={e => handlePremisesChange('sewArea', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Total Finishing Area (SFT)</label><input disabled={isViewer} value={premises?.finishArea || ''} onChange={e => handlePremisesChange('finishArea', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Total Warehouse Area (SFT)</label><input disabled={isViewer} value={premises?.warehouseArea || ''} onChange={e => handlePremisesChange('warehouseArea', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Fabrics Warehouse Area (SFT)</label><input disabled={isViewer} value={premises?.fabricsWHArea || ''} onChange={e => handlePremisesChange('fabricsWHArea', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Finished Goods Warehouse Area (SFT)</label><input disabled={isViewer} value={premises?.finishedWHArea || ''} onChange={e => handlePremisesChange('finishedWHArea', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Accessories Warehouse Area (SFT)</label><input disabled={isViewer} value={premises?.accWHArea || ''} onChange={e => handlePremisesChange('accWHArea', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Dining Area (SFT)</label><input disabled={isViewer} value={premises?.diningArea || ''} onChange={e => handlePremisesChange('diningArea', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Utility Area (SFT)</label><input disabled={isViewer} value={premises?.utilityArea || ''} onChange={e => handlePremisesChange('utilityArea', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Other Areas (SFT)</label><input disabled={isViewer} value={premises?.otherArea || ''} onChange={e => handlePremisesChange('otherArea', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Total Factory Area (SFT & SQM)</label><input disabled={isViewer} value={premises?.totalFactoryArea || ''} onChange={e => handlePremisesChange('totalFactoryArea', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" /></div>
            </div>

            <div className="border-t pt-6 mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-800">Additional Area / Custom Fields</h3>
                {!isViewer && <button onClick={() => addCustomField(setCustomPremises)} className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"><Plus size={14} /> Add New Index / Area Field</button>}
              </div>
              <div className="space-y-3">
                {customPremises.map(f => (
                  <div key={f.id} className="flex gap-3">
                    <input disabled={isViewer} placeholder="Area Name" value={f.label || ''} onChange={e => updateCustomField(setCustomPremises, f.id, 'label', e.target.value)} className="w-1/3 px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50 font-medium text-gray-700" />
                    <input disabled={isViewer} placeholder="Value" value={f.value || ''} onChange={e => updateCustomField(setCustomPremises, f.id, 'value', e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" />
                    {!isViewer && <button onClick={() => removeCustomField(setCustomPremises, f.id)} className="text-red-500 hover:text-red-700 p-2"><Trash2 size={16} /></button>}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeSubModule === 'fp_working_hour' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Working Days per Week</label><input disabled={isViewer} value={workingHour?.daysWeek || ''} onChange={e => handleWorkingChange('daysWeek', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Working Hour Per Day</label><input disabled={isViewer} value={workingHour?.hoursDay || ''} onChange={e => handleWorkingChange('hoursDay', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Overtime Hours</label><input disabled={isViewer} value={workingHour?.overtime || ''} onChange={e => handleWorkingChange('overtime', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Break/Lunch Hour</label><input disabled={isViewer} value={workingHour?.breakHour || ''} onChange={e => handleWorkingChange('breakHour', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Wage/Payment System</label><input disabled={isViewer} value={workingHour?.wageSystem || ''} onChange={e => handleWorkingChange('wageSystem', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Monthly Salary Date</label><input disabled={isViewer} value={workingHour?.salaryDate || ''} onChange={e => handleWorkingChange('salaryDate', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" /></div>
              <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Overtime Payment Date</label><input disabled={isViewer} value={workingHour?.overtimeDate || ''} onChange={e => handleWorkingChange('overtimeDate', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" /></div>
            </div>

            <div className="border-t pt-6 mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-800">Additional Custom Fields</h3>
                {!isViewer && <button onClick={() => addCustomField(setCustomWorking)} className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"><Plus size={14} /> Add New Index / Field</button>}
              </div>
              <div className="space-y-3">
                {customWorking.map(f => (
                  <div key={f.id} className="flex gap-3">
                    <input disabled={isViewer} placeholder="Field Label" value={f.label || ''} onChange={e => updateCustomField(setCustomWorking, f.id, 'label', e.target.value)} className="w-1/3 px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50 font-medium text-gray-700" />
                    <input disabled={isViewer} placeholder="Value" value={f.value || ''} onChange={e => updateCustomField(setCustomWorking, f.id, 'value', e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50" />
                    {!isViewer && <button onClick={() => removeCustomField(setCustomWorking, f.id)} className="text-red-500 hover:text-red-700 p-2"><Trash2 size={16} /></button>}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeSubModule === 'fp_floor_glance' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {floors.map(floor => (
                <div key={floor.id} className="border border-gray-200 rounded-xl bg-gray-50/50 p-4">
                  <div className="flex items-center justify-between mb-3 border-b border-gray-200 pb-2">
                    <input disabled={isViewer} value={floor.name || ''} onChange={e => updateFloorName(floor.id, e.target.value)} className="font-bold text-gray-800 bg-transparent outline-none focus:border-b border-emerald-500" />
                    {!isViewer && <button onClick={() => removeFloor(floor.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>}
                  </div>
                  <div className="space-y-2">
                    {floor.sections.map(sec => (
                      <div key={sec.id} className="flex gap-2 items-center">
                        <Layers size={14} className="text-gray-400" />
                        <input disabled={isViewer} value={sec.name || ''} onChange={e => updateFloorSection(floor.id, sec.id, e.target.value)} placeholder="Section / Department Name" className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs disabled:bg-gray-100" />
                        {!isViewer && <button onClick={() => removeFloorSection(floor.id, sec.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>}
                      </div>
                    ))}
                  </div>
                  {!isViewer && (
                    <button onClick={() => addFloorSection(floor.id)} className="mt-3 flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                      <Plus size={14} /> Add Section
                    </button>
                  )}
                </div>
              ))}
            </div>
            {!isViewer && (
              <button onClick={addFloor} className="mt-6 flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold border border-gray-300">
                <Plus size={16} /> Add New Floor
              </button>
            )}
          </div>
        )}

        {activeSubModule === 'fp_machinery_list' && (
          <div>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 w-16">S/L</th>
                    <th className="px-4 py-3">Name of Machine</th>
                    <th className="px-4 py-3 w-32">Total Qty</th>
                    {!isViewer && <th className="px-4 py-3 w-16 text-center">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {machines.map((m, i) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-500 font-medium">{i + 1}</td>
                      <td className="px-4 py-2">
                        <input disabled={isViewer} value={m.name || ''} onChange={e => updateMachine(m.id, 'name', e.target.value)} className="w-full px-2 py-1 border border-transparent hover:border-gray-300 focus:border-emerald-500 rounded bg-transparent outline-none disabled:bg-transparent" />
                      </td>
                      <td className="px-4 py-2">
                        <input disabled={isViewer} type="number" min="0" value={m.qty || 0} onChange={e => updateMachine(m.id, 'qty', parseInt(e.target.value) || 0)} className="w-full px-2 py-1 border border-gray-300 rounded disabled:bg-gray-50 text-right" />
                      </td>
                      {!isViewer && (
                        <td className="px-4 py-2 text-center">
                          <button onClick={() => removeMachine(m.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-emerald-50 border-t-2 border-emerald-200">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 font-bold text-emerald-800 text-right">Total Machinery Qty:</td>
                    <td className="px-4 py-3 font-bold text-emerald-800 text-right">
                      {machines.reduce((sum, m) => sum + (Number(m.qty) || 0), 0)}
                    </td>
                    {!isViewer && <td />}
                  </tr>
                </tfoot>
              </table>
            </div>
            {!isViewer && (
              <button onClick={addMachineRow} className="mt-4 flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-sm font-semibold border border-emerald-200">
                <Plus size={16} /> Add Machine Row
              </button>
            )}
          </div>
        )}
        
        {!['fp_basic_info', 'fp_premises', 'fp_working_hour', 'fp_floor_glance', 'fp_machinery_list'].includes(activeSubModule) && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Factory size={48} className="text-gray-300 mb-4" />
            <p className="text-sm">Select a sub-module from the sidebar to view details.</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default FactoryProfile;
