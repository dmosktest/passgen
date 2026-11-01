declare global {
  interface Window {
    ym?: (id: number, method: string, ...args: unknown[]) => void;
  }
}

const METRIKA_ID: number | null = null;

function reachGoal(name: string, params?: Record<string, string>): void {
  if (METRIKA_ID == null || typeof window.ym !== "function") return;
  if (params) window.ym(METRIKA_ID, "reachGoal", name, params);
  else window.ym(METRIKA_ID, "reachGoal", name);
}

export function trackPresetSelected(id: string): void {
  reachGoal("preset_selected", { preset: id });
}

export function trackShareLinkCopied(): void {
  reachGoal("share_link_copied");
}

export function trackExcludeUsed(): void {
  reachGoal("exclude_used");
}
