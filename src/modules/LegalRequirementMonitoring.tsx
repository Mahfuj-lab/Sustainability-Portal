import React from 'react';
import { 
  Scale, Plus, Save, FileText, 
  ExternalLink, Target, Info
} from 'lucide-react';

// ============================================================
// PROPS
// ============================================================
interface LegalRequirementMonitoringProps {
  selectedUnit: string;
  unitFullName: string;
  selectedYear: string;
  userRole: string;
}

// ============================================================
// COMPONENT
// ============================================================
const LegalRequirementMonitoring: React.FC<LegalRequirementMonitoringProps> = ({ 
  selectedUnit, 
  unitFullName, 
  selectedYear, 
  userRole 
}) => {
  const isViewer = userRole === 'viewer';

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 mb-1 uppercase tracking-wide">
            <Scale size={14} /> Compliance
          </div>
          <h2 className="text-xl font-bold text-gray-800">Legal Requirement Monitoring</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">
            {unitFullName} ({selectedUnit}) &bull; {selectedYear}
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm font-bold text-gray-700 shadow-sm">
          <Target size={18} className="text-emerald-600" />
          Master Register
        </div>
      </div>

      {/* WORKSPACE AREA */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        
        {/* TOOLBAR */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-700">Compliance Register</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
              Placeholder Mode
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              hidden={isViewer}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <Plus size={14} /> Add Row
            </button>
            <button 
              hidden={isViewer}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              <Save size={14} /> Save
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 w-16 text-center">S/L</th>
                <th className="px-4 py-3 min-w-[250px]">Legal Requirement / License Name</th>
                <th className="px-4 py-3 min-w-[200px]">Issuing Organization / Authority</th>
                <th className="px-4 py-3 min-w-[200px]">Official Website Link</th>
                <th className="px-4 py-3 min-w-[200px]">Applicability / Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* Placeholder Row 1 */}
              <tr className="hover:bg-gray-50/50 group">
                <td className="px-4 py-3 text-center text-gray-500 font-medium">1</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-gray-400" />
                    <span className="text-gray-700 font-medium">Trade License</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">City Corporation</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 cursor-pointer text-xs font-medium">
                    Visit Portal <ExternalLink size={12} />
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  Mandatory for all commercial operations.
                </td>
              </tr>

              {/* Placeholder Row 2 */}
              <tr className="hover:bg-gray-50/50 group">
                <td className="px-4 py-3 text-center text-gray-500 font-medium">2</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-gray-400" />
                    <span className="text-gray-700 font-medium">Fire Safety Certificate</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">Fire Service & Civil Defence</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 cursor-pointer text-xs font-medium">
                    Visit Portal <ExternalLink size={12} />
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  Renewed annually.
                </td>
              </tr>

              {/* Placeholder Row 3 */}
              <tr className="hover:bg-gray-50/50 group">
                <td className="px-4 py-3 text-center text-gray-500 font-medium">3</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-gray-400" />
                    <span className="text-gray-700 font-medium">Environment Clearance</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">Department of Environment</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 cursor-pointer text-xs font-medium">
                    Visit Portal <ExternalLink size={12} />
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  Required for ETP operation.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* FOOTER / INFO */}
        <div className="bg-gray-50/50 px-4 py-3 border-t border-gray-200 flex items-start gap-2 text-xs text-gray-500">
          <Info size={16} className="text-emerald-600 shrink-0 mt-0.5" />
          <p>
            This is a placeholder preview. The full index, dynamic row creation, save functionality, and file attachments will be implemented here.
          </p>
        </div>

      </div>
    </div>
  );
};

export default LegalRequirementMonitoring;
