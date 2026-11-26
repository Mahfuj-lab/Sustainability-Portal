import React from 'react';
import { 
  FileCheck, ShieldCheck, Leaf, Target, 
  FileText, Calendar, UploadCloud, CheckCircle2
} from 'lucide-react';

// ============================================================
// PROPS
// ============================================================
interface LicensePermitTrackingProps {
  activeSubModule: string;
  selectedUnit: string;
  unitFullName: string;
  selectedYear: string;
  userRole: string;
}

// ============================================================
// COMPONENT
// ============================================================
const LicensePermitTracking: React.FC<LicensePermitTrackingProps> = ({ 
  activeSubModule, 
  selectedUnit, 
  unitFullName, 
  selectedYear, 
  userRole 
}) => {
  const isSocial = activeSubModule === 'lp_social';
  
  const modeTitle = isSocial 
    ? 'Social Compliance — License & Permit Tracking' 
    : 'Environment Compliance — License & Permit Tracking';
    
  const ModeIcon = isSocial ? ShieldCheck : Leaf;
  const modeBadge = isSocial ? 'Social Compliance' : 'Environment Compliance';

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 mb-1 uppercase tracking-wide">
            <FileCheck size={14} /> Compliance Tracking
          </div>
          <h2 className="text-xl font-bold text-gray-800">{modeTitle}</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">
            {unitFullName} ({selectedUnit}) &bull; {selectedYear}
          </p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-bold shadow-sm ${
          isSocial 
            ? 'bg-blue-50 text-blue-700 border-blue-100' 
            : 'bg-emerald-50 text-emerald-700 border-emerald-100'
        }`}>
          <ModeIcon size={18} />
          {modeBadge}
        </div>
      </div>

      {/* MAIN WORKSPACE PLACEHOLDER */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm min-h-[500px] flex flex-col items-center justify-center p-8 text-center border-dashed">
        <div className="w-20 h-20 rounded-2xl bg-emerald-50 flex items-center justify-center mb-6 border border-emerald-100 shadow-sm">
          <ModeIcon className="text-emerald-600" size={36} />
        </div>
        
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          {modeBadge} Workspace
        </h3>
        
        <p className="text-sm text-gray-500 max-w-md mb-8 leading-relaxed">
          This is a clean, structured placeholder for the <b>{modeBadge}</b> licenses, permits, 
          issue/expiry dates, renewal status badges, and document uploads.
        </p>

        {/* Feature Hint Icons */}
        <div className="flex flex-wrap justify-center gap-6 mb-8 text-gray-400">
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-gray-50 rounded-full border border-gray-100">
              <FileText size={20} />
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider">Licenses</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-gray-50 rounded-full border border-gray-100">
              <Calendar size={20} />
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider">Expiry Dates</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-gray-50 rounded-full border border-gray-100">
              <CheckCircle2 size={20} />
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider">Status</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-gray-50 rounded-full border border-gray-100">
              <UploadCloud size={20} />
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider">Documents</span>
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

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100">
          <Target size={14} /> Ready for license & permit tracking implementation
        </div>
      </div>

    </div>
  );
};

export default LicensePermitTracking;
