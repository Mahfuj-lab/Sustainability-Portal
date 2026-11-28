import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type InventoryRestSet = (collectionId: string, documentId: string, data: any) => Promise<any>;
export type InventoryRestGet = (path: string) => Promise<any>;

const isNumericInput = (input: HTMLInputElement): boolean =>
  input.type === 'number' || input.inputMode === 'decimal' || input.dataset.numeric === 'true';

export const normalizeNumericInput = (raw: string, precision = 2): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const compact = trimmed.replace(/,/g, '').replace(/\s/g, '');
  const match = compact.match(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);
  if (!match) return null;
  const numberIndex = match.index ?? 0;
  const prefix = compact.slice(0, numberIndex);
  const suffix = compact.slice(numberIndex + match[0].length);
  const unitOrCurrency = /^[a-z$€£¥₹৳%/²³·]*$/i;
  if (!unitOrCurrency.test(prefix) || !unitOrCurrency.test(suffix)) return null;
  const cleaned = match[0];

  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  if (value < 0) return null;

  const fraction = cleaned.split('.')[1];
  if (fraction && fraction.length > precision) return value.toFixed(precision);
  return cleaned.startsWith('.') ? `0${cleaned}` : cleaned;
};

const setNativeInputValue = (input: HTMLInputElement, value: string): void => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

export function useInventoryGrid() {
  const [error, setError] = useState('');
  const errorTimer = useRef<number | undefined>(undefined);

  const reportError = useCallback((message: string) => {
    setError(message);
    if (errorTimer.current !== undefined) window.clearTimeout(errorTimer.current);
    errorTimer.current = window.setTimeout(() => setError(''), 5000);
  }, []);

  useEffect(() => () => {
    if (errorTimer.current !== undefined) window.clearTimeout(errorTimer.current);
  }, []);

  const onPaste = useCallback((event: React.ClipboardEvent<HTMLElement>) => {
    const text = event.clipboardData.getData('text/plain');
    if (!/[\t\r\n]/.test(text)) return;

    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const table = target.closest('table');
    const cell = target.closest('td, th');
    if (!table || !cell) return;

    event.preventDefault();
    const matrix = text.replace(/\r/g, '').split('\n');
    if (matrix[matrix.length - 1] === '') matrix.pop();
    const startRow = (cell.parentElement as HTMLTableRowElement).rowIndex;
    const startColumn = (cell as HTMLTableCellElement).cellIndex;
    const pastedInputs: HTMLInputElement[] = [];

    matrix.forEach((rowText, rowOffset) => {
      const row = table.rows[startRow + rowOffset];
      if (!row) return;
      rowText.split('\t').forEach((value, columnOffset) => {
        const destination = row.cells[startColumn + columnOffset]?.querySelector('input');
        if (!destination || destination.disabled || destination.readOnly) return;

        let nextValue = value;
        if (isNumericInput(destination)) {
          const precision = Number(destination.dataset.decimals || 2);
          const normalized = normalizeNumericInput(value, precision);
          if (normalized === null) {
            reportError(value.trim().startsWith('-') ? 'Negative value not allowed' : 'Invalid text pasted in numeric cell');
            return;
          }
          nextValue = normalized;
        }

        setNativeInputValue(destination, nextValue);
        pastedInputs.push(destination);
      });
    });
    pastedInputs[pastedInputs.length - 1]?.focus();
  }, [reportError]);

  const onKeyDown = useCallback((event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter' && event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const table = target.closest('table');
    const cell = target.closest('td, th');
    if (!table || !cell) return;

    event.preventDefault();
    const direction = event.key === 'ArrowUp' ? -1 : 1;
    const rowIndex = (cell.parentElement as HTMLTableRowElement).rowIndex;
    const columnIndex = (cell as HTMLTableCellElement).cellIndex;
    for (let nextRow = rowIndex + direction; nextRow >= 0 && nextRow < table.rows.length; nextRow += direction) {
      const next = table.rows[nextRow].cells[columnIndex]?.querySelector<HTMLInputElement>('input:not([disabled]):not([readonly])');
      if (next) {
        next.focus();
        next.scrollIntoView({ block: 'nearest' });
        return;
      }
    }
  }, []);

  return { gridHandlers: { onPaste, onKeyDown }, gridError: error, reportGridError: reportError };
}

interface HybridAutoSaveOptions {
  unit: string;
  year: string | number;
  moduleId: string;
  storageKey: string;
  payload: any;
  restGet?: InventoryRestGet;
  restSet?: InventoryRestSet;
  enabled?: boolean;
  ready?: boolean;
}

export function useHybridAutoSave({
  unit,
  year,
  moduleId,
  storageKey,
  payload,
  restGet,
  restSet,
  enabled = true,
  ready = true,
}: HybridAutoSaveOptions) {
  const [status, setStatus] = useState('All changes auto-saved');
  const [error, setError] = useState('');
  const serializedPayload = useMemo(() => JSON.stringify(payload), [payload]);
  const latest = useRef({ payload, serializedPayload, storageKey, unit, year, moduleId });
  const lastSignature = useRef({ storageKey: '', signature: '' });
  const confirmedOverwrite = useRef(new Set<string>());
  const cancelledOverwrite = useRef(new Set<string>());
  const localDraftAvailable = useRef(true);
  latest.current = { payload, serializedPayload, storageKey, unit, year, moduleId };

  const persistLocal = useCallback((snapshot: typeof latest.current, notify = false) => {
    try {
      localStorage.setItem(snapshot.storageKey, snapshot.serializedPayload);
      localDraftAvailable.current = true;
      setError((current) => current.startsWith('Local draft save failed:') ? '' : current);
      if (notify) {
        window.dispatchEvent(new CustomEvent('inventory-data-changed', {
          detail: { unit: snapshot.unit, year: snapshot.year, moduleId: snapshot.moduleId },
        }));
      }
      return true;
    } catch (e) {
      localDraftAvailable.current = false;
      setStatus('Local draft save failed');
      setError(e instanceof Error ? `Local draft save failed: ${e.message}` : 'Local draft save failed.');
      return false;
    }
  }, []);

  const syncToFirestore = useCallback(async (snapshot: typeof latest.current, manual = false): Promise<boolean> => {
    if (!restSet) {
      setStatus('Save failed');
      setError('Firestore sync is not configured for this module.');
      return false;
    }
    setStatus('Saving...');
    try {
      const documentId = `${snapshot.unit}_${snapshot.year}_${snapshot.moduleId}`;
      if (cancelledOverwrite.current.has(documentId)) {
        if (!manual) {
          setStatus('Overwrite cancelled - draft saved locally');
          return false;
        }
        cancelledOverwrite.current.delete(documentId);
      }
      if (restGet && !confirmedOverwrite.current.has(documentId)) {
        const existing = await restGet(`inventory_data/${documentId}`);
        if (existing && !window.confirm(
          `Saved inventory data already exists for ${snapshot.unit}, ${snapshot.year} (${snapshot.moduleId}). Overwrite it with these changes?`
        )) {
          cancelledOverwrite.current.add(documentId);
          setStatus('Overwrite cancelled - draft saved locally');
          setError('');
          return false;
        }
        confirmedOverwrite.current.add(documentId);
      }
      await restSet('inventory_data', documentId, {
        unit: snapshot.unit,
        year: String(snapshot.year),
        moduleId: snapshot.moduleId,
        data: snapshot.payload,
        updatedAt: new Date().toISOString(),
      });
      setStatus('All changes auto-saved');
      setError((current) => current.startsWith('Local draft save failed:') ? current : '');
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (/403|permission.?denied|unauthori[sz]ed/i.test(message)) {
        setStatus('Permission denied by Admin');
        setError(message);
      } else if (!navigator.onLine || /network|fetch failed|load failed/i.test(message)) {
        if (!localDraftAvailable.current) {
          setStatus('Save failed');
          setError('Network offline and the local draft could not be saved.');
          return false;
        }
        setStatus('Offline draft saved - will sync when online');
        setError('');
      } else {
        setStatus('Save failed');
        setError(`Could not sync data: ${message}`);
      }
      return false;
    }
  }, [restGet, restSet]);

  useEffect(() => {
    if (!enabled || !ready) return;
    const snapshot = latest.current;
    if (lastSignature.current.storageKey !== storageKey) {
      lastSignature.current = { storageKey, signature: serializedPayload };
      return;
    }
    if (lastSignature.current.signature === serializedPayload) return;

    lastSignature.current.signature = serializedPayload;
    persistLocal(snapshot, true);
    setStatus('Saving...');
    const timer = window.setTimeout(() => { void syncToFirestore(snapshot); }, 2000);
    return () => window.clearTimeout(timer);
  }, [enabled, ready, storageKey, serializedPayload, persistLocal, syncToFirestore]);

  useEffect(() => {
    if (!enabled || !ready) return;
    const timer = window.setInterval(() => { persistLocal(latest.current); }, 3000);
    return () => window.clearInterval(timer);
  }, [enabled, ready, persistLocal]);

  useEffect(() => {
    const retry = () => {
      if (enabled && ready && status.startsWith('Offline')) void syncToFirestore(latest.current);
    };
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [enabled, ready, status, syncToFirestore]);

  const saveNow = useCallback(async () => {
    const snapshot = latest.current;
    const savedLocally = persistLocal(snapshot, true);
    const synced = await syncToFirestore(snapshot, true);
    return savedLocally && synced;
  }, [persistLocal, syncToFirestore]);

  return { status: enabled ? status : 'Read-only', error, saveNow };
}

export const InventorySaveStatus: React.FC<{ status: string; error?: string; gridError?: string }> = ({
  status,
  error,
  gridError,
}) => (
  <div className="flex flex-col gap-1 text-[11px]" role="status" aria-live="polite">
    <span className={
      status.includes('Permission') || status === 'Save failed' || status === 'Local draft save failed'
        ? 'text-red-700'
        : status.startsWith('Offline') || status.startsWith('Overwrite cancelled')
          ? 'text-amber-700'
          : 'text-emerald-700'
    }>
      {status}
    </span>
    {(error || gridError) && <span className="text-red-700">{gridError || error}</span>}
  </div>
);
