import type { Alphabets } from "./alphabet";
import { NO_DUP_STRICT_MAX_LEN } from "./generate";
import type { Locale } from "./i18n";

export type StrengthLevel =
  | "weak"
  | "fair"
  | "good"
  | "strong"
  | "veryStrong";

export type EntropyResult = {
  bits: number;
  level: StrengthLevel;
  segments: number;
  onlineLabel: string;
  offlineLabel: string;
  showRateLimitNote: boolean;
};

const ONLINE_PER_SEC = 1e3;
const OFFLINE_PER_SEC = 1e11;
const HUGE_YEARS = 1e12;

/**
 * Conservative entropy for the current generator:
 * per-position alphabet size with edge ban on specials and
 * no-duplicates reducing pool by i-1. Set quotas / max-2 specials
 * are not modelled exactly — this underestimates vs a full count.
 */
export function estimateEntropyBits(
  length: number,
  sets: Alphabets,
  noDuplicates: boolean,
): number {
  const N = sets.full.length;
  const S = sets.specials.length;
  const hasSpecials = S > 0;
  if (N <= 0 || length <= 0) return 0;
  if (N === 1) return 0;

  let sum = 0;
  for (let i = 0; i < length; i++) {
    const edge = hasSpecials && (i < 2 || i >= length - 2);
    let n = edge ? N - S : N;
    if (noDuplicates) {
      n -= length > NO_DUP_STRICT_MAX_LEN ? Math.floor(i / 2) : i;
    }
    if (n < 1) n = 1;
    sum += Math.log2(n);
  }
  return Math.floor(sum);
}

export function levelFromBits(bits: number): {
  level: StrengthLevel;
  segments: number;
} {
  if (bits < 40) return { level: "weak", segments: 1 };
  if (bits < 60) return { level: "fair", segments: 2 };
  if (bits < 80) return { level: "good", segments: 3 };
  if (bits < 100) return { level: "strong", segments: 4 };
  return { level: "veryStrong", segments: 5 };
}

function pluralRu(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

function formatDuration(seconds: number, locale: Locale): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;

  const yearSec = 365.25 * 24 * 3600;
  const years = seconds / yearSec;
  if (years >= HUGE_YEARS) {
    return locale === "ru" ? "более 1 трлн лет" : "more than 1 trillion years";
  }

  const units: { sec: number; ru: [string, string, string]; en: [string, string] }[] =
    [
      { sec: yearSec * 1e9, ru: ["миллиард лет", "миллиарда лет", "миллиардов лет"], en: ["billion years", "billion years"] },
      { sec: yearSec * 1e6, ru: ["миллион лет", "миллиона лет", "миллионов лет"], en: ["million years", "million years"] },
      { sec: yearSec * 1e3, ru: ["тысяча лет", "тысячи лет", "тысяч лет"], en: ["thousand years", "thousand years"] },
      { sec: yearSec, ru: ["год", "года", "лет"], en: ["year", "years"] },
      { sec: 24 * 3600, ru: ["день", "дня", "дней"], en: ["day", "days"] },
      { sec: 3600, ru: ["час", "часа", "часов"], en: ["hour", "hours"] },
      { sec: 60, ru: ["минута", "минуты", "минут"], en: ["minute", "minutes"] },
      { sec: 1, ru: ["секунда", "секунды", "секунд"], en: ["second", "seconds"] },
    ];

  for (const u of units) {
    if (seconds >= u.sec || u.sec === 1) {
      const value = Math.max(1, Math.floor(seconds / u.sec));
      if (locale === "ru") {
        return `${value} ${pluralRu(value, u.ru[0], u.ru[1], u.ru[2])}`;
      }
      const word = value === 1 ? u.en[0] : u.en[1];
      return `${value} ${word}`;
    }
  }
  return locale === "ru" ? "1 секунда" : "1 second";
}

export function crackTimeSeconds(bits: number, perSecond: number): number {
  if (bits <= 0) return 0;
  const logSeconds = (bits - 1) * Math.LN2 - Math.log(perSecond);
  if (logSeconds > 700) return Number.POSITIVE_INFINITY;
  return Math.exp(logSeconds);
}

export function buildEntropyResult(
  bits: number,
  locale: Locale,
  opts: { pinLike: boolean },
): EntropyResult {
  const { level, segments } = levelFromBits(bits);
  const online = crackTimeSeconds(bits, ONLINE_PER_SEC);
  const offline = crackTimeSeconds(bits, OFFLINE_PER_SEC);
  return {
    bits,
    level,
    segments,
    onlineLabel: formatDuration(online, locale),
    offlineLabel: formatDuration(offline, locale),
    showRateLimitNote: opts.pinLike || bits < 40,
  };
}
