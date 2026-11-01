import {
  CharSets,
  PRESETS,
  PresetValues,
  defaultPreset,
} from "./presets";

export const MIN_LENGTH = 1;
export const MAX_LENGTH = 128;
export const MAX_EXCLUDE = 64;

export type UiMode = "simple" | "advanced";

export type Settings = {
  mode: UiMode;
  length: number;
  sets: CharSets;
  noDup: boolean;
  exclude: string;
  similar: boolean;
  specialsAllowlist: string | null;
  preset: string | null;
};

export function valuesFromPreset(values: PresetValues): Omit<Settings, "preset" | "mode"> {
  return {
    length: values.length,
    sets: { ...values.sets },
    noDup: values.noDup,
    exclude: values.exclude,
    similar: values.similar,
    specialsAllowlist: values.specialsAllowlist,
  };
}

/** Pre-TZ defaults: length 12, all sets, no-duplicates on, similar always on. */
export function simpleDefaults(): Settings {
  return {
    mode: "simple",
    length: 12,
    sets: { digits: true, lower: true, upper: true, specials: true },
    noDup: true,
    exclude: "",
    similar: true,
    specialsAllowlist: null,
    preset: null,
  };
}

export function defaultSettings(): Settings {
  return simpleDefaults();
}

export function advancedDefaults(): Settings {
  const p = defaultPreset();
  return { ...valuesFromPreset(p.values), mode: "advanced", preset: p.id };
}

export function cloneSettings(s: Settings): Settings {
  return {
    mode: s.mode,
    length: s.length,
    sets: { ...s.sets },
    noDup: s.noDup,
    exclude: s.exclude,
    similar: s.similar,
    specialsAllowlist: s.specialsAllowlist,
    preset: s.preset,
  };
}

/** Effective generator options: simple mode ignores exclude/allowlist and forces similar. */
export function effectiveSettings(s: Settings): Settings {
  if (s.mode !== "simple") return s;
  return {
    ...s,
    exclude: "",
    similar: true,
    specialsAllowlist: null,
    preset: null,
  };
}

function allowlistsEqual(a: string | null, b: string | null): boolean {
  return (a ?? null) === (b ?? null);
}

export function settingsMatchPreset(s: Settings, values: PresetValues): boolean {
  return (
    s.length === values.length &&
    s.sets.digits === values.sets.digits &&
    s.sets.lower === values.sets.lower &&
    s.sets.upper === values.sets.upper &&
    s.sets.specials === values.sets.specials &&
    s.noDup === values.noDup &&
    s.exclude === values.exclude &&
    s.similar === values.similar &&
    allowlistsEqual(s.specialsAllowlist, values.specialsAllowlist)
  );
}

export function resolvePresetLabel(s: Settings): string | null {
  if (s.mode === "simple") return null;
  for (const p of PRESETS) {
    if (settingsMatchPreset(s, p.values)) return p.id;
  }
  return null;
}

export function syncPresetId(s: Settings): Settings {
  if (s.mode === "simple") return { ...s, preset: null };
  const matched = resolvePresetLabel(s);
  return { ...s, preset: matched };
}

export function clampLength(n: number, min = MIN_LENGTH, max = MAX_LENGTH): number {
  if (!Number.isFinite(n)) return defaultSettings().length;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}
