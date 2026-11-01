import { PRESETS, getPreset } from "./presets";
import type { Locale } from "./site-config";
import {
  MAX_EXCLUDE,
  MAX_LENGTH,
  MIN_LENGTH,
  Settings,
  UiMode,
  advancedDefaults,
  clampLength,
  simpleDefaults,
  syncPresetId,
  valuesFromPreset,
} from "./state";

const BOOL_TRUE = new Set(["1", "true", "yes", "on"]);
const BOOL_FALSE = new Set(["0", "false", "no", "off"]);

function parseBool(raw: string | null): boolean | null {
  if (raw == null) return null;
  const v = raw.trim().toLowerCase();
  if (BOOL_TRUE.has(v)) return true;
  if (BOOL_FALSE.has(v)) return false;
  return null;
}

function parseLen(raw: string | null): number | null {
  if (raw == null || raw === "") return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return null;
  return clampLength(n, MIN_LENGTH, MAX_LENGTH);
}

function detectMode(params: URLSearchParams): UiMode {
  const mode = params.get("mode");
  if (mode === "advanced" || mode === "adv") return "advanced";
  if (mode === "simple") return "simple";
  const adv = parseBool(params.get("adv"));
  if (adv === true) return "advanced";
  if (adv === false) return "simple";
  if (
    params.has("preset") ||
    params.has("ex") ||
    params.has("sim")
  ) {
    return "advanced";
  }
  return "simple";
}

export function readSettingsFromUrl(search = window.location.search): Settings {
  const params = new URLSearchParams(search);
  const mode = detectMode(params);
  let settings: Settings =
    mode === "advanced" ? advancedDefaults() : simpleDefaults();

  const presetId = params.get("preset");
  const preset = presetId ? getPreset(presetId) : undefined;
  if (mode === "advanced" && preset) {
    settings = {
      ...valuesFromPreset(preset.values),
      mode: "advanced",
      preset: preset.id,
    };
  }

  const len = parseLen(params.get("len"));
  if (len != null) settings.length = len;

  const num = parseBool(params.get("num"));
  if (num != null) settings.sets.digits = num;
  const low = parseBool(params.get("low"));
  if (low != null) settings.sets.lower = low;
  const up = parseBool(params.get("up"));
  if (up != null) settings.sets.upper = up;
  const sym = parseBool(params.get("sym"));
  if (sym != null) settings.sets.specials = sym;

  const nodup = parseBool(params.get("nodup"));
  if (nodup != null) settings.noDup = nodup;

  if (mode === "advanced") {
    const sim = parseBool(params.get("sim"));
    if (sim != null) settings.similar = sim;

    if (params.has("ex")) {
      const raw = params.get("ex") ?? "";
      let decoded = raw;
      try {
        decoded = decodeURIComponent(raw);
      } catch {
        decoded = raw;
      }
      settings.exclude = [...decoded].slice(0, MAX_EXCLUDE).join("");
    }
  } else {
    settings.exclude = "";
    settings.similar = true;
    settings.specialsAllowlist = null;
    settings.preset = null;
  }

  if (
    !settings.sets.digits &&
    !settings.sets.lower &&
    !settings.sets.upper &&
    !settings.sets.specials
  ) {
    const d = mode === "advanced" ? advancedDefaults() : simpleDefaults();
    settings.sets = { ...d.sets };
  }

  if (mode === "advanced") {
    const hadExplicit =
      params.has("len") ||
      params.has("num") ||
      params.has("low") ||
      params.has("up") ||
      params.has("sym") ||
      params.has("nodup") ||
      params.has("ex") ||
      params.has("sim");

    if (preset && hadExplicit) {
      settings.preset = null;
      settings = syncPresetId(settings);
    } else if (preset) {
      settings.preset = preset.id;
    } else {
      settings = syncPresetId(settings);
    }
  }

  settings.mode = mode;
  return settings;
}

function isSimpleDefault(s: Settings): boolean {
  const d = simpleDefaults();
  return (
    s.mode === "simple" &&
    s.length === d.length &&
    s.sets.digits === d.sets.digits &&
    s.sets.lower === d.sets.lower &&
    s.sets.upper === d.sets.upper &&
    s.sets.specials === d.sets.specials &&
    s.noDup === d.noDup
  );
}

function isAdvancedDefault(s: Settings): boolean {
  const d = advancedDefaults();
  return (
    s.mode === "advanced" &&
    s.length === d.length &&
    s.sets.digits === d.sets.digits &&
    s.sets.lower === d.sets.lower &&
    s.sets.upper === d.sets.upper &&
    s.sets.specials === d.sets.specials &&
    s.noDup === d.noDup &&
    s.exclude === d.exclude &&
    s.similar === d.similar &&
    (s.specialsAllowlist ?? null) === (d.specialsAllowlist ?? null) &&
    (s.preset === d.preset || s.preset === "default")
  );
}

export function settingsToSearchParams(s: Settings): URLSearchParams {
  const params = new URLSearchParams();

  if (s.mode === "simple") {
    if (isSimpleDefault(s)) return params;
    params.set("len", String(s.length));
    params.set("num", s.sets.digits ? "1" : "0");
    params.set("low", s.sets.lower ? "1" : "0");
    params.set("up", s.sets.upper ? "1" : "0");
    params.set("sym", s.sets.specials ? "1" : "0");
    params.set("nodup", s.noDup ? "1" : "0");
    return params;
  }

  params.set("adv", "1");
  if (isAdvancedDefault(s)) return params;

  params.set("len", String(s.length));
  params.set("num", s.sets.digits ? "1" : "0");
  params.set("low", s.sets.lower ? "1" : "0");
  params.set("up", s.sets.upper ? "1" : "0");
  params.set("sym", s.sets.specials ? "1" : "0");
  params.set("nodup", s.noDup ? "1" : "0");

  if (s.exclude) {
    const ex = [...s.exclude].slice(0, MAX_EXCLUDE).join("");
    params.set("ex", ex);
  }
  params.set("sim", s.similar ? "1" : "0");

  let presetForUrl = s.preset;
  if (!presetForUrl && s.specialsAllowlist != null) {
    const match = PRESETS.find(
      (p) => p.values.specialsAllowlist === s.specialsAllowlist,
    );
    if (match) presetForUrl = match.id;
  }
  if (presetForUrl && PRESETS.some((p) => p.id === presetForUrl)) {
    params.set("preset", presetForUrl);
  }

  let qs = params.toString();
  if (qs.length > 1900 && params.has("ex")) {
    let ex = params.get("ex") ?? "";
    while (ex.length > 0 && qs.length > 1900) {
      ex = ex.slice(0, -1);
      params.set("ex", ex);
      qs = params.toString();
    }
    if (!ex) params.delete("ex");
  }

  return params;
}

export function buildShareUrl(s: Settings, localeLang: Locale): string {
  const url = new URL(window.location.href);
  url.pathname = `/${localeLang}/`;
  const params = settingsToSearchParams(s);
  const qs = params.toString();
  url.search = qs ? `?${qs}` : "";
  url.hash = "";
  return url.toString();
}

export function replaceUrlSettings(s: Settings, localeLang: Locale): void {
  const url = new URL(window.location.href);
  url.pathname = `/${localeLang}/`;
  const params = settingsToSearchParams(s);
  const next = `${url.pathname}${params.toString() ? `?${params}` : ""}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== current) {
    window.history.replaceState({}, "", next);
  }
}
