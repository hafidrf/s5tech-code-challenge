/**
 * Persistence for completed swaps.
 *
 * Primary store: the Problem 5 CRUD server (POST/GET /api/swaps), reached
 * through the Vite dev proxy. When the server is not running the UI falls
 * back to localStorage so the form stays fully usable standalone
 * (the brief explicitly allows mocked backend interactions).
 */

export interface SwapHistoryEntry {
  id: number | string;
  from_token: string;
  to_token: string;
  amount_from: number;
  amount_to: number | null;
  rate: number | null;
  created_at: string;
  source: 'server' | 'local';
}

export interface NewSwap {
  from_token: string;
  to_token: string;
  amount_from: number;
  amount_to: number | null;
  rate: number | null;
}

const LOCAL_KEY = 'fancy-form:swaps';

function readLocal(): SwapHistoryEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SwapHistoryEntry[];
  } catch {
    return [];
  }
}

function writeLocal(entries: SwapHistoryEntry[]): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(entries.slice(0, 50)));
  } catch {
    /* storage full/blocked — history is best-effort */
  }
}

export async function saveSwap(entry: NewSwap): Promise<SwapHistoryEntry> {
  const payload = { ...entry };
  try {
    const res = await fetch('/api/swaps', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return { ...(await res.json()), source: 'server' } as SwapHistoryEntry;
    }
    // Server answered but rejected the payload — fall through to local save
    // rather than losing the user's swap.
  } catch {
    /* server unreachable */
  }
  const local: SwapHistoryEntry = {
    ...payload,
    id: `local-${Date.now()}`,
    created_at: new Date().toISOString(),
    source: 'local',
  };
  writeLocal([local, ...readLocal()]);
  return local;
}

export async function fetchHistory(limit = 8): Promise<SwapHistoryEntry[]> {
  try {
    const res = await fetch(`/api/swaps?limit=${limit}`);
    if (res.ok) {
      const body = (await res.json()) as { data: SwapHistoryEntry[] };
      const serverEntries = body.data.map((e) => ({ ...e, source: 'server' as const }));
      // Merge: local-only entries (saved while the server was down) last.
      return [...serverEntries, ...readLocal()].slice(0, limit);
    }
  } catch {
    /* server unreachable */
  }
  return readLocal().slice(0, limit);
}
