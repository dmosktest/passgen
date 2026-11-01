import { UI_MESSAGES } from "./i18n-messages";
import type { MessageKey } from "./i18n-keys";
import {
  DEFAULT_LOCALE,
  type Locale,
  localeFromPathname,
} from "./site-config";

export type { Locale, MessageKey };

export function t(locale: Locale, key: MessageKey): string {
  return UI_MESSAGES[locale][key] ?? UI_MESSAGES.en[key] ?? key;
}

export function tf(
  locale: Locale,
  key: MessageKey,
  vars: Record<string, string | number>,
): string {
  return t(locale, key).replace(/\{(\w+)\}/g, (_, name: string) =>
    String(vars[name] ?? ""),
  );
}

export function detectLocale(pathname = window.location.pathname): Locale {
  return localeFromPathname(pathname) || DEFAULT_LOCALE;
}
