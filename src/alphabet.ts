const AMBIGUOUS = new Set(["I", "O", "l", "|"]);

const DIGITS = "0123456789";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const SPECIALS = "!@#$%^&*()_+-=[]{}:;,.<>?/~`\\\"'";

export type AlphabetOptions = {
  digits: boolean;
  lower: boolean;
  upper: boolean;
  specials: boolean;
  similar?: boolean;
  exclude?: string;
  specialsAllowlist?: string | null;
};

export type Alphabets = {
  digits: string;
  lower: string;
  upper: string;
  specials: string;
  safe: string;
  full: string;
};

export type AlphabetStats = {
  alphabets: Alphabets;
  alphabetSize: number;
  excludedCount: number;
  emptySets: {
    digits: boolean;
    lower: boolean;
    upper: boolean;
    specials: boolean;
  };
};

function filterChars(
  chars: string,
  similar: boolean,
  excludeSet: Set<string>,
): string {
  return [...chars]
    .filter((c) => {
      if (similar && AMBIGUOUS.has(c)) return false;
      if (excludeSet.has(c)) return false;
      return true;
    })
    .join("");
}

function resolveSpecialsBase(allowlist: string | null | undefined): string {
  if (allowlist == null) return SPECIALS;
  const allowed = new Set([...allowlist]);
  return [...SPECIALS].filter((c) => allowed.has(c)).join("");
}

export function parseExcludeInput(raw: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const ch of raw) {
    if (ch === " " || ch === "\n" || ch === "\r" || ch === "\t") continue;
    if (seen.has(ch)) continue;
    seen.add(ch);
    out.push(ch);
  }
  return out;
}

export function buildAlphabets(options: AlphabetOptions): Alphabets {
  const similar = options.similar !== false;
  const excludeSet = new Set(parseExcludeInput(options.exclude ?? ""));
  const specialsBase = resolveSpecialsBase(options.specialsAllowlist);

  const digits = options.digits
    ? filterChars(DIGITS, similar, excludeSet)
    : "";
  const lower = options.lower ? filterChars(LOWER, similar, excludeSet) : "";
  const upper = options.upper ? filterChars(UPPER, similar, excludeSet) : "";
  const specials = options.specials
    ? filterChars(specialsBase, similar, excludeSet)
    : "";
  const safe = digits + lower + upper;
  const full = safe + specials;

  return { digits, lower, upper, specials, safe, full };
}

export function buildAlphabetStats(options: AlphabetOptions): AlphabetStats {
  const requestedExclude = parseExcludeInput(options.exclude ?? "");
  const beforeExclude = buildAlphabets({ ...options, exclude: "" });
  const beforeSet = new Set([...beforeExclude.full]);

  let excludedCount = 0;
  for (const ch of requestedExclude) {
    if (beforeSet.has(ch)) excludedCount += 1;
  }

  const alphabets = buildAlphabets(options);
  const emptySets = {
    digits: options.digits && alphabets.digits.length === 0,
    lower: options.lower && alphabets.lower.length === 0,
    upper: options.upper && alphabets.upper.length === 0,
    specials: options.specials && alphabets.specials.length === 0,
  };

  return {
    alphabets,
    alphabetSize: alphabets.full.length,
    excludedCount,
    emptySets,
  };
}

export function requiredMinimum(options: AlphabetOptions): number {
  const sets = buildAlphabets(options);
  let n = 0;
  if (options.digits && sets.digits.length > 0) n += Math.min(2, sets.digits.length);
  if (options.lower && sets.lower.length > 0) n += 1;
  if (options.upper && sets.upper.length > 0) n += 1;
  if (options.specials && sets.specials.length > 0) n += 1;
  return n;
}

export { AMBIGUOUS, DIGITS, LOWER, UPPER, SPECIALS };
