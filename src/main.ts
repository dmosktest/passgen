import "./style.css";
import {
  trackExcludeUsed,
  trackPresetSelected,
  trackShareLinkCopied,
} from "./analytics";
import { registerServiceWorker } from "./register-sw";
import { buildEntropyResult, estimateEntropyBits } from "./entropy";
import { generatePasswords } from "./generate";
import {
  Locale,
  MessageKey,
  detectLocale,
  t,
  tf,
} from "./i18n";
import { normalizeSettings } from "./pipeline";
import { PRESETS, getPreset } from "./presets";
import {
  buildAppJsonLd,
  buildFaqJsonLd,
  getSeoCopy,
  renderSeoHtml,
} from "./seo-content";
import {
  LOCALE_NATIVE_NAME,
  isLocale,
  isRtlLocale,
  localeFlagUrl,
  localePath,
  localeUrl,
  ogLocale as ogLocaleValue,
  type Locale as SiteLocale,
} from "./site-config";
import {
  Settings,
  UiMode,
  advancedDefaults,
  cloneSettings,
  defaultSettings,
  effectiveSettings,
  simpleDefaults,
  syncPresetId,
  valuesFromPreset,
} from "./state";
import {
  bumpGenTotal,
  formatGenTotal,
  readGenTotal,
  refreshGenTotal,
} from "./stats";
import {
  buildShareUrl,
  readSettingsFromUrl,
  replaceUrlSettings,
} from "./url-state";

const BATCH_COUNT = 20;

/** Wider cells (fewer columns) when passwords are long; count stays 20. */
function colsForLength(length: number): number {
  if (length <= 16) return 4;
  if (length <= 24) return 3;
  if (length <= 36) return 2;
  return 1;
}

function applyResultsLayout(length: number): void {
  resultsEl.dataset.cols = String(colsForLength(length));
}

const lengthInput = document.querySelector<HTMLInputElement>("#length")!;
const decBtn = document.querySelector<HTMLButtonElement>("#dec")!;
const incBtn = document.querySelector<HTMLButtonElement>("#inc")!;
const generateBtn = document.querySelector<HTMLButtonElement>("#generate")!;
const genStatsEl = document.querySelector<HTMLParagraphElement>("#gen-stats")!;
const digitsCb = document.querySelector<HTMLInputElement>("#digits")!;
const lowerCb = document.querySelector<HTMLInputElement>("#lower")!;
const upperCb = document.querySelector<HTMLInputElement>("#upper")!;
const specialsCb = document.querySelector<HTMLInputElement>("#specials")!;
const noDuplicatesCb =
  document.querySelector<HTMLInputElement>("#no-duplicates")!;
const similarCb = document.querySelector<HTMLInputElement>("#similar")!;
const excludeInput = document.querySelector<HTMLInputElement>("#exclude")!;
const presetSelect = document.querySelector<HTMLSelectElement>("#preset")!;
const presetHint = document.querySelector<HTMLParagraphElement>("#preset-hint")!;
const alphabetCounter =
  document.querySelector<HTMLParagraphElement>("#alphabet-counter")!;
const lengthNote = document.querySelector<HTMLParagraphElement>("#length-note")!;
const errorEl = document.querySelector<HTMLParagraphElement>("#error")!;
const resultsEl = document.querySelector<HTMLDivElement>("#results")!;
const headingEl = document.querySelector<HTMLHeadingElement>("#heading")!;
const leadEl = document.querySelector<HTMLParagraphElement>("#lead")!;
const seoRoot = document.querySelector<HTMLElement>("#seo-root")!;
const langRoot = document.querySelector<HTMLDetailsElement>(".lang");
const langSummary = document.querySelector<HTMLElement>(".lang-summary");
const langCurrentName =
  document.querySelector<HTMLElement>(".lang-current-name");
const langSummaryFlag =
  langSummary?.querySelector<HTMLImageElement>(".lang-flag");
const langLinks = Array.from(
  document.querySelectorAll<HTMLAnchorElement>("a.lang-option[data-locale]"),
);
const canonicalLink = document.querySelector<HTMLLinkElement>(
  'link[rel="canonical"]',
)!;
const ogUrl = document.querySelector<HTMLMetaElement>(
  'meta[property="og:url"]',
)!;
const copyLinkBtn = document.querySelector<HTMLButtonElement>("#copy-link")!;
const copyLinkStatus =
  document.querySelector<HTMLParagraphElement>("#copy-link-status")!;
const strengthEl = document.querySelector<HTMLElement>("#strength")!;
const strengthMeter = document.querySelector<HTMLElement>("#strength-meter")!;
const strengthMeta =
  document.querySelector<HTMLParagraphElement>("#strength-meta")!;
const strengthOnline =
  document.querySelector<HTMLParagraphElement>("#strength-online")!;
const strengthOffline =
  document.querySelector<HTMLParagraphElement>("#strength-offline")!;
const strengthNote =
  document.querySelector<HTMLParagraphElement>("#strength-note")!;
const strengthHintBtn =
  document.querySelector<HTMLButtonElement>("#strength-hint-btn")!;
const strengthHintEl =
  document.querySelector<HTMLParagraphElement>("#strength-hint")!;
const strengthHintWrap =
  document.querySelector<HTMLDivElement>(".hint-wrap")!;
const modeSimpleBtn = document.querySelector<HTMLButtonElement>("#mode-simple")!;
const modeAdvancedBtn =
  document.querySelector<HTMLButtonElement>("#mode-advanced")!;
const labelDigits = document.querySelector<HTMLLabelElement>("#label-digits")!;
const labelLower = document.querySelector<HTMLLabelElement>("#label-lower")!;
const labelUpper = document.querySelector<HTMLLabelElement>("#label-upper")!;
const labelSpecials =
  document.querySelector<HTMLLabelElement>("#label-specials")!;
const metaDescription = document.querySelector<HTMLMetaElement>(
  'meta[name="description"]',
)!;
const ogTitle = document.querySelector<HTMLMetaElement>(
  'meta[property="og:title"]',
)!;
const ogDescription = document.querySelector<HTMLMetaElement>(
  'meta[property="og:description"]',
)!;
const ogLocale = document.querySelector<HTMLMetaElement>(
  'meta[property="og:locale"]',
)!;
const ldApp = document.querySelector<HTMLScriptElement>("#ld-app")!;
const ldFaq = document.querySelector<HTMLScriptElement>("#ld-faq")!;

let locale: Locale = detectLocale();
let settings: Settings = defaultSettings();
let lastErrorKey: MessageKey | null = null;
let urlTimer: number | null = null;
let excludeTracked = false;
let applyingUi = false;
let presetMenuOpen = false;
let pendingManualChange = false;

function levelKey(
  level: "weak" | "fair" | "good" | "strong" | "veryStrong",
): MessageKey {
  return `level_${level}` as MessageKey;
}

function readSettingsFromUi(): Settings {
  return {
    mode: settings.mode,
    length: Number.parseInt(lengthInput.value, 10) || settings.length,
    sets: {
      digits: digitsCb.checked,
      lower: lowerCb.checked,
      upper: upperCb.checked,
      specials: specialsCb.checked,
    },
    noDup: noDuplicatesCb.checked,
    exclude: settings.mode === "advanced" ? excludeInput.value : "",
    similar: settings.mode === "advanced" ? similarCb.checked : true,
    specialsAllowlist:
      settings.mode === "advanced" ? settings.specialsAllowlist : null,
    preset: settings.mode === "advanced" ? null : null,
  };
}

function fillPresetSelect(): void {
  presetSelect.replaceChildren();
  const custom = document.createElement("option");
  custom.value = "custom";
  custom.textContent = t(locale, "presetCustom");
  presetSelect.append(custom);
  for (const p of PRESETS) {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name[locale];
    presetSelect.append(opt);
  }
}

function applyModeUi(mode: UiMode): void {
  document.querySelectorAll<HTMLElement>(".advanced-only").forEach((el) => {
    el.hidden = mode !== "advanced";
  });
  modeSimpleBtn.classList.toggle("active", mode === "simple");
  modeAdvancedBtn.classList.toggle("active", mode === "advanced");
  modeSimpleBtn.setAttribute("aria-pressed", String(mode === "simple"));
  modeAdvancedBtn.setAttribute("aria-pressed", String(mode === "advanced"));
}

function applySettingsToUi(s: Settings): void {
  applyingUi = true;
  applyModeUi(s.mode);
  const lengthStr = String(s.length);
  if (lengthInput.value !== lengthStr) lengthInput.value = lengthStr;
  digitsCb.checked = s.sets.digits;
  lowerCb.checked = s.sets.lower;
  upperCb.checked = s.sets.upper;
  specialsCb.checked = s.sets.specials;
  noDuplicatesCb.checked = s.noDup;
  similarCb.checked = s.similar;
  if (excludeInput.value !== s.exclude) excludeInput.value = s.exclude;
  const matched = s.preset;
  const presetValue = matched ?? "custom";
  // Writing .value while the list is open closes it in some browsers.
  if (!presetMenuOpen && presetSelect.value !== presetValue) {
    presetSelect.value = presetValue;
  }
  const preset = matched ? getPreset(matched) : undefined;
  const hint = preset ? preset.hint[locale] : t(locale, "presetCustomHint");
  if (presetHint.textContent !== hint) presetHint.textContent = hint;
  applyingUi = false;
}

function scheduleUrlWrite(s: Settings): void {
  if (urlTimer != null) window.clearTimeout(urlTimer);
  urlTimer = window.setTimeout(() => {
    replaceUrlSettings(s, locale);
    updateLangSwitcher();
    urlTimer = null;
  }, 300);
}

function showError(key: MessageKey): void {
  lastErrorKey = key;
  errorEl.textContent = t(locale, key);
}

function clearError(): void {
  lastErrorKey = null;
  errorEl.textContent = "";
}

function markEmptySets(empty: {
  digits: boolean;
  lower: boolean;
  upper: boolean;
  specials: boolean;
}): void {
  if (settings.mode !== "advanced") {
    labelDigits.classList.remove("set-empty");
    labelLower.classList.remove("set-empty");
    labelUpper.classList.remove("set-empty");
    labelSpecials.classList.remove("set-empty");
    labelDigits.title = "";
    labelLower.title = "";
    labelUpper.title = "";
    labelSpecials.title = "";
    return;
  }
  labelDigits.classList.toggle("set-empty", empty.digits);
  labelLower.classList.toggle("set-empty", empty.lower);
  labelUpper.classList.toggle("set-empty", empty.upper);
  labelSpecials.classList.toggle("set-empty", empty.specials);
  labelDigits.title = empty.digits ? t(locale, "setEmpty") : "";
  labelLower.title = empty.lower ? t(locale, "setEmpty") : "";
  labelUpper.title = empty.upper ? t(locale, "setEmpty") : "";
  labelSpecials.title = empty.specials ? t(locale, "setEmpty") : "";
}

function updateStrength(
  s: Settings,
  stats: ReturnType<typeof normalizeSettings>["stats"],
): void {
  const anySet =
    s.sets.digits || s.sets.lower || s.sets.upper || s.sets.specials;
  if (!anySet || stats.alphabetSize === 0) {
    strengthEl.hidden = true;
    return;
  }
  strengthEl.hidden = false;
  const bits =
    stats.alphabetSize <= 1
      ? 0
      : estimateEntropyBits(s.length, stats.alphabets, s.noDup);
  const pinLike =
    s.preset === "pin" ||
    (s.sets.digits && !s.sets.lower && !s.sets.upper && !s.sets.specials);
  const result = buildEntropyResult(bits, locale, { pinLike });
  const levelText = t(locale, levelKey(result.level));

  strengthMeter.querySelectorAll<HTMLElement>(".meter-seg").forEach((seg) => {
    const n = Number(seg.dataset.seg);
    seg.classList.toggle("on", n <= result.segments);
    seg.dataset.level = result.level;
  });
  strengthMeter.setAttribute("aria-valuenow", String(result.segments));
  strengthMeter.setAttribute(
    "aria-valuetext",
    `${levelText}, ${tf(locale, "bits", { n: result.bits })}`,
  );
  strengthMeta.textContent = `${levelText} · ${tf(locale, "bits", { n: result.bits })}`;
  strengthOnline.textContent = tf(locale, "crackOnline", {
    t: result.onlineLabel,
  });
  strengthOffline.textContent = tf(locale, "crackOffline", {
    t: result.offlineLabel,
  });
  strengthNote.hidden = !result.showRateLimitNote;
  strengthNote.textContent = result.showRateLimitNote
    ? t(locale, "rateLimitNote")
    : "";
}

function blockReasonToKey(
  reason: ReturnType<typeof normalizeSettings>["blockReason"],
): MessageKey | null {
  switch (reason) {
    case "empty_sets":
      return "err_empty_sets";
    case "empty_alphabet":
      return "err_empty_alphabet";
    case "too_small":
      return "err_alphabet_too_small";
    case "specials_min":
      return "err_specials_min_length";
    case "specials_need_safe":
      return "err_specials_need_safe";
    case "min_sets":
      return "err_min_sets";
    default:
      return null;
  }
}

function applyPipeline(next: Settings, opts: { generate: boolean }): void {
  const forNorm = effectiveSettings(next);
  const normalized = normalizeSettings(forNorm);
  settings = { ...normalized.settings, mode: next.mode };
  if (next.mode === "simple") {
    settings.exclude = "";
    settings.similar = true;
    settings.specialsAllowlist = null;
    settings.preset = null;
  } else {
    settings.exclude = next.exclude;
    settings.similar = next.similar;
    settings.specialsAllowlist = next.specialsAllowlist;
    settings = syncPresetId(settings);
  }
  applySettingsToUi(settings);

  if (settings.mode === "advanced") {
    alphabetCounter.textContent = tf(locale, "alphabetCounter", {
      n: normalized.stats.alphabetSize,
      k: normalized.stats.excludedCount,
    });
  }
  markEmptySets(normalized.stats.emptySets);

  if (normalized.lengthNote != null) {
    lengthNote.hidden = false;
    lengthNote.textContent = tf(locale, "lengthClamped", {
      n: normalized.lengthNote,
    });
  } else {
    lengthNote.hidden = true;
    lengthNote.textContent = "";
  }

  generateBtn.disabled = !normalized.canGenerate;
  updateStrength(settings, normalized.stats);
  scheduleUrlWrite(settings);

  if (!normalized.canGenerate) {
    const key = blockReasonToKey(normalized.blockReason);
    if (normalized.stats.alphabetSize === 1) showError("warn_single_char");
    else if (key) showError(key);
    else clearError();
    resultsEl.replaceChildren();
    return;
  }

  if (opts.generate) {
    runGenerate();
  } else if (lastErrorKey) {
    clearError();
  }
}

function renderGenStats(total = readGenTotal()): void {
  genStatsEl.textContent = tf(locale, "genStats", {
    n: formatGenTotal(total, locale),
  });
}

function runGenerate(): void {
  clearError();
  const eff = effectiveSettings(settings);
  applyResultsLayout(eff.length);
  const result = generatePasswords({
    length: eff.length,
    count: BATCH_COUNT,
    digits: eff.sets.digits,
    lower: eff.sets.lower,
    upper: eff.sets.upper,
    specials: eff.sets.specials,
    noDuplicates: eff.noDup,
    similar: eff.similar,
    exclude: eff.exclude,
    specialsAllowlist: eff.specialsAllowlist,
  });

  if (!result.ok) {
    showError(result.error);
    resultsEl.replaceChildren();
    return;
  }

  renderPasswords(result.passwords);
  const normalized = normalizeSettings(eff);
  updateStrength(settings, normalized.stats);
  void bumpGenTotal(1).then((total) => renderGenStats(total));
}

async function copyPassword(el: HTMLButtonElement, value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    const status = el.querySelector<HTMLElement>(".password-status");
    if (status) status.textContent = t(locale, "copied");
    el.classList.add("copied");
    window.setTimeout(() => {
      el.classList.remove("copied");
    }, 900);
  } catch {
    showError("err_clipboard");
  }
}

function renderPasswords(passwords: string[]): void {
  const fragment = document.createDocumentFragment();

  for (const password of passwords) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "password";
    btn.title = t(locale, "copyTitle");

    const valueEl = document.createElement("span");
    valueEl.className = "password-value";
    valueEl.textContent = password;

    const statusEl = document.createElement("span");
    statusEl.className = "password-status";
    statusEl.setAttribute("aria-hidden", "true");

    btn.append(valueEl, statusEl);
    btn.addEventListener("click", () => {
      void copyPassword(btn, password);
    });
    fragment.append(btn);
  }

  resultsEl.replaceChildren(fragment);
}

function fallbackCopyText(text: string): boolean {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.append(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}

async function copyShareLink(): Promise<void> {
  const url = buildShareUrl(settings, locale);
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    } else if (!fallbackCopyText(url)) {
      throw new Error("copy failed");
    }
    copyLinkStatus.textContent = t(locale, "copyLinkDone");
    trackShareLinkCopied();
    window.setTimeout(() => {
      copyLinkStatus.textContent = "";
    }, 2000);
  } catch {
    showError("err_clipboard");
  }
}

function langHref(target: SiteLocale): string {
  const params = window.location.search;
  return `${localePath(target)}${params}`;
}

function updateLangSwitcher(): void {
  const label = t(locale, "langSwitch");
  if (langSummary) langSummary.setAttribute("aria-label", label);
  if (langCurrentName) langCurrentName.textContent = LOCALE_NATIVE_NAME[locale];
  if (langSummaryFlag) langSummaryFlag.src = localeFlagUrl(locale);
  for (const link of langLinks) {
    const code = link.dataset.locale ?? "";
    if (!isLocale(code)) continue;
    link.href = langHref(code);
    link.classList.toggle("active", locale === code);
    link.setAttribute("aria-current", locale === code ? "page" : "false");
    const name = link.querySelector(".lang-name");
    const flag = link.querySelector<HTMLImageElement>(".lang-flag");
    if (name) name.textContent = LOCALE_NATIVE_NAME[code];
    if (flag) flag.src = localeFlagUrl(code);
  }
  if (langRoot?.open) langRoot.open = false;
}

function applySeo(): void {
  const copy = getSeoCopy(locale);
  const pageUrl = localeUrl(locale);
  document.title = copy.title;
  metaDescription.content = copy.description;
  ogTitle.content = copy.title;
  ogDescription.content = copy.description;
  ogLocale.content = ogLocaleValue(locale);
  ogUrl.content = pageUrl;
  canonicalLink.href = pageUrl;
  headingEl.textContent = copy.heading;
  leadEl.innerHTML = copy.leadHtml;
  seoRoot.innerHTML = renderSeoHtml(locale);
  ldApp.textContent = JSON.stringify(buildAppJsonLd(locale));
  ldFaq.textContent = JSON.stringify(buildFaqJsonLd(locale));
}

function applyLocale(): void {
  document.documentElement.lang = locale;
  document.documentElement.dir = isRtlLocale(locale) ? "rtl" : "ltr";
  applySeo();
  fillPresetSelect();
  updateLangSwitcher();

  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n as MessageKey | undefined;
    if (key) el.textContent = t(locale, key);
  });

  document.querySelectorAll<HTMLElement>("[data-i18n-aria]").forEach((el) => {
    const key = el.dataset.i18nAria as MessageKey | undefined;
    if (key) el.setAttribute("aria-label", t(locale, key));
  });

  document
    .querySelectorAll<HTMLInputElement>("[data-i18n-placeholder]")
    .forEach((el) => {
      const key = el.dataset.i18nPlaceholder as MessageKey | undefined;
      if (key) el.placeholder = t(locale, key);
    });

  strengthHintBtn.removeAttribute("title");
  strengthHintBtn.setAttribute("aria-label", t(locale, "strengthHint"));
  setStrengthHintOpen(false);

  if (lastErrorKey) errorEl.textContent = t(locale, lastErrorKey);

  resultsEl.querySelectorAll<HTMLButtonElement>(".password").forEach((btn) => {
    btn.title = t(locale, "copyTitle");
  });

  applySettingsToUi(settings);
  renderGenStats();
  applyPipeline(settings, { generate: false });
}

function setStrengthHintOpen(open: boolean): void {
  strengthHintEl.hidden = !open;
  strengthHintBtn.setAttribute("aria-expanded", open ? "true" : "false");
}

function setMode(mode: UiMode): void {
  if (mode === settings.mode) return;
  const next = mode === "simple" ? simpleDefaults() : advancedDefaults();
  applyPipeline(next, { generate: true });
}

function onManualChange(): void {
  if (applyingUi) return;
  if (presetMenuOpen || document.activeElement === presetSelect) {
    pendingManualChange = true;
    return;
  }
  let next: Settings = {
    ...readSettingsFromUi(),
    specialsAllowlist: settings.specialsAllowlist,
    mode: settings.mode,
  };
  if (settings.mode === "advanced") {
    next = syncPresetId(next);
    if (
      settings.specialsAllowlist &&
      next.preset &&
      getPreset(next.preset)?.values.specialsAllowlist !==
        settings.specialsAllowlist
    ) {
      next.specialsAllowlist = getPreset(next.preset)!.values.specialsAllowlist;
    }
    if (!next.preset) {
      const prevPreset = settings.preset ? getPreset(settings.preset) : undefined;
      if (
        prevPreset?.values.specialsAllowlist &&
        settings.specialsAllowlist === prevPreset.values.specialsAllowlist
      ) {
        next.specialsAllowlist = settings.specialsAllowlist;
      }
    }
  } else {
    next.exclude = "";
    next.similar = true;
    next.specialsAllowlist = null;
    next.preset = null;
  }
  applyPipeline(next, { generate: true });
}

function onPresetChange(): void {
  if (applyingUi || settings.mode !== "advanced") return;
  const id = presetSelect.value;
  if (id === "custom") return;
  const preset = getPreset(id);
  if (!preset) return;
  trackPresetSelected(preset.id);
  // Apply after the native list finishes closing.
  window.requestAnimationFrame(() => {
    applyPipeline(
      {
        ...valuesFromPreset(preset.values),
        mode: "advanced",
        preset: preset.id,
      },
      { generate: true },
    );
  });
}

decBtn.addEventListener("click", () => {
  const next = cloneSettings(settings);
  next.length -= 1;
  if (next.mode === "advanced") next.preset = null;
  applyPipeline(syncPresetId(next), { generate: true });
});
incBtn.addEventListener("click", () => {
  const next = cloneSettings(settings);
  next.length += 1;
  if (next.mode === "advanced") next.preset = null;
  applyPipeline(syncPresetId(next), { generate: true });
});
lengthInput.addEventListener("change", onManualChange);
lengthInput.addEventListener("focus", () => lengthInput.select());
lengthInput.addEventListener("click", () => lengthInput.select());

for (const cb of [
  digitsCb,
  lowerCb,
  upperCb,
  specialsCb,
  noDuplicatesCb,
  similarCb,
]) {
  cb.addEventListener("change", onManualChange);
}

excludeInput.addEventListener("input", () => {
  if (!excludeTracked && excludeInput.value.length > 0) {
    excludeTracked = true;
    trackExcludeUsed();
  }
  onManualChange();
});

presetSelect.addEventListener("pointerdown", () => {
  presetMenuOpen = true;
});
presetSelect.addEventListener("focus", () => {
  presetMenuOpen = true;
});
presetSelect.addEventListener("blur", () => {
  window.setTimeout(() => {
    presetMenuOpen = false;
    if (pendingManualChange) {
      pendingManualChange = false;
      onManualChange();
    }
  }, 0);
});
presetSelect.addEventListener("change", onPresetChange);
modeSimpleBtn.addEventListener("click", () => setMode("simple"));
modeAdvancedBtn.addEventListener("click", () => setMode("advanced"));
strengthHintBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  setStrengthHintOpen(strengthHintEl.hidden);
});
document.addEventListener("click", (event) => {
  if (strengthHintEl.hidden) return;
  const target = event.target;
  if (target instanceof Node && !strengthHintWrap.contains(target)) {
    setStrengthHintOpen(false);
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !strengthHintEl.hidden) {
    setStrengthHintOpen(false);
    strengthHintBtn.focus();
  }
});
generateBtn.addEventListener("click", () => runGenerate());
copyLinkBtn.addEventListener("click", () => {
  void copyShareLink();
});

fillPresetSelect();
settings = readSettingsFromUrl();
{
  const params = new URLSearchParams(window.location.search);
  if (params.has("lang")) {
    params.delete("lang");
    const qs = params.toString();
    const next = `${localePath(locale)}${qs ? `?${qs}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", next);
  }
}
if (langRoot) {
  document.addEventListener("click", (event) => {
    if (!langRoot.open) return;
    const target = event.target;
    if (target instanceof Node && !langRoot.contains(target)) {
      langRoot.open = false;
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && langRoot.open) langRoot.open = false;
  });
}
applyLocale();
void (async () => {
  renderGenStats(await refreshGenTotal());
  applyPipeline(settings, { generate: true });
})();
registerServiceWorker();
