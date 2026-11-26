import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Building2,
  CheckSquare,
  Square,
  Pencil,
  Trash2,
  X,
  Save,
  Search,
  Filter,
  Activity,
  FileText,
  Download,
  Lock,
  Unlock,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { UNIT_DIRECTORY } from '../utils/unitDirectory';

export interface UserManagementProps {
  currentUser?: any;
  userRole?: string;
  restGet?: (...args: any[]) => Promise<any>;
  restSet?: (...args: any[]) => Promise<any>;
  [key: string]: any;
}

type RoleKey = 'super_admin' | 'unit_admin' | 'data_entry' | 'viewer';

interface RoleDef {
  key: RoleKey;
  label: string;
  badgeClass: string;
}

interface PortalUser {
  id: string;
  fullName: string;
  email: string;
  designation: string;
  role: RoleKey;
  allUnits: boolean;
  units: string[];
  modules: string[];
  status: string;
  createdAt?: string;
}

interface AuditLog {
  id: string;
  timestamp: string;
  userName: string;
  userRole: string;
  unit: string;
  module: string;
  action: string;
  details: string;
}

const ROLES: RoleDef[] = [
  { key: 'super_admin', label: 'Super Admin', badgeClass: 'bg-purple-100 text-purple-700 border-purple-200' },
  { key: 'unit_admin', label: 'Unit Admin', badgeClass: 'bg-blue-100 text-blue-700 border-blue-200' },
  { key: 'data_entry', label: 'Data Entry Officer', badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { key: 'viewer', label: 'Auditor / Viewer', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' },
];

const ROLE_LABEL: Record<RoleKey, string> = {
  super_admin: 'Super Admin',
  unit_admin: 'Unit Admin',
  data_entry: 'Data Entry Officer',
  viewer: 'Auditor / Viewer',
};

const ALL_MODULES: string[] = [
  'Factory Profile',
  'Inventory',
  'KPI',
  'Baseline & Target',
  'Long Term Strategy',
  'License & Permit',
  'Legal Monitoring',
  'Summary',
  'MCD Data',
  'Documents',
];

const UNIT_CODES: string[] = [
  'EKWL',
  'DKL',
  'DDL',
  'EKWL-HW',
  'ESL',
  'ESL-Extention',
  'EFL',
  'EKL',
  'EPL',
  'EWL',
];

const ACTION_TYPES: string[] = ['All', 'Data Entry', 'Update', 'Export', 'Lock/Unlock'];

function resolveUnitName(code: string): string {
  const directory = UNIT_DIRECTORY as unknown;
  if (Array.isArray(directory)) {
    const found = (directory as any[]).find((u) => u && (u.code === code || u.id === code));
    if (found) return found.fullName || found.name || code;
  } else if (directory && typeof directory === 'object') {
    const obj = directory as Record<string, any>;
    if (obj[code]) return obj[code].fullName || obj[code].name || code;
    const found = Object.values(obj).find((u: any) => u && (u.code === code || u.id === code));
    if (found) return found.fullName || found.name || code;
  }
  return code;
}

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function normalizeUsers(raw: unknown): PortalUser[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r) => r && typeof r === 'object')
    .map((r: any) => ({
      id: typeof r.id === 'string' && r.id ? r.id : genId('user'),
      fullName: typeof r.fullName === 'string' ? r.fullName : '',
      email: typeof r.email === 'string' ? r.email : '',
      designation: typeof r.designation === 'string' ? r.designation : '',
      role: (['super_admin', 'unit_admin', 'data_entry', 'viewer'] as RoleKey[]).includes(r.role)
        ? (r.role as RoleKey)
        : 'viewer',
      allUnits: Boolean(r.allUnits),
      units: Array.isArray(r.units) ? r.units.filter((u: any) => typeof u === 'string') : [],
      modules: Array.isArray(r.modules) ? r.modules.filter((m: any) => typeof m === 'string') : [],
      status: r.status === 'suspended' ? 'suspended' : 'active',
      createdAt: typeof r.createdAt === 'string' ? r.createdAt : undefined,
    }));
}

function normalizeLogs(raw: unknown): AuditLog[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r) => r && typeof r === 'object')
    .map((r: any) => ({
      id: typeof r.id === 'string' && r.id ? r.id : genId('log'),
      timestamp: typeof r.timestamp === 'string' ? r.timestamp : '',
      userName: typeof r.userName === 'string' ? r.userName : 'Unknown',
      userRole: typeof r.userRole === 'string' ? r.userRole : 'viewer',
      unit: typeof r.unit === 'string' ? r.unit : '—',
      module: typeof r.module === 'string' ? r.module : '—',
      action: typeof r.action === 'string' ? r.action : 'Update',
      details: typeof r.details === 'string' ? r.details : '',
    }))
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
}

function emptyUser(): PortalUser {
  return {
    id: genId('user'),
    fullName: '',
    email: '',
    designation: '',
    role: 'data_entry',
    allUnits: false,
    units: [],
    modules: [],
    status: 'active',
  };
}

const SAMPLE_LOGS: AuditLog[] = [
  {
    id: 'sample-1',
    timestamp: new Date().toISOString(),
    userName: 'System',
    userRole: 'super_admin',
    unit: 'EKWL',
    module: 'Inventory / Electricity',
    action: 'Data Entry',
    details: 'Monthly electricity consumption recorded for 2025.',
  },
  {
    id: 'sample-2',
    timestamp: new Date(Date.now() - 3600_000).toISOString(),
    userName: 'System',
    userRole: 'unit_admin',
    unit: 'DKL',
    module: 'GHG Summary',
    action: 'Export',
    details: 'Exported SBTi GHG inventory pack.',
  },
];

export default function UserManagement({
  currentUser,
  userRole,
  restGet,
  restSet,
}: UserManagementProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'logs'>('users');

  const [users, setUsers] = useState<PortalUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);
  const [usersError, setUsersError] = useState<string>('');
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<PortalUser | null>(null);
  const [savingUser, setSavingUser] = useState<boolean>(false);

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);
  const [logsError, setLogsError] = useState<string>('');
  const [filterUnit, setFilterUnit] = useState<string>('All Units');
  const [filterAction, setFilterAction] = useState<string>('All');
  const [searchUser, setSearchUser] = useState<string>('');

  const isSuperAdmin = useMemo<boolean>(() => {
    if (userRole) return userRole.toLowerCase() === 'super_admin' || userRole.toLowerCase() === 'superadmin';
    if (currentUser && typeof currentUser.role === 'string') {
      return currentUser.role.toLowerCase() === 'super_admin';
    }
    return false;
  }, [userRole, currentUser]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoadingUsers(true);
      try {
        if (restGet) {
          const data = await restGet('settings/portal_users');
          if (mounted) setUsers(normalizeUsers(data));
        }
      } catch (err) {
        if (mounted) setUsersError('Could not load users. Please retry.');
      } finally {
        if (mounted) setLoadingUsers(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [restGet]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoadingLogs(true);
      try {
        if (restGet) {
          const data = await restGet('settings/audit_logs');
          if (mounted) setLogs(normalizeLogs(data));
        }
      } catch (err) {
        if (mounted) setLogsError('Could not load audit logs.');
      } finally {
        if (mounted) setLoadingLogs(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [restGet]);

  const persistUsers = async (next: PortalUser[]): Promise<void> => {
    setUsers(next);
    if (restSet) {
      try {
        await restSet('settings/portal_users', next);
      } catch (err) {
        setUsersError('Failed to save users. Please retry.');
      }
    }
  };

  const openAddForm = (): void => {
    setEditingUser(null);
    setShowForm(true);
  };

  const openEditForm = (user: PortalUser): void => {
    setEditingUser(user);
    setShowForm(true);
  };

  const closeForm = (): void => {
    setShowForm(false);
    setEditingUser(null);
  };

  const handleSaveUser = async (payload: PortalUser): Promise<void> => {
    setSavingUser(true);
    try {
      const exists = users.some((u) => u.id === payload.id);
      const next = exists ? users.map((u) => (u.id === payload.id ? payload : u)) : [...users, payload];
      await persistUsers(next);
      setUsersError('');
      closeForm();
    } catch (err) {
      setUsersError('Failed to save user.');
    } finally {
      setSavingUser(false);
    }
  };

  const handleRemoveUser = async (id: string): Promise<void> => {
    const next = users.filter((u) => u.id !== id);
    await persistUsers(next);
  };

  const handleToggleStatus = async (id: string): Promise<void> => {
    const next = users.map((u) =>
      u.id === id ? { ...u, status: u.status === 'active' ? 'suspended' : 'active' } : u
    );
    await persistUsers(next);
  };

  const handleClearOldLogs = async (): Promise<void> => {
    if (!isSuperAdmin) return;
    const cutoff = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
    const next = logs.filter((l) => l.timestamp >= cutoff);
    setLogs(next);
    if (restSet) {
      try {
        await restSet('settings/audit_logs', next);
      } catch (err) {
        setLogsError('Failed to clear logs.');
      }
    }
  };

  const filteredLogs = useMemo<AuditLog[]>(() => {
    return logs.filter((l) => {
      if (filterUnit !== 'All Units' && l.unit !== filterUnit) return false;
      if (filterAction !== 'All' && l.action !== filterAction) return false;
      if (searchUser.trim()) {
        const q = searchUser.trim().toLowerCase();
        if (!l.userName.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [logs, filterUnit, filterAction, searchUser]);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage portal users, unit-level access, and audit activity.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={
            'px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors flex items-center gap-2 ' +
            (activeTab === 'users'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')
          }
        >
          <Users className="w-4 h-4" />
          Users &amp; Unit Access Control
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={
            'px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors flex items-center gap-2 ' +
            (activeTab === 'logs'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50')
          }
        >
          <Activity className="w-4 h-4" />
          Activity &amp; Audit Logs
        </button>
      </div>

      {activeTab === 'users' && (
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Portal Users</h2>
              <p className="text-sm text-slate-500">
                {users.length} user(s) configured.
              </p>
            </div>
            <button
              type="button"
              onClick={openAddForm}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <UserPlus className="w-4 h-4" />
              Add New User
            </button>
          </div>

          {usersError && (
            <div className="mb-3 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              <AlertCircle className="w-4 h-4" /> {usersError}
            </div>
          )}

          {showForm && (
            <UserForm
              initial={editingUser}
              saving={savingUser}
              onCancel={closeForm}
              onSave={handleSaveUser}
            />
          )}

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Name &amp; Email</th>
                  <th className="text-left px-4 py-3 font-semibold">Role</th>
                  <th className="text-left px-4 py-3 font-semibold">Assigned Units</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-right px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingUsers && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      <RefreshCw className="w-4 h-4 inline animate-spin mr-2" />
                      Loading users…
                    </td>
                  </tr>
                )}
                {!loadingUsers && users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No users yet. Click "Add New User" to get started.
                    </td>
                  </tr>
                )}
                {!loadingUsers &&
                  users.map((u) => {
                    const roleDef = ROLES.find((r) => r.key === u.role) || ROLES[3];
                    return (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{u.fullName || '—'}</div>
                          <div className="text-xs text-slate-500">{u.email || '—'}</div>
                          {u.designation && (
                            <div className="text-xs text-slate-400">{u.designation}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              'inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border ' +
                              roleDef.badgeClass
                            }
                          >
                            <Shield className="w-3 h-3" />
                            {roleDef.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {u.allUnits ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Building2 className="w-3 h-3" /> All 10 Units
                            </span>
                          ) : u.units.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {u.units.map((code) => (
                                <span
                                  key={code}
                                  className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200"
                                  title={resolveUnitName(code)}
                                >
                                  {code}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">No units</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(u.id)}
                            className={
                              'text-xs font-semibold px-2 py-1 rounded-full border ' +
                              (u.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-red-50 text-red-700 border-red-200')
                            }
                          >
                            {u.status === 'active' ? 'Active' : 'Suspended'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditForm(u)}
                              className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100"
                              title="Edit user"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveUser(u.id)}
                              className="p-1.5 rounded-md text-red-600 hover:bg-red-50"
                              title="Remove user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'logs' && (
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Audit Trail</h2>
              <p className="text-sm text-slate-500">{filteredLogs.length} record(s) shown.</p>
            </div>
            {isSuperAdmin && (
              <button
                type="button"
                onClick={handleClearOldLogs}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md border border-red-300 text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Old Logs (&gt; 90 days)
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <label className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <select
                value={filterUnit}
                onChange={(e) => setFilterUnit(e.target.value)}
                className="flex-1 bg-transparent text-sm focus:outline-none"
              >
                <option value="All Units">All Units</option>
                {UNIT_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code} — {resolveUnitName(code)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2">
              <Activity className="w-4 h-4 text-slate-500" />
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="flex-1 bg-transparent text-sm focus:outline-none"
              >
                {ACTION_TYPES.map((a) => (
                  <option key={a} value={a}>
                    {a === 'All' ? 'All Actions' : a}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2">
              <Search className="w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                placeholder="Search by user name…"
                className="flex-1 bg-transparent text-sm focus:outline-none"
              />
            </label>
          </div>

          {logsError && (
            <div className="mb-3 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              <AlertCircle className="w-4 h-4" /> {logsError}
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Timestamp</th>
                  <th className="text-left px-4 py-3 font-semibold">User</th>
                  <th className="text-left px-4 py-3 font-semibold">Unit</th>
                  <th className="text-left px-4 py-3 font-semibold">Module</th>
                  <th className="text-left px-4 py-3 font-semibold">Action</th>
                  <th className="text-left px-4 py-3 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingLogs && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      <RefreshCw className="w-4 h-4 inline animate-spin mr-2" />
                      Loading audit logs…
                    </td>
                  </tr>
                )}
                {!loadingLogs && filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No audit logs found.
                    </td>
                  </tr>
                )}
                {!loadingLogs &&
                  filteredLogs.map((l) => {
                    const roleLabel = ROLE_LABEL[l.userRole as RoleKey] || l.userRole;
                    const actionIcon =
                      l.action === 'Data Entry' ? (
                        <FileText className="w-3.5 h-3.5" />
                      ) : l.action === 'Export' ? (
                        <Download className="w-3.5 h-3.5" />
                      ) : l.action === 'Lock/Unlock' ? (
                        <Lock className="w-3.5 h-3.5" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      );
                    return (
                      <tr key={l.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {l.timestamp ? new Date(l.timestamp).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{l.userName}</div>
                          <div className="text-xs text-slate-500">{roleLabel}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{l.unit}</td>
                        <td className="px-4 py-3 text-slate-600">{l.module}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {actionIcon}
                            {l.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{l.details || '—'}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

interface UserFormProps {
  initial: PortalUser | null;
  saving: boolean;
  onCancel: () => void;
  onSave: (user: PortalUser) => void;
}

function UserForm({ initial, saving, onCancel, onSave }: UserFormProps) {
  const [draft, setDraft] = useState<PortalUser>(() => initial || emptyUser());
  const [error, setError] = useState<string>('');

  const update = <K extends keyof PortalUser>(key: K, value: PortalUser[K]): void => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const toggleUnit = (code: string): void => {
    setDraft((prev) => {
      const has = prev.units.includes(code);
      return {
        ...prev,
        units: has ? prev.units.filter((u) => u !== code) : [...prev.units, code],
      };
    });
  };

  const toggleModule = (moduleName: string): void => {
    setDraft((prev) => {
      const has = prev.modules.includes(moduleName);
      return {
        ...prev,
        modules: has ? prev.modules.filter((m) => m !== moduleName) : [...prev.modules, moduleName],
      };
    });
  };

  const handleSubmit = (): void => {
    if (!draft.fullName.trim()) {
      setError('Full name is required.');
      return;
    }
    if (!draft.email.trim()) {
      setError('Email / Login ID is required.');
      return;
    }
    if (!draft.allUnits && draft.units.length === 0) {
      setError('Select at least one unit or choose "All 10 Units".');
      return;
    }
    if (draft.modules.length === 0) {
      setError('Select at least one module for access.');
      return;
    }
    setError('');
    onSave(draft);
  };

  return (
    <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          {initial ? 'Edit User' : 'Add New User'}
        </h3>
        <button type="button" onClick={onCancel} className="p-1 rounded-md text-slate-500 hover:bg-slate-100">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <label className="block">
          <span className="text-xs font-medium text-slate-700">Full Name</span>
          <input
            type="text"
            value={draft.fullName}
            onChange={(e) => update('fullName', e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-700">Email / Login ID</span>
          <input
            type="email"
            value={draft.email}
            onChange={(e) => update('email', e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-700">Designation</span>
          <input
            type="text"
            value={draft.designation}
            onChange={(e) => update('designation', e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-700">Role</span>
          <select
            value={draft.role}
            onChange={(e) => update('role', e.target.value as RoleKey)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {ROLES.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" /> Unit-Wise Access
          </span>
          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.allUnits}
              onChange={(e) => update('allUnits', e.target.checked)}
              className="accent-emerald-600"
            />
            All 10 Units
          </label>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5">
          {UNIT_CODES.map((code) => {
            const checked = draft.units.includes(code);
            return (
              <label
                key={code}
                className={
                  'flex items-center gap-1.5 text-xs px-2 py-1 rounded border cursor-pointer ' +
                  (draft.allUnits
                    ? 'border-slate-200 bg-slate-100 text-slate-400'
                    : checked
                    ? 'border-emerald-400 bg-emerald-50 text-slate-800'
                    : 'border-slate-200 bg-white text-slate-700')
                }
                title={resolveUnitName(code)}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={draft.allUnits}
                  onChange={() => toggleUnit(code)}
                  className="accent-emerald-600"
                />
                {code}
              </label>
            );
          })}
        </div>
      </div>

      <div className="mb-3">
        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-2">
          <Shield className="w-3.5 h-3.5" /> Module-Level Access
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
          {ALL_MODULES.map((m) => {
            const checked = draft.modules.includes(m);
            return (
              <label
                key={m}
                className={
                  'flex items-center gap-1.5 text-xs px-2 py-1 rounded border cursor-pointer ' +
                  (checked
                    ? 'border-emerald-400 bg-emerald-50 text-slate-800'
                    : 'border-slate-200 bg-white text-slate-700')
                }
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleModule(m)}
                  className="accent-emerald-600"
                />
                {m}
              </label>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="mb-3 flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm font-medium rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save User'}
        </button>
      </div>
    </div>
  );
}
