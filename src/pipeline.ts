import {
  AlphabetStats,
  buildAlphabetStats,
  requiredMinimum,
} from "./alphabet";
import { NO_DUP_STRICT_MAX_LEN } from "./generate";
import { Settings, clampLength, syncPresetId } from "./state";

export type NormalizedState = {
  settings: Settings;
  stats: AlphabetStats;
  lengthNote: number | null;
  canGenerate: boolean;
  blockReason:
    | "empty_sets"
    | "empty_alphabet"
    | "too_small"
    | "specials_min"
    | "specials_need_safe"
    | "min_sets"
    | null;
};

export function normalizeSettings(input: Settings): NormalizedState {
  let settings = syncPresetId({
    ...input,
    length: clampLength(input.length),
    exclude: [...input.exclude].slice(0, 64).join(""),
    sets: { ...input.sets },
  });

  const anySet =
    settings.sets.digits ||
    settings.sets.lower ||
    settings.sets.upper ||
    settings.sets.specials;

  if (!anySet) {
    const stats = buildAlphabetStats({
      ...settings.sets,
      similar: settings.similar,
      exclude: settings.exclude,
      specialsAllowlist: settings.specialsAllowlist,
    });
    return {
      settings,
      stats,
      lengthNote: null,
      canGenerate: false,
      blockReason: "empty_sets",
    };
  }

  let stats = buildAlphabetStats({
    ...settings.sets,
    similar: settings.similar,
    exclude: settings.exclude,
    specialsAllowlist: settings.specialsAllowlist,
  });

  let lengthNote: number | null = null;
  if (settings.noDup && stats.alphabetSize > 0) {
    const hasSpecials = stats.alphabets.specials.length > 0;
    const maxUnique =
      stats.alphabets.safe.length +
      (hasSpecials ? Math.min(2, stats.alphabets.specials.length) : 0);
    let maxLen = maxUnique;
    if (settings.length > NO_DUP_STRICT_MAX_LEN) {
      maxLen =
        maxUnique * 2 > NO_DUP_STRICT_MAX_LEN ? maxUnique * 2 : maxUnique;
    }
    if (maxUnique > 0 && settings.length > maxLen) {
      settings = { ...settings, length: maxLen };
      lengthNote = maxLen;
      settings = syncPresetId(settings);
      stats = buildAlphabetStats({
        ...settings.sets,
        similar: settings.similar,
        exclude: settings.exclude,
        specialsAllowlist: settings.specialsAllowlist,
      });
    }
  }

  const hasSpecials = stats.alphabets.specials.length > 0;
  const minFloor = Math.max(
    1,
    requiredMinimum({
      ...settings.sets,
      similar: settings.similar,
      exclude: settings.exclude,
      specialsAllowlist: settings.specialsAllowlist,
    }),
    hasSpecials ? 5 : 1,
  );
  if (settings.length < minFloor) {
    settings = syncPresetId({ ...settings, length: minFloor });
  }

  if (stats.alphabetSize === 0) {
    return {
      settings,
      stats,
      lengthNote,
      canGenerate: false,
      blockReason: "empty_alphabet",
    };
  }
  if (stats.alphabetSize < 2) {
    return {
      settings,
      stats,
      lengthNote,
      canGenerate: false,
      blockReason: "too_small",
    };
  }
  if (hasSpecials && !stats.alphabets.safe) {
    return {
      settings,
      stats,
      lengthNote,
      canGenerate: false,
      blockReason: "specials_need_safe",
    };
  }
  if (hasSpecials && settings.length < 5) {
    return {
      settings,
      stats,
      lengthNote,
      canGenerate: false,
      blockReason: "specials_min",
    };
  }

  return {
    settings,
    stats,
    lengthNote,
    canGenerate: true,
    blockReason: null,
  };
}
