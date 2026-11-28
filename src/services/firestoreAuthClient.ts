import { getApp, getApps, initializeApp, type FirebaseOptions } from '@firebase/app';
import { getAuth } from '@firebase/auth';

const PROJECT_ID = 'sustainability-portal-886cf';
const API_KEY = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined;
const firebaseConfig: FirebaseOptions = {
  apiKey: API_KEY,
  authDomain: `${PROJECT_ID}.firebaseapp.com`,
  projectId: PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = getApps().some((candidate) => candidate.name === '[DEFAULT]')
  ? getApp()
  : initializeApp(firebaseConfig);
const provisioningApp = getApps().find((candidate) => candidate.name === 'portal-user-provisioning')
  || initializeApp(firebaseConfig, 'portal-user-provisioning');

export const auth = getAuth(app);
export const provisioningAuth = getAuth(provisioningApp);

export interface FirestoreAuditContext {
  userEmail: string;
  role: string;
  unit: string;
}

export interface AuditLogRecord extends FirestoreAuditContext {
  module: string;
  action: string;
  timestamp: string;
}

let auditContext: FirestoreAuditContext | null = null;

export const setFirestoreAuditContext = (context: FirestoreAuditContext | null): void => {
  auditContext = context;
};

export const firestoreRequest = async (path: string, init: RequestInit = {}): Promise<Response> => {
  if (!API_KEY) throw new Error('Firebase API key is not configured.');

  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error('Permission denied: sign in is required to access Firestore.');

  const base = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
  const requestPath = path.startsWith(':') ? path : path.startsWith('/') ? path : `/${path}`;
  const separator = requestPath.includes('?') ? '&' : '?';
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${idToken}`);

  return fetch(`${base}${requestPath}${separator}key=${encodeURIComponent(API_KEY)}`, {
    ...init,
    headers,
  });
};

export const writeAuditLog = async (record: AuditLogRecord): Promise<void> => {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const fields = Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, { stringValue: value }]),
  );
  const response = await firestoreRequest(`audit_logs/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!response.ok) {
    throw new Error(`Audit log write failed: ${response.status} ${await response.text()}`);
  }
};

export const logFirestoreWrite = async (collectionId: string, data: Record<string, unknown>): Promise<void> => {
  const userEmail = auditContext?.userEmail || auth.currentUser?.email || '';
  if (!userEmail) return;

  const record: AuditLogRecord = {
    userEmail,
    role: auditContext?.role || 'viewer',
    unit: String(data.unit || data.factory || auditContext?.unit || 'All Units'),
    module: collectionId === 'users' ? 'user_management' : String(data.moduleId || data.module || collectionId),
    action: collectionId === 'users' ? 'Permission Change' : 'Data Save',
    timestamp: new Date().toISOString(),
  };
  await writeAuditLog(record);
};
