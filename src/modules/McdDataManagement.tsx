import React from 'react';
import { 
  Box, Scissors, Layers, Target, 
  FileText, ShieldCheck, Scale, Tag
} from 'lucide-react';

// ============================================================
// PROPS
// ============================================================
interface McdDataManagementProps {
  activeSubModule: string;
  selectedUnit: string;
  unitFullName: string;
  selectedYear: string;
  userRole: string;
}

// ============================================================
// COMPONENT
// ============================================================
const McdDataManagement: React.FC<McdDataManagementProps> = ({ 
  activeSubModule, 
  selectedUnit, 
  unitFullName, 
  selectedYear, 
  userRole 
}) => {
  const isFabrics = activeSubModule === 'mcd_fabrics';
  
  const modeTitle = isFabrics 
    ? 'Fabrics Data — MCD Data Management' 
    : 'Accessories Data — MCD Data Management';
    
  const ModeIcon = isFabrics ? Scissors : Box;
  const modeBadge = isFabrics ? 'Fabrics Data' : 'Accessories Data';
  const descriptionText = isFabrics 
    ? 'material composition, fabric types, GSM/weight tracking, and certifications (GOTS, OCS, GRS, etc.)' 
    : 'accessory categories, trims, buttons, zippers, packaging, and supplier certifications.';

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 mb-1 uppercase tracking-wide">
            <Layers size={14} /> Material & Composition Data
          </div>
          <h2 className="text-xl font-bold text-gray-800">{modeTitle}</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">
            {unitFullName} ({selectedUnit}) &bull; {selectedYear}
          </p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-bold shadow-sm ${
          isFabrics 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
            : 'bg-blue-50 text-blue-700 border-blue-100'
        }`}>
          <ModeIcon size={18} />
          {modeBadge}
        </div>
      </div>

      {/* MAIN WORKSPACE PLACEHOLDER */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm min-h-[500px] flex flex-col items-center justify-center p-8 text-center border-dashed">
        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 border shadow-sm ${
          isFabrics ? 'bg-emerald-50 border-emerald-100' : 'bg-blue-50 border-blue-100'
        }`}>
          <ModeIcon className={isFabrics ? 'text-emerald-600' : 'text-blue-600'} size={36} />
        </div>
        
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          {modeBadge} Workspace
        </h3>
        
        <p className="text-sm text-gray-500 max-w-lg mb-8 leading-relaxed">
          This is a clean, structured placeholder for the <b>{modeBadge}</b> tracking. 
          It will support <b>{descriptionText}</b> ready for your data entry forms.
        </p>

        {/* Feature Hint Icons */}
        <div className="flex flex-wrap justify-center gap-6 mb-8 text-gray-400">
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-gray-50 rounded-full border border-gray-100">
              <FileText size={20} />
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-center max-w-[80px]">Material List</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-gray-50 rounded-full border border-gray-100">
              <Scale size={20} />
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-center max-w-[80px]">Weight & Consumption</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-gray-50 rounded-full border border-gray-100">
              <ShieldCheck size={20} />
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-center max-w-[80px]">Certifications</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-gray-50 rounded-full border border-gray-100">
              <Tag size={20} />
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-center max-w-[80px]">Supplier Info</span>
          </div>
        </div>
        
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Category</span>
            <div className="text-sm font-bold text-gray-800">{modeBadge}</div>
          </div>
          <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Year</span>
            <div className="text-sm font-bold text-gray-800">{selectedYear}</div>
          </div>
          <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Unit</span>
            <div className="text-sm font-bold text-gray-800">{selectedUnit}</div>
          </div>
        </div>

        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border ${
          isFabrics 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
            : 'bg-blue-50 text-blue-700 border-blue-100'
        }`}>
          <Target size={14} /> Ready for MCD data implementation
        </div>
      </div>

    </div>
  );
};

export default McdDataManagement;
