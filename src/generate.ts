import {
  AlphabetOptions,
  Alphabets,
  buildAlphabets,
  requiredMinimum,
} from "./alphabet";
import type { MessageKey } from "./i18n";

export type GenerateOptions = AlphabetOptions & {
  length: number;
  count: number;
  noDuplicates: boolean;
};

export type GenerateResult =
  | { ok: true; passwords: string[] }
  | { ok: false; error: MessageKey };

const MAX_SPECIALS = 2;
const MIN_DIGITS = 2;
const MIN_LOWER = 1;
const MIN_UPPER = 1;
const MIN_SPECIALS = 1;
/** Above this length, «no duplicates» allows each char at most twice. */
export const NO_DUP_STRICT_MAX_LEN = 61;

export function noDupMaxOccurrences(length: number): number {
  return length > NO_DUP_STRICT_MAX_LEN ? 2 : 1;
}

function markUsed(used: Map<string, number>, char: string): void {
  used.set(char, (used.get(char) ?? 0) + 1);
}

function poolFor(
  alphabet: string,
  used: Map<string, number>,
  maxOcc: number,
): string {
  if (!Number.isFinite(maxOcc)) return alphabet;
  const fresh = [...alphabet]
    .filter((c) => (used.get(c) ?? 0) === 0)
    .join("");
  if (fresh) return fresh;
  return [...alphabet].filter((c) => (used.get(c) ?? 0) < maxOcc).join("");
}

function randomIndex(max: number): number {
  if (max <= 0) throw new Error("empty alphabet");
  const limit = Math.floor(0x1_0000_0000 / max) * max;
  const buf = new Uint32Array(1);
  let x: number;
  do {
    crypto.getRandomValues(buf);
    x = buf[0]!;
  } while (x >= limit);
  return x % max;
}

function pick(alphabet: string): string {
  return alphabet[randomIndex(alphabet.length)]!;
}

function shuffleInPlace<T>(items: T[]): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
}

type ReqChar = { char: string; special: boolean };

function takeRequired(
  alphabet: string,
  count: number,
  special: boolean,
  maxOcc: number,
  used: Map<string, number>,
): ReqChar[] {
  const out: ReqChar[] = [];
  for (let i = 0; i < count; i++) {
    const pool = poolFor(alphabet, used, maxOcc);
    if (!pool) throw new Error("alphabet exhausted");
    const char = pick(pool);
    markUsed(used, char);
    out.push({ char, special });
  }
  return out;
}

function pickUnused(
  alphabet: string,
  used: Map<string, number>,
  maxOcc: number,
): string {
  const pool = poolFor(alphabet, used, maxOcc);
  if (!pool) throw new Error("alphabet exhausted");
  const char = pick(pool);
  markUsed(used, char);
  return char;
}

function generateOne(
  length: number,
  sets: Alphabets,
  noDuplicates: boolean,
): string {
  const maxOcc = noDuplicates
    ? noDupMaxOccurrences(length)
    : Number.POSITIVE_INFINITY;
  const used = new Map<string, number>();
  const required: ReqChar[] = [];

  if (sets.digits.length >= MIN_DIGITS) {
    required.push(
      ...takeRequired(sets.digits, MIN_DIGITS, false, maxOcc, used),
    );
  } else if (sets.digits.length > 0) {
    required.push(
      ...takeRequired(sets.digits, sets.digits.length, false, maxOcc, used),
    );
  }
  if (sets.lower.length >= MIN_LOWER) {
    required.push(
      ...takeRequired(sets.lower, MIN_LOWER, false, maxOcc, used),
    );
  }
  if (sets.upper.length >= MIN_UPPER) {
    required.push(
      ...takeRequired(sets.upper, MIN_UPPER, false, maxOcc, used),
    );
  }
  if (sets.specials.length >= MIN_SPECIALS) {
    required.push(
      ...takeRequired(sets.specials, MIN_SPECIALS, true, maxOcc, used),
    );
  }

  const chars: (string | null)[] = Array.from({ length }, () => null);
  const middle: number[] = [];
  const edges: number[] = [];
  const useSpecialEdges = sets.specials.length > 0;

  if (useSpecialEdges) {
    for (let i = 0; i < length; i++) {
      if (i < 2 || i >= length - 2) edges.push(i);
      else middle.push(i);
    }
  } else {
    for (let i = 0; i < length; i++) edges.push(i);
  }

  shuffleInPlace(middle);
  const specialReqs = required.filter((r) => r.special);
  const safeReqs = required.filter((r) => !r.special);
  shuffleInPlace(safeReqs);

  const specialSlots: number[] = [];
  for (const pos of middle) {
    if (specialSlots.length >= specialReqs.length) break;
    if (specialSlots.some((p) => Math.abs(p - pos) === 1)) continue;
    specialSlots.push(pos);
  }

  for (let i = 0; i < specialSlots.length; i++) {
    chars[specialSlots[i]!] = specialReqs[i]!.char;
  }

  const usedSpecialSlots = new Set(specialSlots);
  const free = [
    ...edges,
    ...middle.filter((pos) => !usedSpecialSlots.has(pos)),
  ];
  shuffleInPlace(free);

  let freeIdx = 0;
  for (const req of safeReqs) {
    chars[free[freeIdx++]!] = req.char;
  }

  let specialsUsed = specialSlots.length;
  for (; freeIdx < free.length; freeIdx++) {
    const pos = free[freeIdx]!;
    const isMiddle = useSpecialEdges && pos >= 2 && pos < length - 2;
    const adjacentSpecial =
      (pos > 0 && sets.specials.includes(chars[pos - 1] ?? "")) ||
      (pos + 1 < length && sets.specials.includes(chars[pos + 1] ?? ""));
    let alphabet = sets.safe;
    if (
      isMiddle &&
      useSpecialEdges &&
      specialsUsed < MAX_SPECIALS &&
      !adjacentSpecial
    ) {
      alphabet = sets.safe + sets.specials;
    }
    const char = pickUnused(alphabet, used, maxOcc);
    if (useSpecialEdges && sets.specials.includes(char)) specialsUsed += 1;
    chars[pos] = char;
  }

  return chars.join("");
}

export function generatePasswords(options: GenerateOptions): GenerateResult {
  const {
    length,
    count,
    digits,
    lower,
    upper,
    specials,
    noDuplicates,
    similar = true,
    exclude = "",
    specialsAllowlist = null,
  } = options;

  if (!digits && !lower && !upper && !specials) {
    return { ok: false, error: "err_empty_sets" };
  }

  const alphaOpts: AlphabetOptions = {
    digits,
    lower,
    upper,
    specials,
    similar,
    exclude,
    specialsAllowlist,
  };
  const sets = buildAlphabets(alphaOpts);

  if (!sets.full) {
    return { ok: false, error: "err_empty_alphabet" };
  }

  if (sets.full.length < 2) {
    return { ok: false, error: "err_alphabet_too_small" };
  }

  const hasSpecials = sets.specials.length > 0;
  if (hasSpecials && length < 5) {
    return { ok: false, error: "err_specials_min_length" };
  }

  if (hasSpecials && !sets.safe) {
    return { ok: false, error: "err_specials_need_safe" };
  }

  if (length < 1 || length > 128) {
    return { ok: false, error: "err_bad_length" };
  }

  if (count < 1 || count > 200) {
    return { ok: false, error: "err_bad_count" };
  }

  const minRequired = requiredMinimum(alphaOpts);
  if (length < minRequired) {
    return { ok: false, error: "err_min_sets" };
  }

  if (noDuplicates) {
    const maxUnique =
      sets.safe.length +
      (hasSpecials ? Math.min(MAX_SPECIALS, sets.specials.length) : 0);
    const maxOcc = noDupMaxOccurrences(length);
    if (length > maxUnique * maxOcc) {
      return { ok: false, error: "err_unique_too_long" };
    }
  }

  const passwords: string[] = [];
  for (let i = 0; i < count; i++) {
    passwords.push(generateOne(length, sets, noDuplicates));
  }

  return { ok: true, passwords };
}
