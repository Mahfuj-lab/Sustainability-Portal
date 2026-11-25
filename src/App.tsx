import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Leaf, LogOut, Users, Settings, BarChart3, Zap, Flame, Factory,
  FileSpreadsheet, Save, X, Check, AlertCircle, Menu, Eye, EyeOff, Shield, Plus,
  ChevronDown, ChevronRight, Briefcase, Box, TrendingUp, Target, Globe, 
  FileCheck, Scale, FolderOpen
} from 'lucide-react';

// ============================================================
// FIRESTORE REST API (no SDK, native fetch)
// ============================================================
const PROJECT_ID = "sustainability-portal-886cf";
const API_KEY = "AIzaSyB6JNUFMjSOjD4Xr3-hMQ90MNurDN8URu0";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const toFSValue = (v: any): any => {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFSValue) } };
  if (typeof v === 'object') {
    const fields: any = {};
    Object.keys(v).forEach(k => { fields[k] = toFSValue(v[k]); });
    return { mapValue: { fields } };
  }
  return { nullValue: null };
};

const fromFSValue = (fv: any): any => {
  if (!fv) return null;
  if ('stringValue' in fv) return fv.stringValue;
  if ('integerValue' in fv) return parseInt(fv.integerValue, 10);
  if ('doubleValue' in fv) return fv.doubleValue;
  if ('booleanValue' in fv) return fv.booleanValue;
  if ('nullValue' in fv) return null;
  if ('arrayValue' in fv) return (fv.arrayValue.values || []).map(fromFSValue);
  if ('mapValue' in fv) return fromFSFields(fv.mapValue.fields || {});
  return null;
};

const fromFSFields = (fields: any): any => {
  const o: any = {};
  Object.keys(fields || {}).forEach(k => { o[k] = fromFSValue(fields[k]); });
  return o;
};

const toFSFields = (obj: any): any => {
  const fields: any = {};
  Object.keys(obj || {}).forEach(k => { fields[k] = toFSValue(obj[k]); });
  return fields;
};

const restGet = async (path: string) => {
  const r = await fetch(`${BASE}/${path}?key=${API_KEY}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GET ${path} failed: ${r.status}`);
  const json = await r.json();
  return { id: json.name?.split('/').pop(), ...fromFSFields(json.fields || {}) };
};

const restList = async (collectionId: string) => {
  const r = await fetch(`${BASE}/${collectionId}?key=${API_KEY}`);
  if (!r.ok) {
    if (r.status === 404) return [];
    throw new Error(`LIST ${collectionId} failed: ${r.status}`);
  }
  const json = await r.json();
  const docs = json.documents || [];
  return docs.map((d: any) => ({ id: d.name?.split('/').pop(), ...fromFSFields(d.fields || {}) }));
};

const restSet = async (collectionId: string, docId: string, data: any) => {
  const r = await fetch(`${BASE}/${collectionId}/${docId}?key=${API_KEY}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFSFields(data) }),
  });
  if (!r.ok) throw new Error(`SET failed: ${r.status} ${await r.text()}`);
  return true;
};

const restCreate = async (collectionId: string, data: any) => {
  const r = await fetch(`${BASE}/${collectionId}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFSFields(data) }),
  });
  if (!r.ok) throw new Error(`CREATE failed: ${r.status} ${await r.text()}`);
  const json = await r.json();
  return json.name?.split('/').pop();
};

const restPatch = async (collectionId: string, docId: string, data: any) => {
  const mask = Object.keys(data).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const r = await fetch(`${BASE}/${collectionId}/${docId}?key=${API_KEY}&${mask}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFSFields(data) }),
  });
  if (!r.ok) throw new Error(`PATCH failed: ${r.status} ${await r.text()}`);
  return true;
};

const restQuery = async (collectionId: string, filters: { field: string; value: string }[]) => {
  const r = await fetch(`${BASE}:runQuery?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          compositeFilter: {
            op: 'AND',
            filters: filters.map(f => ({
              fieldFilter: {
                field: { fieldPath: f.field },
                op: 'EQUAL',
                value: { stringValue: f.value },
              },
            })),
          },
        },
      },
    }),
  });
  if (!r.ok) throw new Error(`QUERY failed: ${r.status} ${await r.text()}`);
  const json = await r.json();
  const results: any[] = [];
  (json || []).forEach((row: any) => {
    if (row.document) {
      results.push({ id: row.document.name?.split('/').pop(), ...fromFSFields(row.document.fields || {}) });
    }
  });
  return results;
};

// ============================================================
// TYPES & CONSTANTS
// ============================================================
type Role = 'super_admin' | 'entry_user' | 'viewer';
interface UserRecord { id?: string; email: string; password: string; full_name: string; role: Role; allowed_modules: string[]; allowed_factories: string[]; }

const FACTORIES = ['EKWL', 'DKL', 'DDL', 'EKWL-HW', 'ESL', 'ESL-Extention'];
const YEARS = [2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030];

// Updated Modules structure with subModules
const MODULES = [
  { 
    id: 'factory_profile', 
    label: 'Factory Profile', 
    icon: Factory,
    subModules: [{ id: 'factory_profile_overview', label: 'Overview (Coming Soon)' }]
  },
  { 
    id: 'inventory_mgmt', 
    label: 'Inventory Management', 
    icon: Box,
    subModules: [{ id: 'inventory_mgmt_overview', label: 'Overview (Coming Soon)' }]
  },
  { 
    id: 'kpi_mgmt', 
    label: 'KPI Management', 
    icon: TrendingUp,
    subModules: [{ id: 'kpi_mgmt_overview', label: 'Overview (Coming Soon)' }]
  },
  { 
    id: 'baseline_target', 
    label: 'Baseline, Target, Evaluation', 
    icon: Target,
    subModules: [{ id: 'baseline_target_overview', label: 'Overview (Coming Soon)' }]
  },
  { 
    id: 'long_term_strategy', 
    label: 'Long Term Strategy', 
    icon: Globe,
    subModules: [{ id: 'long_term_strategy_overview', label: 'Overview (Coming Soon)' }]
  },
  { 
    id: 'license_permit', 
    label: 'License & Permit Tracking', 
    icon: FileCheck,
    subModules: [{ id: 'license_permit_overview', label: 'Overview (Coming Soon)' }]
  },
  { 
    id: 'legal_requirement', 
    label: 'Legal Requirement Monitoring', 
    icon: Scale,
    subModules: [{ id: 'legal_requirement_overview', label: 'Overview (Coming Soon)' }]
  },
  { 
    id: 'documents', 
    label: 'Documents', 
    icon: FolderOpen,
    subModules: [{ id: 'documents_overview', label: 'Overview (Coming Soon)' }]
  },
];

const DEFAULT_FACTORS = { grid_electricity: 0.62, natural_gas: 2.02, diesel: 2.68, petrol_octane: 2.31, cng: 2.02 };

// ============================================================
// HELPERS
// ============================================================
const n = (v: any): number => { const x = parseFloat(v); return isNaN(x) ? 0 : x; };

// ============================================================
// MAIN APP
// ============================================================
const App: React.FC = () => {
  const [user, setUser] = useState<UserRecord | null>(null);
  const [bootLoading, setBootLoading] = useState(true);
  const [factors, setFactors] = useState(DEFAULT_FACTORS);
  const [factory, setFactory] = useState('EKWL');
  const [year, setYear] = useState(2027);
  
  // Navigation State
  const [activeModule, setActiveModule] = useState<string>('factory_profile_overview');
  const [expandedModules, setExpandedModules] = useState<string[]>(['factory_profile']);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Auth & Initialization
  useEffect(() => {
    const sess = localStorage.getItem('sp_session');
    if (sess) { try { setUser(JSON.parse(sess)); } catch {} }
    setBootLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const ef = await restGet('settings/emission_factors');
        if (ef) {
          setFactors({
            grid_electricity: n(ef.grid_electricity) || DEFAULT_FACTORS.grid_electricity,
            natural_gas: n(ef.natural_gas) || DEFAULT_FACTORS.natural_gas,
            diesel: n(ef.diesel) || DEFAULT_FACTORS.diesel,
            petrol_octane: n(ef.petrol_octane) || DEFAULT_FACTORS.petrol_octane,
            cng: n(ef.cng) || DEFAULT_FACTORS.cng,
          });
        }
      } catch {}
    })();
  }, []);

  const isSuper = user?.role === 'super_admin';
  const isViewer = user?.role === 'viewer';

  const userAllowedModules = useMemo(() => {
    if (!user) return [];
    // Superadmin sees all, others see all 8 new modules by default
    return MODULES.map(m => m.id);
  }, [user]);

  const userAllowedFactories = useMemo(() => {
    if (!user) return [];
    if (isSuper) return [...FACTORIES];
    return user.allowed_factories || [];
  }, [user, isSuper]);

  const canAccessModule = (id: string) => userAllowedModules.includes(id);

  useEffect(() => {
    if (userAllowedFactories.length && !userAllowedFactories.includes(factory)) setFactory(userAllowedFactories[0]);
  }, [userAllowedFactories, factory]);

  const logout = () => { localStorage.removeItem('sp_session'); setUser(null); };

  const toggleExpand = (id: string) => {
    setExpandedModules(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const findActiveModuleAndSub = () => {
    for (const mod of MODULES) {
      const sub = mod.subModules.find(s => s.id === activeModule);
      if (sub) return { mainModule: mod, subModule: sub };
    }
    return { mainModule: MODULES[0], subModule: MODULES[0].subModules[0] };
  };

  const { mainModule: currentMain, subModule: currentSub } = findActiveModuleAndSub();

  if (bootLoading) return <div className="min-h-screen flex items-center justify-center bg-white"><div className="animate-pulse text-emerald-600 text-sm">Loading...</div></div>;
  if (!user) return <LoginScreen onLogin={setUser} />;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 hover:text-emerald-600"><Menu size={20} /></button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-sm">
                <Leaf className="text-white" size={18} />
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-800 leading-tight">Sustainability</h1>
                <p className="text-[10px] text-emerald-600 font-medium">Portal</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-2">
              {/* LABEL CHANGED TO UNIT */}
              <span className="text-[11px] text-gray-500">Unit</span>
              <select value={factory} onChange={e => setFactory(e.target.value)} className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none">
                {userAllowedFactories.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <span className="text-[11px] text-gray-500">Year</span>
              <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none">
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-semibold text-gray-800">{user.full_name}</span>
              <span className="text-[10px] text-emerald-600 uppercase">{user.role.replace('_',' ')}</span>
            </div>
            <button onClick={logout} title="Logout" className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600"><LogOut size={18} /></button>
          </div>
        </div>
        
        {/* MOBILE SELECTORS */}
        <div className="md:hidden px-4 pb-2 flex gap-2">
          <select value={factory} onChange={e => setFactory(e.target.value)} className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded-lg bg-white">
            {userAllowedFactories.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded-lg bg-white">
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR */}
        {sidebarOpen && (
          <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-[calc(100vh-61px)] overflow-y-auto hidden md:flex">
            <nav className="p-3 space-y-1">
              {MODULES.map(m => {
                const Icon = m.icon;
                const isExpanded = expandedModules.includes(m.id);
                return (
                  <div key={m.id} className="flex flex-col">
                    <button 
                      onClick={() => toggleExpand(m.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                        isExpanded ? 'bg-emerald-50/50 text-emerald-800 font-semibold' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={16} className={isExpanded ? 'text-emerald-600' : 'text-gray-400'} />
                        <span>{m.label}</span>
                      </div>
                      {isExpanded ? <ChevronDown size={14} className="text-emerald-600" /> : <ChevronRight size={14} className="text-gray-400" />}
                    </button>
                    
                    {/* SUBMODULES */}
                    {isExpanded && (
                      <div className="ml-9 mt-1 space-y-1 border-l border-gray-100 pl-2">
                        {m.subModules.map(sub => {
                          const isActive = activeModule === sub.id;
                          return (
                            <button
                              key={sub.id}
                              onClick={() => setActiveModule(sub.id)}
                              className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors ${
                                isActive ? 'bg-emerald-100/60 text-emerald-700 font-medium' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                              }`}
                            >
                              {sub.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </aside>
        )}

        {/* MOBILE DRAWER */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-30 flex">
            <div className="absolute inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
            <div className="relative w-64 bg-white h-full shadow-xl overflow-y-auto flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <span className="text-sm font-bold text-gray-800">Menu</span>
                <button onClick={() => setSidebarOpen(false)}><X size={18} /></button>
              </div>
              <nav className="p-3 space-y-1">
                {MODULES.map(m => {
                  const Icon = m.icon;
                  const isExpanded = expandedModules.includes(m.id);
                  return (
                    <div key={m.id} className="flex flex-col">
                      <button 
                        onClick={() => toggleExpand(m.id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                          isExpanded ? 'bg-emerald-50/50 text-emerald-800 font-semibold' : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon size={16} className={isExpanded ? 'text-emerald-600' : 'text-gray-400'} />
                          <span>{m.label}</span>
                        </div>
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                      {isExpanded && (
                        <div className="ml-9 mt-1 space-y-1 border-l border-gray-100 pl-2">
                          {m.subModules.map(sub => {
                            const isActive = activeModule === sub.id;
                            return (
                              <button
                                key={sub.id}
                                onClick={() => { setActiveModule(sub.id); setSidebarOpen(false); }}
                                className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors ${
                                  isActive ? 'bg-emerald-100/60 text-emerald-700 font-medium' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                                }`}
                              >
                                {sub.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <div className="max-w-5xl mx-auto space-y-4">
            
            {/* PLACEHOLDER CARD */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 min-h-[60vh] flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-6">
                <Factory className="text-emerald-600" size={32} />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                {currentMain.label} <ChevronRight size={18} className="inline text-gray-400" /> {currentSub.label}
              </h2>
              <p className="text-sm text-gray-500 max-w-md mb-8">
                This is a clean placeholder for the new module. You can start building forms, data tables, and analytics here.
              </p>
              
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                  <span className="text-xs text-gray-500 uppercase font-semibold">Unit</span>
                  <div className="text-sm font-bold text-gray-800">{factory}</div>
                </div>
                <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                  <span className="text-xs text-gray-500 uppercase font-semibold">Year</span>
                  <div className="text-sm font-bold text-gray-800">{year}</div>
                </div>
                <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                  <span className="text-xs text-gray-500 uppercase font-semibold">Module ID</span>
                  <div className="text-sm font-bold text-emerald-600 font-mono">{currentSub.id}</div>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100">
                <Check size={14} /> Ready for implementation
              </div>
            </div>

          </div>
        </main>
      </div>

      <footer className="text-center text-[11px] text-gray-400 py-4 border-t border-gray-100 bg-white mt-auto">
        © 2027 Sustainability Portal • Designed &amp; Developed by Md. Mahfuj Rahman Rasel | Support: +880 1705-472581
      </footer>
    </div>
  );
};

// ============================================================
// LOGIN SCREEN
// ============================================================
const LoginScreen: React.FC<{ onLogin: (u: UserRecord) => void }> = ({ onLogin }) => {
  const [mode, setMode] = useState<'signin'|'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignin = async () => {
    setError('');
    if (!email || !password) { setError('Email and password are required.'); return; }
    setLoading(true);
    try {
      const matches = await restQuery('users', [
        { field: 'email', value: email.trim().toLowerCase() },
        { field: 'password', value: password },
      ]);
      if (matches.length === 0) { setError('Invalid credentials.'); setLoading(false); return; }
      const u = matches[0] as UserRecord;
      localStorage.setItem('sp_session', JSON.stringify(u));
      onLogin(u);
    } catch (e: any) { setError(e.message || 'Sign in failed.'); }
    finally { setLoading(false); }
  };

  const handleSignup = async () => {
    setError('');
    if (!email || !password || !fullName) { setError('All fields are required.'); return; }
    setLoading(true);
    try {
      const existing = await restList('users');
      const isFirst = existing.length === 0;
      const role: Role = isFirst ? 'super_admin' : 'viewer';
      const newUser: Omit<UserRecord,'id'> = {
        email: email.trim().toLowerCase(), password, full_name: fullName.trim(), role,
        allowed_modules: isFirst ? MODULES.map(m => m.id) : ['kpi_mgmt'],
        allowed_factories: [...FACTORIES],
      };
      const newId = await restCreate('users', newUser);
      const u: UserRecord = { id: newId, ...newUser };
      localStorage.setItem('sp_session', JSON.stringify(u));
      onLogin(u);
    } catch (e: any) { setError(e.message || 'Sign up failed.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col relative">
      <img 
        src="https://i.ibb.co/8nj060LX/epyllion.png" 
        alt="Epyllion Group" 
        className="h-12 w-auto object-contain fixed top-5 left-6" 
      />
      <div className="flex-1 flex items-center justify-center px-4 py-10 mt-10">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl shadow-emerald-100/60 border border-emerald-100 p-8">
            <div className="flex flex-col items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-800">Sustainability Portal</h1>
              <p className="text-sm text-emerald-600 mt-1">{mode==='signin' ? 'Sign in to your account' : 'Create a new account'}</p>
            </div>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 shrink-0" /> <span>{error}</span>
              </div>
            )}
            <div className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name</label>
                  <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Doe"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Password</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                    className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-600">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button onClick={mode==='signin' ? handleSignin : handleSignup} disabled={loading}
                className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold text-sm shadow-md shadow-emerald-200">
                {loading ? 'Please wait...' : mode==='signin' ? 'Sign In' : 'Create Account'}
              </button>
            </div>
            <div className="mt-5 text-center text-sm text-gray-500">
              {mode==='signin' ? (
                <>Don't have an account? <button onClick={() => { setMode('signup'); setError(''); }} className="text-emerald-600 font-semibold hover:underline">Sign Up</button></>
              ) : (
                <>Already have an account? <button onClick={() => { setMode('signin'); setError(''); }} className="text-emerald-600 font-semibold hover:underline">Sign In</button></>
              )}
            </div>
            <div className="mt-4 p-3 rounded-lg bg-emerald-50/60 border border-emerald-100 text-[11px] text-emerald-700">
              <Shield size={12} className="inline mr-1" />First registered user becomes <b>super_admin</b>.
            </div>
          </div>
        </div>
      </div>
      <footer className="text-center text-[11px] text-gray-400 py-5 border-t border-gray-100">
        © 2027 Sustainability Portal • Designed &amp; Developed by Md. Mahfuj Rahman Rasel
      </footer>
    </div>
  );
};

export default App;
