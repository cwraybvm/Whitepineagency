export type SandboxHistoryItem<T> = {
  id: string;
  createdAt: string; // ISO timestamp
  summary: string;
  state: T;
};

const MAX_ITEMS = 10;

function storageKey(panelKey: string, scopeId: string): string {
  return `sandbox-history:${panelKey}:${scopeId}`;
}

export function loadHistory<T>(panelKey: string, scopeId: string): SandboxHistoryItem<T>[] {
  try {
    const raw = localStorage.getItem(storageKey(panelKey, scopeId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addHistoryItem<T>(panelKey: string, scopeId: string, summary: string, state: T): SandboxHistoryItem<T>[] {
  const existing = loadHistory<T>(panelKey, scopeId);
  const next = [{ id: crypto.randomUUID(), createdAt: new Date().toISOString(), summary, state }, ...existing].slice(0, MAX_ITEMS);
  try {
    localStorage.setItem(storageKey(panelKey, scopeId), JSON.stringify(next));
  } catch {
    // Quota exceeded or storage unavailable — history is best-effort, drop silently.
  }
  return next;
}

export function clearHistory(panelKey: string, scopeId: string): void {
  try {
    localStorage.removeItem(storageKey(panelKey, scopeId));
  } catch {
    // ignore
  }
}
