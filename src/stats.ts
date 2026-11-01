export const GEN_STATS_START = 33_000;

const API_PATH = "/api/gen-count";

let cachedTotal = GEN_STATS_START;
let syncing: Promise<void> | null = null;

function parseTotal(data: unknown): number | null {
  if (!data || typeof data !== "object") return null;
  const total = (data as { total?: unknown }).total;
  const n = typeof total === "number" ? total : Number.parseInt(String(total), 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

async function requestTotal(method: "GET" | "POST"): Promise<number | null> {
  try {
    const res = await fetch(API_PATH, {
      method,
      headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
      cache: "no-store",
    });
    if (!res.ok) return null;
    return parseTotal(await res.json());
  } catch {
    return null;
  }
}

export function readGenTotal(): number {
  return cachedTotal;
}

export async function refreshGenTotal(): Promise<number> {
  if (!syncing) {
    syncing = (async () => {
      const total = await requestTotal("GET");
      if (total != null) cachedTotal = total;
    })().finally(() => {
      syncing = null;
    });
  }
  await syncing;
  return cachedTotal;
}

export async function bumpGenTotal(by = 1): Promise<number> {
  const steps = Math.max(0, Math.floor(by));
  for (let i = 0; i < steps; i += 1) {
    const total = await requestTotal("POST");
    if (total == null) return cachedTotal;
    cachedTotal = total;
  }
  return cachedTotal;
}

export function formatGenTotal(n: number, locale: string): string {
  try {
    if (locale === "tlh") return n.toLocaleString("en-US");
    return n.toLocaleString(locale);
  } catch {
    return n.toLocaleString("en-US");
  }
}
