import React, { useState } from 'react';
import { 
  FolderOpen, FileText, Search, Plus, UploadCloud, 
  File, FileCheck, Shield, Users, Settings, HardHat,
  MoreVertical, Download
} from 'lucide-react';

// ============================================================
// PROPS
// ============================================================
interface DocumentsModuleProps {
  activeSubModule: string;
  selectedUnit: string;
  unitFullName: string;
  selectedYear: string;
  userRole: string;
}

// ============================================================
// CONFIGURATION
// ============================================================
const DEPARTMENTS: Record<string, { title: string; icon: any; color: string; bg: string; border: string }> = {
  doc_hr: { 
    title: 'HR', 
    icon: Users, 
    color: 'text-blue-600', 
    bg: 'bg-blue-50', 
    border: 'border-blue-200' 
  },
  doc_admin: { 
    title: 'Admin', 
    icon: Settings, 
    color: 'text-gray-600', 
    bg: 'bg-gray-50', 
    border: 'border-gray-200' 
  },
  doc_social: { 
    title: 'Social', 
    icon: Shield, 
    color: 'text-purple-600', 
    bg: 'bg-purple-50', 
    border: 'border-purple-200' 
  },
  doc_environment: { 
    title: 'Environment', 
    icon: FileCheck, 
    color: 'text-emerald-600', 
    bg: 'bg-emerald-50', 
    border: 'border-emerald-200' 
  },
  doc_fire_safety: { 
    title: 'Fire, Health & Safety', 
    icon: HardHat, 
    color: 'text-orange-600', 
    bg: 'bg-orange-50', 
    border: 'border-orange-200' 
  },
};

// ============================================================
// COMPONENT
// ============================================================
const DocumentsModule: React.FC<DocumentsModuleProps> = ({ 
  activeSubModule, 
  selectedUnit, 
  unitFullName, 
  selectedYear, 
  userRole 
}) => {
  const isViewer = userRole === 'viewer';
  const [searchQuery, setSearchQuery] = useState('');
  
  // Fallback to HR if submodule is not matched
  const activeDept = DEPARTMENTS[activeSubModule] || DEPARTMENTS.doc_hr;
  const ModeIcon = activeDept.icon;

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 mb-1 uppercase tracking-wide">
            <FolderOpen size={14} /> Document Repository
          </div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            Documents &mdash; <span className={activeDept.color}>{activeDept.title}</span>
          </h2>
          <p className="text-sm text-gray-500 font-medium mt-1">
            {unitFullName} ({selectedUnit}) &bull; {selectedYear}
          </p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-bold shadow-sm ${activeDept.bg} ${activeDept.color} ${activeDept.border}`}>
          <ModeIcon size={18} />
          {activeDept.title}
        </div>
      </div>

      {/* MAIN WORKSPACE */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        
        {/* TOOLBAR */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50/50 gap-3">
          
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search folders or documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button 
              disabled={isViewer}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <Plus size={14} /> Create Folder
            </button>
            <button 
              disabled={isViewer}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              <UploadCloud size={14} /> Upload Document
            </button>
          </div>
        </div>

        {/* FILE BROWSER PLACEHOLDER LIST */}
        <div className="flex-1 p-4">
          
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 mb-2">
            <div className="col-span-6 sm:col-span-5">Name</div>
            <div className="col-span-3 sm:col-span-3 hidden sm:block">Owner</div>
            <div className="col-span-3 sm:col-span-2 text-right sm:text-left">Last Modified</div>
            <div className="col-span-3 sm:col-span-2 text-right">Size / Actions</div>
          </div>

          {/* List Items */}
          <div className="space-y-1">
            
            {/* Dummy Folder 1 */}
            <div className="grid grid-cols-12 gap-4 items-center px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors group cursor-pointer border border-transparent hover:border-gray-200">
              <div className="col-span-6 sm:col-span-5 flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-500 rounded-lg">
                  <FolderOpen size={18} />
                </div>
                <span className="text-sm font-semibold text-gray-800">Annual Certifications {selectedYear}</span>
              </div>
              <div className="col-span-3 text-sm text-gray-500 hidden sm:block">Admin User</div>
              <div className="col-span-3 sm:col-span-2 text-sm text-gray-500 text-right sm:text-left">Oct 12, 2026</div>
              <div className="col-span-3 sm:col-span-2 flex justify-end items-center gap-3">
                <span className="text-xs font-medium text-gray-400">Folder</span>
                <button className="text-gray-400 hover:text-gray-700 p-1"><MoreVertical size={16} /></button>
              </div>
            </div>

            {/* Dummy PDF File */}
            <div className="grid grid-cols-12 gap-4 items-center px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors group cursor-pointer border border-transparent hover:border-gray-200">
              <div className="col-span-6 sm:col-span-5 flex items-center gap-3">
                <div className="p-2 bg-red-50 text-red-500 rounded-lg">
                  <FileText size={18} />
                </div>
                <span className="text-sm font-semibold text-gray-800">Compliance_Certificate_2026.pdf</span>
              </div>
              <div className="col-span-3 text-sm text-gray-500 hidden sm:block">Admin User</div>
              <div className="col-span-3 sm:col-span-2 text-sm text-gray-500 text-right sm:text-left">Sep 28, 2026</div>
              <div className="col-span-3 sm:col-span-2 flex justify-end items-center gap-3">
                <span className="text-xs font-medium text-gray-400">2.4 MB</span>
                <button className="text-gray-400 hover:text-gray-700 p-1"><Download size={16} /></button>
              </div>
            </div>

            {/* Dummy Excel File */}
            <div className="grid grid-cols-12 gap-4 items-center px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors group cursor-pointer border border-transparent hover:border-gray-200">
              <div className="col-span-6 sm:col-span-5 flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-500 rounded-lg">
                  <File size={18} />
                </div>
                <span className="text-sm font-semibold text-gray-800">Employee_Register_Master.xlsx</span>
              </div>
              <div className="col-span-3 text-sm text-gray-500 hidden sm:block">HR Manager</div>
              <div className="col-span-3 sm:col-span-2 text-sm text-gray-500 text-right sm:text-left">Nov 05, 2026</div>
              <div className="col-span-3 sm:col-span-2 flex justify-end items-center gap-3">
                <span className="text-xs font-medium text-gray-400">1.1 MB</span>
                <button className="text-gray-400 hover:text-gray-700 p-1"><Download size={16} /></button>
              </div>
            </div>

          </div>

          {/* Empty State / Info Banner */}
          <div className="mt-8 flex flex-col items-center justify-center py-10 px-4 bg-gray-50/50 border border-dashed border-gray-200 rounded-xl">
            <div className="p-3 bg-white rounded-full shadow-sm mb-3">
              <FolderOpen size={24} className="text-gray-400" />
            </div>
            <h3 className="text-sm font-bold text-gray-700 mb-1">Document Storage Placeholder</h3>
            <p className="text-xs text-gray-500 text-center max-w-md">
              This is a visual preview. The full folder structure, drag-and-drop uploads, PDF/Excel previews, and Firebase Storage integration will be implemented here.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
};

export default DocumentsModule;
